"use server";

import { VoucherFormData, VoucherTypeCode, AccountHeadItem } from "@/types/accounting";
import { createReversalVoucher } from "@/server/services/posting-service";
import {
  VOUCHER_PREFIX,
  nextVoucherNo,
  saveQueuedVoucher,
  savePostedVoucher,
  toVoucherFormData,
} from "@/server/services/voucher-persistence";
import { requireUser, ROLES } from "@/server/auth/guard";
import { Errors, userMessage } from "@/server/errors";
import { prisma } from "@/server/db";

const withLines = { lines: { include: { account: true } } } as const;

/**
 * Preview of the next voucher number for a type (e.g. "P1-4").
 * Not race-safe — Phase 1 replaces it with an advisory-locked counter assigned at post time.
 */
export async function getNextVoucherNo(type: VoucherTypeCode): Promise<string> {
  await requireUser(ROLES.ANY);
  const count = await prisma.voucher.count({ where: { voucherType: type } });
  return `${VOUCHER_PREFIX[type]}-${count + 1}`;
}

/**
 * Chart of accounts for line entry
 */
export async function getAvailableAccounts(): Promise<AccountHeadItem[]> {
  await requireUser(ROLES.ANY);
  const accounts = await prisma.accountHead.findMany({ orderBy: { code: "asc" } });
  return accounts.map((acc) => ({
    id: acc.id,
    code: acc.code,
    name: acc.name,
    category: acc.category,
    isControlHead: acc.isControlHead,
    parentId: acc.parentId,
  }));
}

/**
 * Bank account heads
 */
export async function getBankAccounts() {
  await requireUser(ROLES.ANY);
  const banks = await prisma.accountHead.findMany({
    where: { OR: [{ code: { startsWith: "11" } }, { name: { contains: "Bank", mode: "insensitive" } }] },
    orderBy: { code: "asc" },
  });
  return banks.map((acc) => ({ code: acc.code, name: acc.name }));
}

/**
 * Cash account heads
 */
export async function getCashAccounts() {
  await requireUser(ROLES.ANY);
  const cash = await prisma.accountHead.findMany({
    where: { OR: [{ code: { startsWith: "10" } }, { name: { contains: "Cash", mode: "insensitive" } }] },
    orderBy: { code: "asc" },
  });
  return cash.map((acc) => ({ code: acc.code, name: acc.name }));
}

/**
 * Save voucher (header + lines) to the Queue
 */
export async function saveVoucherToQueue(voucher: VoucherFormData): Promise<{
  success: boolean;
  message: string;
  voucher: VoucherFormData;
}> {
  const user = await requireUser(ROLES.FINANCE);
  try {
    const saved = await prisma.$transaction((tx) => saveQueuedVoucher(tx, voucher, user.id));
    return {
      success: true,
      message: `Voucher ${voucher.voucherNo} moved to Queue.`,
      voucher: { ...voucher, id: saved.id, status: "QUEUED" },
    };
  } catch (err) {
    console.error("saveVoucherToQueue failed:", err);
    return { success: false, message: userMessage(err), voucher };
  }
}

/**
 * Post voucher to General Ledger (Debit == Credit, period open). The posting user is the
 * signed-in user; nothing about the role is taken from the request.
 */
export async function postVoucherAction(voucher: VoucherFormData): Promise<{
  success: boolean;
  message: string;
  voucher?: VoucherFormData;
  errors?: string[];
}> {
  const user = await requireUser(ROLES.POST);
  try {
    const saved = await prisma.$transaction((tx) => savePostedVoucher(tx, voucher, user.id));
    return {
      success: true,
      message: `Voucher ${voucher.voucherNo} posted to the General Ledger.`,
      voucher: { ...voucher, id: saved.id, status: "POSTED" },
    };
  } catch (err) {
    console.error("postVoucherAction failed:", err);
    const message = userMessage(err);
    return { success: false, message, errors: [message] };
  }
}

/**
 * Queued vouchers (Call Queue)
 */
export async function getQueuedVouchers(): Promise<VoucherFormData[]> {
  await requireUser(ROLES.ANY);
  const queued = await prisma.voucher.findMany({
    where: { status: "QUEUED" },
    include: withLines,
    orderBy: { createdAt: "desc" },
  });
  return queued.map(toVoucherFormData);
}

/**
 * Cancel a posted voucher: post an equal-and-opposite reversal and mark the original CANCELLED,
 * both in one transaction. The original's ledger lines are never deleted.
 */
export async function cancelVoucherAction(
  voucherNo: string,
  reason: string
): Promise<{ success: boolean; message: string; reversalVoucher?: VoucherFormData }> {
  const user = await requireUser(ROLES.POST);
  if (!reason || !reason.trim()) {
    return { success: false, message: "A reason is required to cancel a voucher." };
  }

  try {
    const reversal = await prisma.$transaction(async (tx) => {
      const original = await tx.voucher.findUnique({ where: { voucherNo }, include: withLines });
      if (!original) throw Errors.notFound("Voucher not found.");
      if (original.status !== "POSTED") throw Errors.conflict(`Only posted vouchers can be cancelled (this one is ${original.status}).`);

      const reversalNo = await nextVoucherNo(tx, original.voucherType);
      const rev = createReversalVoucher(toVoucherFormData(original), reason.trim(), reversalNo);
      await savePostedVoucher(tx, rev, user.id);
      await tx.voucher.update({
        where: { id: original.id },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason.trim() },
      });
      return rev;
    });

    return {
      success: true,
      message: `Voucher ${voucherNo} CANCELLED. Reversal voucher ${reversal.voucherNo} posted with reason: "${reason.trim()}".`,
      reversalVoucher: reversal,
    };
  } catch (err) {
    console.error("cancelVoucherAction failed:", err);
    return { success: false, message: userMessage(err) };
  }
}

/**
 * All vouchers (Queue, Posted, Cancelled)
 */
export async function getAllVouchers(): Promise<VoucherFormData[]> {
  await requireUser(ROLES.ANY);
  const vouchers = await prisma.voucher.findMany({ include: withLines, orderBy: { voucherDate: "desc" } });
  return vouchers.map(toVoucherFormData);
}

/**
 * Single voucher by number
 */
export async function getVoucherByNo(voucherNo: string): Promise<VoucherFormData | null> {
  await requireUser(ROLES.ANY);
  const v = await prisma.voucher.findUnique({ where: { voucherNo }, include: withLines });
  return v ? toVoucherFormData(v) : null;
}
