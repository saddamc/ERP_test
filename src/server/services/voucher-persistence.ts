import { Prisma } from "@prisma/client";
import { VoucherFormData, VoucherLineItem, VoucherTypeCode } from "@/types/accounting";
import { Errors } from "@/server/errors";
import { executeVoucherPosting } from "./posting-service";

/**
 * Phase-0 voucher writer: the one place that saves a voucher and its General Ledger lines.
 * Callers pass an interactive-transaction client so the voucher, its GL lines and any related
 * rows (member ledger, allocation, SMS log) commit or fail together. Phase 1 replaces this with
 * the ported ACCOUNTS posting engine (`src/server/accounting/posting-service.ts`).
 */
export type Tx = Prisma.TransactionClient;

export const VOUCHER_PREFIX: Record<VoucherTypeCode, string> = {
  JOURNAL: "J3",
  CASH_PAYMENT: "P1",
  CASH_RECEIVE: "R1",
  BANK_PAYMENT: "P2",
  BANK_RECEIVE: "R2",
  CONTRA: "C3",
};

/**
 * Next number for a voucher type, read inside the caller's transaction ("P1-4").
 * Not race-safe across concurrent requests (the unique constraint rejects a clash and the
 * transaction rolls back) — Phase 1 switches to an advisory-locked counter.
 */
export async function nextVoucherNo(tx: Tx, type: VoucherTypeCode): Promise<string> {
  const count = await tx.voucher.count({ where: { voucherType: type } });
  return `${VOUCHER_PREFIX[type]}-${count + 1}`;
}

/** Lines the user actually filled in (blank grid rows are ignored). */
function filledLines(lines: VoucherLineItem[]): VoucherLineItem[] {
  return lines.filter((l) => l.accountCode && (Number(l.debit) > 0 || Number(l.credit) > 0));
}

/** Map account codes → ids. Unknown codes are an error — accounts are never created while posting. */
async function resolveAccountIds(tx: Tx, lines: VoucherLineItem[]): Promise<Map<string, string>> {
  const codes = [...new Set(lines.map((l) => l.accountCode))];
  const found = await tx.accountHead.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } });
  const map = new Map(found.map((a) => [a.code, a.id]));
  const missing = codes.filter((c) => !map.has(c));
  if (missing.length > 0) {
    throw Errors.notFound(`Unknown account code(s): ${missing.join(", ")}. Add them to the Chart of Accounts first.`, "ACCOUNT_NOT_FOUND");
  }
  return map;
}

async function assertNotPosted(tx: Tx, voucherNo: string) {
  const existing = await tx.voucher.findUnique({ where: { voucherNo }, select: { id: true, status: true } });
  if (existing && (existing.status === "POSTED" || existing.status === "CANCELLED")) {
    throw Errors.conflict(`Voucher ${voucherNo} is already ${existing.status.toLowerCase()} and cannot be changed.`, "VOUCHER_LOCKED");
  }
  return existing;
}

function headerData(v: VoucherFormData) {
  return {
    voucherType: v.voucherType,
    voucherDate: new Date(v.voucherDate),
    bankCode: v.bankCode ?? null,
    bankName: v.bankName ?? null,
    paymentTo: v.paymentTo ?? null,
    narration: v.narration,
  };
}

/** Save (or update) a DRAFT/QUEUED voucher with its lines. Posted vouchers can't be touched. */
export async function saveQueuedVoucher(tx: Tx, voucher: VoucherFormData, userId: string) {
  const lines = filledLines(voucher.lines);
  const existing = await assertNotPosted(tx, voucher.voucherNo);
  const accountIds = await resolveAccountIds(tx, lines);
  const totalAmount = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const data = { ...headerData(voucher), narration: voucher.narration || "Queued voucher", status: "QUEUED" as const, totalAmount };

  const saved = existing
    ? await tx.voucher.update({ where: { id: existing.id }, data })
    : await tx.voucher.create({ data: { ...data, voucherNo: voucher.voucherNo, createdById: userId } });

  await tx.voucherLine.deleteMany({ where: { voucherId: saved.id } }); // draft lines only (guarded above)
  for (const l of lines) {
    await tx.voucherLine.create({
      data: { voucherId: saved.id, accountId: accountIds.get(l.accountCode)!, description: l.description, debit: l.debit || 0, credit: l.credit || 0 },
    });
  }
  return saved;
}

/**
 * Validate (Dr = Cr, period open, narration) and post a voucher: header → POSTED, voucher lines,
 * and one GL entry per line. Throws on any problem so the caller's transaction rolls back.
 */
export async function savePostedVoucher(tx: Tx, voucher: VoucherFormData, userId: string) {
  const lines = filledLines(voucher.lines);
  const check = await executeVoucherPosting({ ...voucher, lines });
  if (!check.success || !check.postedVoucher) {
    throw Errors.badRequest(`${check.message}: ${(check.errors ?? []).join(" ")}`, "VOUCHER_INVALID");
  }

  const existing = await assertNotPosted(tx, voucher.voucherNo);
  const accountIds = await resolveAccountIds(tx, lines);
  const data = { ...headerData(voucher), status: "POSTED" as const, totalAmount: check.postedVoucher.totalDebit, postedAt: new Date() };

  const saved = existing
    ? await tx.voucher.update({ where: { id: existing.id }, data })
    : await tx.voucher.create({ data: { ...data, voucherNo: voucher.voucherNo, createdById: userId } });

  await tx.voucherLine.deleteMany({ where: { voucherId: saved.id } }); // replaces queued draft lines
  const entryDate = new Date(voucher.voucherDate);
  for (const l of lines) {
    const accountId = accountIds.get(l.accountCode)!;
    await tx.voucherLine.create({
      data: { voucherId: saved.id, accountId, description: l.description, debit: l.debit || 0, credit: l.credit || 0 },
    });
    await tx.generalLedgerEntry.create({
      data: { voucherId: saved.id, accountId, entryDate, debit: l.debit || 0, credit: l.credit || 0, narration: l.description || voucher.narration },
    });
  }
  return saved;
}

/** Map a DB voucher (with lines + account) to the form shape the UI uses. */
export function toVoucherFormData(v: Prisma.VoucherGetPayload<{ include: { lines: { include: { account: true } } } }>): VoucherFormData {
  return {
    id: v.id,
    voucherNo: v.voucherNo,
    voucherType: v.voucherType as VoucherTypeCode,
    voucherDate: v.voucherDate.toISOString().split("T")[0],
    bankCode: v.bankCode || undefined,
    bankName: v.bankName || undefined,
    paymentTo: v.paymentTo || undefined,
    narration: v.narration,
    status: v.status,
    lines: v.lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      accountCode: l.account.code,
      accountName: l.account.name,
      description: l.description || "",
      debit: Number(l.debit),
      credit: Number(l.credit),
    })),
    totalDebit: Number(v.totalAmount),
    totalCredit: Number(v.totalAmount),
    difference: 0,
  };
}
