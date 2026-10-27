"use server";

import { prisma } from "@/server/db";
import { SubLedgerType, AccountCategory, VoucherType, VoucherStatus } from "@prisma/client";
import { CLUB_DINING_MENU, MenuItem } from "@/server/data/diningMenu";
import { requireUser, ROLES } from "@/server/auth/guard";

export interface DiningOrderItem {
  itemId: string;
  name: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface CreateDiningOrderInput {
  memberId: string;
  tableNo: string;
  serverName: string;
  items: DiningOrderItem[];
  subtotal: number;
  serviceCharge: number;
  totalAmount: number;
  paymentMethod: "MEMBER_ACCOUNT" | "CASH";
}

export interface DiningOrderResult {
  success: boolean;
  message: string;
  chitNo?: string;
  voucherNo?: string;
  memberNo?: string;
  memberName?: string;
  newDiningBalance?: number;
  thermalData?: any;
  error?: string;
}

/**
 * Fetch dining menu items
 */
export async function getDiningMenu(): Promise<MenuItem[]> {
  await requireUser(ROLES.ANY);
  return CLUB_DINING_MENU;
}

/**
 * Create and post a dining room POS order
 */
export async function createDiningOrderAction(
  input: CreateDiningOrderInput
): Promise<DiningOrderResult> {
  const sessionUser = await requireUser(ROLES.FINANCE);
  if (!input.items || input.items.length === 0) {
    return { success: false, message: "Order cart cannot be empty." };
  }

  try {
    const member = await prisma.member.findUnique({
      where: { id: input.memberId },
      include: {
        ledgerEntries: {
          where: { ledgerType: SubLedgerType.DINING },
        },
      },
    });

    if (!member) {
      return { success: false, message: "Selected member not found." };
    }

    if (member.status !== "ACTIVE") {
      return {
        success: false,
        message: `Member ${member.accountNo} is currently ${member.status} and cannot charge dining ledger.`,
      };
    }

    // Calculate current dining dues
    let currentDiningDues = 0;
    member.ledgerEntries.forEach((e) => {
      currentDiningDues += Number(e.debit) - Number(e.credit);
    });

    const creditLimit = Number(member.creditLimit || 50000);
    if (
      input.paymentMethod === "MEMBER_ACCOUNT" &&
      currentDiningDues + input.totalAmount > creditLimit
    ) {
      return {
        success: false,
        message: `Credit Limit Exceeded! Member ${member.accountNo} current dining balance is ৳${currentDiningDues.toLocaleString(
          "en-BD"
        )}, credit limit is ৳${creditLimit.toLocaleString("en-BD")}. Order of ৳${input.totalAmount.toLocaleString(
          "en-BD"
        )} cannot be charged.`,
      };
    }

    const chitNo = `CHIT-${Math.floor(10000 + Math.random() * 90000)}`;
    const voucherNo = `J3-DIN-${Date.now().toString().slice(-6)}`;

    const userId = sessionUser.id;

    const itemsSummary = input.items.map((i) => `${i.name} (x${i.qty})`).join(", ");

    await prisma.$transaction(
      async (tx) => {
        // Ensure Account Heads exist
        // Head 1122: Member Dining Room Receivable (Asset)
        let recHead = await tx.accountHead.findUnique({ where: { code: "1122" } });
        if (!recHead) {
          recHead = await tx.accountHead.create({
            data: {
              code: "1122",
              name: "Member Dining Room Receivable",
              category: AccountCategory.ASSET,
            },
          });
        }

        // Head 4101: Dining Room & Restaurant Food Sales (Income)
        let incHead = await tx.accountHead.findUnique({ where: { code: "4101" } });
        if (!incHead) {
          incHead = await tx.accountHead.create({
            data: {
              code: "4101",
              name: "Dining Room & Restaurant Food Sales",
              category: AccountCategory.INCOME,
            },
          });
        }

        // 1. Create General Ledger Voucher
        const voucher = await tx.voucher.create({
          data: {
            voucherNo,
            voucherType: VoucherType.JOURNAL,
            voucherDate: new Date(),
            narration: `DINING CHIT ${chitNo}: Table ${input.tableNo} - ${member.fullName} (${member.accountNo}) - Steward: ${input.serverName}`,
            status: VoucherStatus.POSTED,
            totalAmount: input.totalAmount,
            createdById: userId,
            postedAt: new Date(),
          },
        });

        // 2. Voucher Lines
        await tx.voucherLine.create({
          data: {
            voucherId: voucher.id,
            accountId: recHead.id,
            description: `Dining Room Chit ${chitNo} Table ${input.tableNo}`,
            debit: input.totalAmount,
            credit: 0,
          },
        });

        await tx.voucherLine.create({
          data: {
            voucherId: voucher.id,
            accountId: incHead.id,
            description: `Dining sales & service charge for ${chitNo}`,
            debit: 0,
            credit: input.totalAmount,
          },
        });

        // 3. GL Entries
        await tx.generalLedgerEntry.create({
          data: {
            voucherId: voucher.id,
            accountId: recHead.id,
            entryDate: new Date(),
            narration: `Dining Room Chit ${chitNo} Table ${input.tableNo}`,
            debit: input.totalAmount,
            credit: 0,
          },
        });

        await tx.generalLedgerEntry.create({
          data: {
            voucherId: voucher.id,
            accountId: incHead.id,
            entryDate: new Date(),
            narration: `Dining sales & service charge for ${chitNo}`,
            debit: 0,
            credit: input.totalAmount,
          },
        });

        // 4. Update Member's DINING Sub-Ledger
        const newBalance = currentDiningDues + input.totalAmount;
        await tx.memberLedgerEntry.create({
          data: {
            memberId: member.id,
            voucherId: voucher.id,
            ledgerType: SubLedgerType.DINING,
            entryDate: new Date(),
            description: `Dining Chit ${chitNo} (Table ${input.tableNo}): ${itemsSummary.substring(0, 80)}`,
            debit: input.totalAmount,
            credit: 0,
            runningBalance: newBalance,
          },
        });

        // 5. Send SMS notification
        if (member.phone) {
          await tx.notificationLog.create({
            data: {
              memberId: member.id,
              recipient: member.phone,
              channel: "SMS",
              message: `Dear Member (${member.accountNo}), dining chit ${chitNo} of BDT ${input.totalAmount.toLocaleString()} at Table ${input.tableNo} has been debited to your Dining Account. Net Dining Dues: BDT ${newBalance.toLocaleString()}. - Uttara Recreation Club Ltd. Restaurant`,
              status: "SENT",
              sentAt: new Date(),
            },
          });
        }

        // 6. Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: "DINING_CHIT_CHARGED",
            entityType: "DiningOrder",
            entityId: chitNo,
            newValues: {
              chitNo,
              voucherNo,
              memberNo: member.accountNo,
              tableNo: input.tableNo,
              steward: input.serverName,
              totalAmount: input.totalAmount,
              newBalance,
            },
          },
        });
      },
      { timeout: 25000 }
    );

    const thermalData = {
      chitNo,
      facilityName: "MAIN RESTAURANT & CATERING",
      tableNo: input.tableNo,
      memberNo: member.accountNo,
      memberName: member.fullName,
      ledgerType: "DINING" as const,
      items: input.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        rate: i.rate,
        amount: i.amount,
      })),
      totalAmount: input.totalAmount,
      serverName: input.serverName,
      date: `${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    };

    return {
      success: true,
      message: `Dining order ${chitNo} successfully charged to ${member.fullName} (${member.accountNo}) for ৳${input.totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}.`,
      chitNo,
      voucherNo,
      memberNo: member.accountNo,
      memberName: member.fullName,
      newDiningBalance: currentDiningDues + input.totalAmount,
      thermalData,
    };
  } catch (err: any) {
    console.error("Dining order creation error:", err);
    return {
      success: false,
      message: err.message || "Failed to process dining order.",
      error: err.message,
    };
  }
}
