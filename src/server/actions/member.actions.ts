"use server";

import { Prisma } from "@prisma/client";
import { MemberProfile, SubLedgerType } from "@/types/member";
import { VoucherFormData, VoucherLineItem } from "@/types/accounting";
import { nextVoucherNo, savePostedVoucher, Tx } from "@/server/services/voucher-persistence";
import { requireUser, ROLES } from "@/server/auth/guard";
import { Errors, userMessage } from "@/server/errors";
import { prisma } from "@/server/db";

export interface SmsNotificationItem {
  id: string;
  memberId: string;
  phone: string;
  message: string;
  type: "CHARGE_ADDED" | "PAYMENT_RECEIVED";
  timestamp: string;
}

export interface MemberStatementRow {
  date: string;
  voucherNo: string;
  ledgerType: SubLedgerType;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

const memberInclude = {
  spouses: { orderBy: { spouseIndex: "asc" as const } },
  children: { orderBy: { childIndex: "asc" as const } },
  references: true,
  nominees: true,
  ledgerEntries: true,
};

function mapDbMemberToProfile(dbMem: any): MemberProfile {
  let subscriptionBalance = 0;
  let diningBalance = 0;
  let cardRoomBalance = 0;

  if (dbMem.ledgerEntries && Array.isArray(dbMem.ledgerEntries)) {
    for (const e of dbMem.ledgerEntries) {
      const net = Number(e.debit) - Number(e.credit);
      if (e.ledgerType === "SUBSCRIPTION") subscriptionBalance += net;
      else if (e.ledgerType === "DINING") diningBalance += net;
      else if (e.ledgerType === "CARD_ROOM") cardRoomBalance += net;
    }
  }

  subscriptionBalance = Math.max(0, subscriptionBalance);
  diningBalance = Math.max(0, diningBalance);
  cardRoomBalance = Math.max(0, cardRoomBalance);
  const totalOutstanding = subscriptionBalance + diningBalance + cardRoomBalance;

  return {
    id: dbMem.id,
    accountNo: dbMem.accountNo,
    prefix: dbMem.prefix || "",
    title: dbMem.title || "Mr.",
    firstName: dbMem.firstName,
    middleName: dbMem.middleName || "",
    lastName: dbMem.lastName,
    fullName: dbMem.fullName,
    address: dbMem.address || "",
    city: dbMem.city || "",
    phone: dbMem.phone || "",
    email: dbMem.email || "",
    bloodGroup: dbMem.bloodGroup || "",
    profession: dbMem.profession || "",
    creditLimit: Number(dbMem.creditLimit || 0),
    status: dbMem.status,
    subscriptionBalance,
    diningBalance,
    cardRoomBalance,
    totalOutstanding,
    spouses: (dbMem.spouses || []).map((s: any) => ({
      id: s.id,
      spouseIndex: s.spouseIndex,
      name: s.name,
      dob: s.dob ? s.dob.toISOString().split("T")[0] : null,
      mobile: s.mobile || null,
      bloodGroup: s.bloodGroup || null,
      anniversary: s.anniversary ? s.anniversary.toISOString().split("T")[0] : null,
      email: s.email || null,
      signatureUrl: s.signatureUrl || null,
    })),
    children: (dbMem.children || []).map((c: any) => ({
      id: c.id,
      childIndex: c.childIndex,
      name: c.name,
      dob: c.dob ? c.dob.toISOString().split("T")[0] : null,
      gender: c.gender || null,
    })),
    references: (dbMem.references || []).map((r: any) => ({
      id: r.id,
      refMemberNo: r.refMemberNo || "",
      refName: r.refName,
      phone: r.phone || "",
    })),
    nominees: (dbMem.nominees || []).map((n: any) => ({
      id: n.id,
      name: n.name,
      relation: n.relation,
      phone: n.phone || "",
      sharePercent: Number(n.sharePercent || 100),
    })),
  };
}

async function loadMember(db: Tx | typeof prisma, id: string): Promise<MemberProfile | null> {
  const dbMem = await db.member.findUnique({ where: { id }, include: memberInclude });
  return dbMem ? mapDbMemberToProfile(dbMem) : null;
}

/**
 * All members, optionally filtered by prefix AND a search text
 */
export async function getMembersList(prefix?: string, query?: string): Promise<MemberProfile[]> {
  await requireUser(ROLES.ANY);
  const and: Prisma.MemberWhereInput[] = [];
  if (prefix && prefix.trim().length > 0) {
    const p = prefix.trim();
    and.push({ OR: [{ prefix: { equals: p, mode: "insensitive" } }, { accountNo: { startsWith: p, mode: "insensitive" } }] });
  }
  if (query && query.trim().length > 0) {
    const q = query.trim();
    and.push({
      OR: [
        { accountNo: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const dbMembers = await prisma.member.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: memberInclude,
    orderBy: { accountNo: "asc" },
  });
  return dbMembers.map(mapDbMemberToProfile);
}

/**
 * Single member by ID
 */
export async function getMemberById(id: string): Promise<MemberProfile | null> {
  await requireUser(ROLES.ANY);
  return loadMember(prisma, id);
}

/**
 * Create or update Member Master details. A member is updated only when its id already exists;
 * otherwise a new member is created (an account number already in use is rejected, never overwritten).
 */
export async function saveMemberAction(
  member: MemberProfile
): Promise<{ success: boolean; message: string; member: MemberProfile }> {
  await requireUser(ROLES.MEMBERS);
  const fullName = `${member.firstName} ${member.middleName || ""} ${member.lastName}`.replace(/\s+/g, " ").trim();
  const data = {
    accountNo: member.accountNo,
    prefix: member.prefix,
    title: member.title,
    firstName: member.firstName,
    middleName: member.middleName,
    lastName: member.lastName,
    fullName,
    bloodGroup: member.bloodGroup,
    profession: member.profession,
    creditLimit: member.creditLimit,
    status: member.status,
    address: member.address,
    city: member.city,
    phone: member.phone,
    email: member.email,
  };

  try {
    const clash = await prisma.member.findUnique({ where: { accountNo: member.accountNo }, select: { id: true } });
    if (clash && clash.id !== member.id) {
      throw Errors.conflict(`Account number ${member.accountNo} is already used by another member.`, "ACCOUNT_NO_TAKEN");
    }

    const existing = member.id ? await prisma.member.findUnique({ where: { id: member.id }, select: { id: true } }) : null;
    const saved = existing
      ? await prisma.member.update({ where: { id: existing.id }, data, include: memberInclude })
      : await prisma.member.create({ data, include: memberInclude });

    const updated = mapDbMemberToProfile(saved);
    return {
      success: true,
      message: `Member ${updated.accountNo} (${updated.fullName}) saved successfully.`,
      member: updated,
    };
  } catch (err) {
    console.error("saveMemberAction failed:", err);
    return { success: false, message: userMessage(err, "Member could not be saved. Nothing was changed."), member };
  }
}

const RECEIVABLE_HEAD: Record<SubLedgerType, { code: string; name: string }> = {
  SUBSCRIPTION: { code: "1121", name: "Member Subscription Receivable" },
  DINING: { code: "1122", name: "Member Dining Room Receivable" },
  CARD_ROOM: { code: "1123", name: "Member Card Room Receivable" },
};

const INCOME_HEAD: Record<SubLedgerType, { code: string; name: string }> = {
  SUBSCRIPTION: { code: "4001", name: "Monthly / Annual Subscription Income" },
  DINING: { code: "4101", name: "Dining Room & Restaurant Food Sales" },
  CARD_ROOM: { code: "4201", name: "Card Room Daily Table Charges" },
};

function ledgerBalance(mem: MemberProfile, type: SubLedgerType): number {
  return type === "SUBSCRIPTION" ? mem.subscriptionBalance : type === "DINING" ? mem.diningBalance : mem.cardRoomBalance;
}

/**
 * Add a charge to one of the member's 3 sub-ledgers. Voucher, GL lines, member ledger entry and
 * SMS log are saved in ONE transaction — all or nothing.
 */
export async function addMemberChargeAction(input: {
  memberId: string;
  ledgerType: SubLedgerType;
  amount: number;
  description: string;
}): Promise<{
  success: boolean;
  message: string;
  member?: MemberProfile;
  smsMessage?: string;
  voucherNo?: string;
}> {
  const user = await requireUser(ROLES.FINANCE);
  const amt = Number(input.amount);
  if (!(amt > 0)) return { success: false, message: "Charge amount must be greater than 0." };
  if (!RECEIVABLE_HEAD[input.ledgerType]) return { success: false, message: "Unknown ledger type." };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const before = await loadMember(tx, input.memberId);
      if (!before) throw Errors.notFound("Member not found.");

      const vNo = await nextVoucherNo(tx, "JOURNAL");
      const dr = RECEIVABLE_HEAD[input.ledgerType];
      const cr = INCOME_HEAD[input.ledgerType];
      const voucher: VoucherFormData = {
        voucherNo: vNo,
        voucherType: "JOURNAL",
        voucherDate: new Date().toISOString().split("T")[0],
        narration: `Member Charge [${before.accountNo} - ${before.fullName}]: ${input.description}`,
        status: "POSTED",
        lines: [
          { accountCode: dr.code, accountName: dr.name, description: input.description, debit: amt, credit: 0 },
          { accountCode: cr.code, accountName: cr.name, description: input.description, debit: 0, credit: amt },
        ],
        totalDebit: amt,
        totalCredit: amt,
        difference: 0,
      };
      const saved = await savePostedVoucher(tx, voucher, user.id);

      await tx.memberLedgerEntry.create({
        data: {
          memberId: before.id,
          voucherId: saved.id,
          ledgerType: input.ledgerType,
          entryDate: new Date(),
          description: input.description,
          debit: amt,
          credit: 0,
          runningBalance: ledgerBalance(before, input.ledgerType) + amt,
        },
      });

      const mem = (await loadMember(tx, before.id))!;
      const label = input.ledgerType.replace("_", " ");
      const smsText = `Dear Member ${mem.accountNo} (${mem.fullName}), BDT ${amt.toLocaleString("en-BD", {
        minimumFractionDigits: 2,
      })} has been added to your ${label} account. Current ${label} balance: BDT ${ledgerBalance(mem, input.ledgerType).toFixed(
        2
      )}. Total Outstanding: BDT ${mem.totalOutstanding.toFixed(2)}. - Uttara Recreation Club Ltd.`;

      // No SMS gateway is connected yet, so the message is queued (PENDING), not marked SENT.
      await tx.notificationLog.create({
        data: { memberId: mem.id, recipient: mem.phone || "", channel: "SMS", message: smsText, status: "PENDING" },
      });

      return { mem, smsText, vNo };
    });

    return {
      success: true,
      message: `Charge of ৳${amt.toFixed(2)} applied to ${input.ledgerType} ledger (Voucher ${result.vNo}).`,
      member: result.mem,
      smsMessage: result.smsText,
      voucherNo: result.vNo,
    };
  } catch (err) {
    console.error("addMemberChargeAction failed:", err);
    return { success: false, message: userMessage(err, "Charge could not be saved. Nothing was posted.") };
  }
}

/**
 * Record a member payment: R1/R2 voucher, allocation, one member-ledger credit per allocated
 * sub-ledger, and SMS log — all in ONE transaction.
 */
export async function recordMemberPaymentAction(input: {
  memberId: string;
  totalPaid: number;
  paymentMode: "CASH" | "BANK";
  allocations: {
    subscriptionAmount: number;
    diningAmount: number;
    cardRoomAmount: number;
    advanceAmount: number;
  };
  narration?: string;
}): Promise<{
  success: boolean;
  message: string;
  member?: MemberProfile;
  smsMessage?: string;
  voucherNo?: string;
}> {
  const user = await requireUser(ROLES.FINANCE);
  const a = input.allocations;
  const parts = [a.subscriptionAmount, a.diningAmount, a.cardRoomAmount, a.advanceAmount].map(Number);
  if (!(Number(input.totalPaid) > 0)) return { success: false, message: "Payment amount must be greater than 0." };
  if (parts.some((p) => !(p >= 0))) return { success: false, message: "Allocation amounts cannot be negative." };
  const totalAllocated = parts.reduce((s, p) => s + p, 0);
  if (Math.abs(totalAllocated - input.totalPaid) > 0.01) {
    return {
      success: false,
      message: `Allocated sum (৳${totalAllocated.toFixed(2)}) does not match Total Paid (৳${input.totalPaid.toFixed(2)}).`,
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const before = await loadMember(tx, input.memberId);
      if (!before) throw Errors.notFound("Member not found.");

      const vType = input.paymentMode === "CASH" ? "CASH_RECEIVE" : "BANK_RECEIVE";
      const voucherNo = await nextVoucherNo(tx, vType);
      const isCash = input.paymentMode === "CASH";

      const lines: VoucherLineItem[] = [
        {
          accountCode: isCash ? "1001" : "1101",
          accountName: isCash ? "Main Cash in Hand Desk" : "Sonali Bank - Main Operational A/C",
          description: `Member dues receipt from ${before.accountNo} - ${before.fullName}`,
          debit: input.totalPaid,
          credit: 0,
        },
      ];
      const byLedger: [SubLedgerType, number][] = [
        ["SUBSCRIPTION", a.subscriptionAmount],
        ["DINING", a.diningAmount],
        ["CARD_ROOM", a.cardRoomAmount],
      ];
      for (const [type, amount] of byLedger) {
        if (amount > 0) {
          const head = RECEIVABLE_HEAD[type];
          lines.push({ accountCode: head.code, accountName: head.name, description: `${type.replace("_", " ")} dues clearance for ${before.accountNo}`, debit: 0, credit: amount });
        }
      }
      if (a.advanceAmount > 0) {
        lines.push({ accountCode: "2001", accountName: "Member Advance Deposits Payable", description: `Advance credit deposit for ${before.accountNo}`, debit: 0, credit: a.advanceAmount });
      }

      const saved = await savePostedVoucher(
        tx,
        {
          voucherNo,
          voucherType: vType,
          voucherDate: new Date().toISOString().split("T")[0],
          bankCode: isCash ? undefined : "1101",
          bankName: isCash ? undefined : "Sonali Bank - Main Operational A/C",
          paymentTo: `${before.accountNo} - ${before.fullName}`,
          narration: `Settlement of member account ${before.accountNo} (${before.fullName}) via ${input.paymentMode}: ${input.narration || "Regular clearance"}`,
          status: "POSTED",
          lines,
          totalDebit: input.totalPaid,
          totalCredit: input.totalPaid,
          difference: 0,
        },
        user.id
      );

      await tx.paymentAllocation.create({
        data: {
          voucherId: saved.id,
          memberId: before.id,
          subscriptionAmount: a.subscriptionAmount,
          diningAmount: a.diningAmount,
          cardRoomAmount: a.cardRoomAmount,
          advanceAmount: a.advanceAmount,
        },
      });

      // One credit per sub-ledger actually paid (previously everything was booked to SUBSCRIPTION).
      for (const [type, amount] of byLedger) {
        if (amount > 0) {
          await tx.memberLedgerEntry.create({
            data: {
              memberId: before.id,
              voucherId: saved.id,
              ledgerType: type,
              entryDate: new Date(),
              description: `Payment received via ${input.paymentMode} (${input.narration || "Member Dues Settlement"})`,
              debit: 0,
              credit: amount,
              runningBalance: ledgerBalance(before, type) - amount,
            },
          });
        }
      }

      const mem = (await loadMember(tx, before.id))!;
      const smsText = `Dear Member ${mem.accountNo} (${mem.fullName}), your payment of BDT ${input.totalPaid.toLocaleString("en-BD", {
        minimumFractionDigits: 2,
      })} has been received. Subscription: BDT ${mem.subscriptionBalance.toFixed(2)}, Dining: BDT ${mem.diningBalance.toFixed(
        2
      )}, Card Room: BDT ${mem.cardRoomBalance.toFixed(2)}. Total Outstanding: BDT ${mem.totalOutstanding.toFixed(2)}. - Uttara Recreation Club Ltd.`;

      await tx.notificationLog.create({
        data: { memberId: mem.id, recipient: mem.phone || "", channel: "SMS", message: smsText, status: "PENDING" },
      });

      return { mem, smsText, voucherNo };
    });

    return {
      success: true,
      message: `Payment of ৳${input.totalPaid.toFixed(2)} recorded and allocated (Voucher ${result.voucherNo}).`,
      member: result.mem,
      smsMessage: result.smsText,
      voucherNo: result.voucherNo,
    };
  } catch (err) {
    console.error("recordMemberPaymentAction failed:", err);
    return { success: false, message: userMessage(err, "Payment could not be saved. Nothing was posted.") };
  }
}

/**
 * Member statement rows
 */
export async function getMemberStatement(memberId: string): Promise<MemberStatementRow[]> {
  await requireUser(ROLES.ANY);
  const entries = await prisma.memberLedgerEntry.findMany({
    where: { memberId },
    include: { voucher: true },
    orderBy: { entryDate: "asc" },
  });

  let running = 0;
  return entries.map((e) => {
    const d = Number(e.debit);
    const c = Number(e.credit);
    running += d - c;
    return {
      date: e.entryDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-"),
      voucherNo: e.voucher ? e.voucher.voucherNo : "OPENING",
      ledgerType: e.ledgerType as SubLedgerType,
      description: e.description,
      debit: d,
      credit: c,
      balance: running,
    };
  });
}

/**
 * SMS notification log for a member
 */
export async function getMemberSmsLogs(memberId: string): Promise<SmsNotificationItem[]> {
  await requireUser(ROLES.ANY);
  const logs = await prisma.notificationLog.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } });
  return logs.map((l) => ({
    id: l.id,
    memberId: l.memberId || "",
    phone: l.recipient,
    message: l.message,
    type: l.message.includes("charged") || l.message.includes("added") ? "CHARGE_ADDED" : "PAYMENT_RECEIVED",
    timestamp: l.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  }));
}
