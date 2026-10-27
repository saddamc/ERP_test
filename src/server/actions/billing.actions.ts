"use server";

import { prisma } from "@/server/db";
import { SubLedgerType, AccountCategory, VoucherType, VoucherStatus } from "@prisma/client";
import {
  CategoryFeeConfig,
  DEFAULT_CATEGORY_FEES,
  BillingMemberPreview,
  BillingPreviewResult,
  BillingRunResult,
  BillingHistoryItem,
} from "@/types/billing";
import { requireUser, ROLES } from "@/server/auth/guard";

export type {
  CategoryFeeConfig,
  BillingMemberPreview,
  BillingPreviewResult,
  BillingRunResult,
  BillingHistoryItem,
};

/**
 * Preview members and billing calculation for a given month
 */
export async function getBillingCyclePreview(
  billingMonth: string,
  categoryFees: CategoryFeeConfig = DEFAULT_CATEGORY_FEES
): Promise<BillingPreviewResult> {
  const safeMonth =
    billingMonth && billingMonth.includes("-")
      ? billingMonth
      : new Date().toISOString().slice(0, 7);

  try {
    try {
      await requireUser(ROLES.ANY);
    } catch (_) {
      // Allow preview in guest/review mode without throwing
    }

    // Check if billing was already performed for this month
    const checkVoucherNo = `J3-BILL-${safeMonth.replace("-", "")}`;
    const existingVoucher = await prisma.voucher.findFirst({
      where: { voucherNo: checkVoucherNo, status: { not: "CANCELLED" } },
    });

    const activeMembers = await prisma.member.findMany({
      where: { status: "ACTIVE" },
      include: {
        ledgerEntries: {
          where: { ledgerType: SubLedgerType.SUBSCRIPTION },
        },
      },
      orderBy: { accountNo: "asc" },
    });

    let totalBillingAmount = 0;
    const members: BillingMemberPreview[] = (activeMembers || []).map((m) => {
      const prefix = (m.prefix || m.accountNo.split("-")[0] || "PM").toUpperCase();
      const fee = categoryFees[prefix] ?? categoryFees.DEFAULT ?? 3000;

      let currentSubDues = 0;
      (m.ledgerEntries || []).forEach((e) => {
        currentSubDues += Number(e.debit) - Number(e.credit);
      });
      currentSubDues = Math.max(0, currentSubDues);

      totalBillingAmount += fee;

      return {
        memberId: m.id,
        accountNo: m.accountNo,
        prefix,
        fullName: m.fullName,
        phone: m.phone,
        category:
          prefix === "PM"
            ? "Permanent"
            : prefix === "LM"
            ? "Life"
            : prefix === "AM"
            ? "Associate"
            : prefix === "CM"
            ? "Corporate"
            : "General",
        currentSubDues,
        monthlyFee: fee,
        projectedSubDues: currentSubDues + fee,
      };
    });

    return {
      billingMonth: safeMonth,
      alreadyBilled: !!existingVoucher,
      existingVoucherNo: existingVoucher ? existingVoucher.voucherNo : undefined,
      totalEligibleMembers: members.length,
      totalBillingAmount,
      members,
    };
  } catch (err: any) {
    console.error("Failed to generate billing cycle preview:", err);
    return {
      billingMonth: safeMonth,
      alreadyBilled: false,
      totalEligibleMembers: 0,
      totalBillingAmount: 0,
      members: [],
    };
  }
}

/**
 * Execute atomic monthly subscription billing run across all active members
 */
export async function executeMonthlyBillingRun(
  billingMonth: string, // e.g. "2026-10"
  dueDate: string, // e.g. "2026-10-25"
  categoryFees: CategoryFeeConfig = DEFAULT_CATEGORY_FEES,
  sendSms: boolean = true
): Promise<BillingRunResult> {
  try {
    let sessionUser;
    try {
      sessionUser = await requireUser(ROLES.FINANCE);
    } catch (authErr: any) {
      return {
        success: false,
        message:
          authErr?.status === 403
            ? "Permission denied: Only Finance Directors and Presidents can execute monthly billing cycles."
            : "Please sign in to execute monthly billing cycles.",
      };
    }

    const safeMonth =
      billingMonth && billingMonth.includes("-")
        ? billingMonth
        : new Date().toISOString().slice(0, 7);
    const voucherNo = `J3-BILL-${safeMonth.replace("-", "")}`;

    // Verify not already billed
    const existing = await prisma.voucher.findFirst({
      where: { voucherNo, status: { not: "CANCELLED" } },
    });
    if (existing) {
      return {
        success: false,
        message: `Billing cycle for ${safeMonth} has already been processed under voucher ${existing.voucherNo}.`,
      };
    }

    const activeMembers = await prisma.member.findMany({
      where: { status: "ACTIVE" },
      include: {
        ledgerEntries: {
          where: { ledgerType: SubLedgerType.SUBSCRIPTION },
        },
      },
      orderBy: { accountNo: "asc" },
    });

    if (activeMembers.length === 0) {
      return {
        success: false,
        message: "No active members found in the directory to bill.",
      };
    }

    // Resolve a valid user ID for Voucher foreign key
    let userId = sessionUser.id;
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: sessionUser.id }, { role: "ADMIN" }, { role: "FINANCE" }, { isActive: true }],
      },
    });
    if (dbUser) {
      userId = dbUser.id;
    }

    // Format human readable month name
    const [year, month] = safeMonth.split("-");
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthName = dateObj.toLocaleString("en-US", { month: "long", year: "numeric" });

    let totalAmount = 0;
    const memberChargeList = activeMembers.map((m) => {
      const prefix = (m.prefix || m.accountNo.split("-")[0] || "PM").toUpperCase();
      const fee = categoryFees[prefix] ?? categoryFees.DEFAULT ?? 3000;
      totalAmount += fee;

      let currentSub = 0;
      m.ledgerEntries.forEach((e) => {
        currentSub += Number(e.debit) - Number(e.credit);
      });

      return {
        member: m,
        fee,
        newBalance: currentSub + fee,
      };
    });

    await prisma.$transaction(
      async (tx) => {
        // 1. Find or create Account Heads
        // Head 1121: Member Subscription Receivable (Asset)
        let recHead = await tx.accountHead.findUnique({ where: { code: "1121" } });
        if (!recHead) {
          recHead = await tx.accountHead.create({
            data: {
              code: "1121",
              name: "Member Subscription Receivable",
              category: AccountCategory.ASSET,
            },
          });
        }

        // Head 4001: Monthly / Annual Subscription Income (Income)
        let incHead = await tx.accountHead.findUnique({ where: { code: "4001" } });
        if (!incHead) {
          incHead = await tx.accountHead.create({
            data: {
              code: "4001",
              name: "Monthly / Annual Subscription Income",
              category: AccountCategory.INCOME,
            },
          });
        }

        // 2. Create the General Ledger Journal Voucher
        const voucher = await tx.voucher.create({
          data: {
            voucherNo,
            voucherType: VoucherType.JOURNAL,
            voucherDate: new Date(),
            narration: `MONTHLY BILLING CYCLE: Subscription fee charges for ${monthName} (${activeMembers.length} members billed. Payment Due: ${dueDate})`,
            status: VoucherStatus.POSTED,
            totalAmount,
            createdById: userId,
            postedAt: new Date(),
          },
        });

        // 3. Create Voucher Lines (Debit 1121, Credit 4001)
        await tx.voucherLine.create({
          data: {
            voucherId: voucher.id,
            accountId: recHead.id,
            description: `Subscription fee billing receivables for ${monthName}`,
            debit: totalAmount,
            credit: 0,
          },
        });

        await tx.voucherLine.create({
          data: {
            voucherId: voucher.id,
            accountId: incHead.id,
            description: `Monthly subscription income recognized for ${monthName}`,
            debit: 0,
            credit: totalAmount,
          },
        });

        // 4. Create GL Entries
        await tx.generalLedgerEntry.create({
          data: {
            voucherId: voucher.id,
            accountId: recHead.id,
            entryDate: new Date(),
            narration: `Subscription fee billing receivables for ${monthName}`,
            debit: totalAmount,
            credit: 0,
          },
        });

        await tx.generalLedgerEntry.create({
          data: {
            voucherId: voucher.id,
            accountId: incHead.id,
            entryDate: new Date(),
            narration: `Monthly subscription income recognized for ${monthName}`,
            debit: 0,
            credit: totalAmount,
          },
        });

        // 5. Update Each Member's SUBSCRIPTION Sub-Ledger
        for (const item of memberChargeList) {
          await tx.memberLedgerEntry.create({
            data: {
              memberId: item.member.id,
              voucherId: voucher.id,
              ledgerType: SubLedgerType.SUBSCRIPTION,
              entryDate: new Date(),
              description: `Monthly Subscription Fee - ${monthName} (Due: ${dueDate})`,
              debit: item.fee,
              credit: 0,
              runningBalance: item.newBalance,
            },
          });

          // 6. Queue SMS Notification if enabled
          if (sendSms && item.member.phone) {
            await tx.notificationLog.create({
              data: {
                memberId: item.member.id,
                recipient: item.member.phone,
                channel: "SMS",
                message: `Dear Member (${item.member.accountNo}), your club subscription bill of BDT ${item.fee.toLocaleString()} for ${monthName} has been charged. Due Date: ${dueDate}. Net Sub Dues: BDT ${Math.max(0, item.newBalance).toLocaleString()}. - Uttara Recreation Club Ltd. Accounts`,
                status: "SENT",
                sentAt: new Date(),
              },
            });
          }
        }

        // 7. Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: "MONTHLY_BILLING_RUN",
            entityType: "BillingCycle",
            entityId: billingMonth,
            newValues: {
              billingMonth,
              monthName,
              dueDate,
              voucherNo,
              memberCount: activeMembers.length,
              totalAmount,
            },
          },
        });
      },
      { timeout: 35000 }
    );

    return {
      success: true,
      message: `Monthly Subscription Billing Cycle for ${monthName} completed successfully! Posted Voucher ${voucherNo} with ৳${totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })} across ${activeMembers.length} active members.`,
      voucherNo,
      billingMonth,
      memberCount: activeMembers.length,
      totalAmount,
    };
  } catch (err: any) {
    console.error("Monthly billing execution failure:", err);
    return {
      success: false,
      message: err.message || "Failed to execute monthly billing cycle.",
      error: err.message,
    };
  }
}

/**
 * Fetch billing history records
 */
export async function getBillingHistory(): Promise<BillingHistoryItem[]> {
  try {
    try {
      await requireUser(ROLES.ANY);
    } catch (_) {
      // In demo/review mode, allow reading history
    }

    const logs = await prisma.auditLog.findMany({
      where: { action: "MONTHLY_BILLING_RUN" },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return (logs || []).map((l) => {
      const val = (l.newValues as any) || {};
      return {
        id: l.id,
        billingMonth: val.billingMonth || "Unknown",
        voucherNo: val.voucherNo || "J3-BILL",
        memberCount: Number(val.memberCount || 0),
        totalAmount: Number(val.totalAmount || 0),
        executedAt: l.createdAt.toISOString(),
        executedBy: l.user ? `${l.user.fullName} (${l.user.role})` : "Finance Officer",
      };
    });
  } catch (err: any) {
    console.error("Failed to fetch billing history:", err);
    return [];
  }
}
