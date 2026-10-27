"use server";

import { prisma } from "@/server/db";
import { SubLedgerType, AccountCategory, VoucherType, VoucherStatus } from "@prisma/client";
import { CARD_ROOM_SERVICES, CardRoomServiceItem } from "@/server/data/cardRoomServices";
import { requireUser, ROLES } from "@/server/auth/guard";

export interface CardRoomOrderItem {
  serviceId: string;
  name: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface CreateCardRoomChitInput {
  memberId: string;
  tableNo: string;
  attendantName: string;
  items: CardRoomOrderItem[];
  totalAmount: number;
}

export interface CardRoomChitResult {
  success: boolean;
  message: string;
  chitNo?: string;
  voucherNo?: string;
  memberNo?: string;
  memberName?: string;
  newCardRoomBalance?: number;
  thermalData?: any;
  error?: string;
}

/**
 * Fetch available card room services
 */
export async function getCardRoomServices(): Promise<CardRoomServiceItem[]> {
  await requireUser(ROLES.ANY);
  return CARD_ROOM_SERVICES;
}

/**
 * Create and post a Card Room & Sports session chit
 */
export async function createCardRoomChitAction(
  input: CreateCardRoomChitInput
): Promise<CardRoomChitResult> {
  const sessionUser = await requireUser(ROLES.FINANCE);
  if (!input.items || input.items.length === 0) {
    return { success: false, message: "No services or sessions added to chit." };
  }

  try {
    const member = await prisma.member.findUnique({
      where: { id: input.memberId },
      include: {
        ledgerEntries: {
          where: { ledgerType: SubLedgerType.CARD_ROOM },
        },
      },
    });

    if (!member) {
      return { success: false, message: "Selected member not found." };
    }

    if (member.status !== "ACTIVE") {
      return {
        success: false,
        message: `Member ${member.accountNo} is currently ${member.status} and cannot charge card room services.`,
      };
    }

    // Calculate current Card Room dues
    let currentCardDues = 0;
    member.ledgerEntries.forEach((e) => {
      currentCardDues += Number(e.debit) - Number(e.credit);
    });

    const creditLimit = Number(member.creditLimit || 50000);
    if (currentCardDues + input.totalAmount > creditLimit) {
      return {
        success: false,
        message: `Credit Limit Exceeded! Member ${member.accountNo} card room balance is ৳${currentCardDues.toLocaleString(
          "en-BD"
        )}, credit limit is ৳${creditLimit.toLocaleString("en-BD")}. Chit of ৳${input.totalAmount.toLocaleString(
          "en-BD"
        )} cannot be charged.`,
      };
    }

    const chitNo = `CR-${Math.floor(10000 + Math.random() * 90000)}`;
    const voucherNo = `J3-CRD-${Date.now().toString().slice(-6)}`;

    const userId = sessionUser.id;

    const itemsSummary = input.items.map((i) => `${i.name} (x${i.qty})`).join(", ");

    await prisma.$transaction(
      async (tx) => {
        // Ensure Account Heads exist
        // Head 1123: Member Card Room Receivable (Asset)
        let recHead = await tx.accountHead.findUnique({ where: { code: "1123" } });
        if (!recHead) {
          recHead = await tx.accountHead.create({
            data: {
              code: "1123",
              name: "Member Card Room Receivable",
              category: AccountCategory.ASSET,
            },
          });
        }

        // Head 4201: Card Room Daily Table Charges (Income)
        let incHead = await tx.accountHead.findUnique({ where: { code: "4201" } });
        if (!incHead) {
          incHead = await tx.accountHead.create({
            data: {
              code: "4201",
              name: "Card Room Daily Table Charges",
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
            narration: `CARD ROOM CHIT ${chitNo}: ${input.tableNo} - ${member.fullName} (${member.accountNo}) - Attendant: ${input.attendantName}`,
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
            description: `Card Room Chit ${chitNo} (${input.tableNo})`,
            debit: input.totalAmount,
            credit: 0,
          },
        });

        await tx.voucherLine.create({
          data: {
            voucherId: voucher.id,
            accountId: incHead.id,
            description: `Card Room table fees & consumables for ${chitNo}`,
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
            narration: `Card Room Chit ${chitNo} (${input.tableNo})`,
            debit: input.totalAmount,
            credit: 0,
          },
        });

        await tx.generalLedgerEntry.create({
          data: {
            voucherId: voucher.id,
            accountId: incHead.id,
            entryDate: new Date(),
            narration: `Card Room table fees & consumables for ${chitNo}`,
            debit: 0,
            credit: input.totalAmount,
          },
        });

        // 4. Update Member's CARD_ROOM Sub-Ledger
        const newBalance = currentCardDues + input.totalAmount;
        await tx.memberLedgerEntry.create({
          data: {
            memberId: member.id,
            voucherId: voucher.id,
            ledgerType: SubLedgerType.CARD_ROOM,
            entryDate: new Date(),
            description: `Card Room Chit ${chitNo} (${input.tableNo}): ${itemsSummary.substring(0, 80)}`,
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
              message: `Dear Member (${member.accountNo}), card room chit ${chitNo} of BDT ${input.totalAmount.toLocaleString()} at ${input.tableNo} has been debited to your Card Room Account. Net Card Dues: BDT ${newBalance.toLocaleString()}. - Uttara Recreation Club Ltd.`,
              status: "SENT",
              sentAt: new Date(),
            },
          });
        }

        // 6. Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: "CARD_ROOM_CHIT_CHARGED",
            entityType: "CardRoomSession",
            entityId: chitNo,
            newValues: {
              chitNo,
              voucherNo,
              memberNo: member.accountNo,
              tableNo: input.tableNo,
              attendant: input.attendantName,
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
      facilityName: "CARD ROOM & BILLIARDS SECTION",
      tableNo: input.tableNo,
      memberNo: member.accountNo,
      memberName: member.fullName,
      ledgerType: "CARD_ROOM" as const,
      items: input.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        rate: i.rate,
        amount: i.amount,
      })),
      totalAmount: input.totalAmount,
      serverName: input.attendantName,
      date: `${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    };

    return {
      success: true,
      message: `Card Room Chit ${chitNo} successfully charged to ${member.fullName} (${member.accountNo}) for ৳${input.totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}.`,
      chitNo,
      voucherNo,
      memberNo: member.accountNo,
      memberName: member.fullName,
      newCardRoomBalance: currentCardDues + input.totalAmount,
      thermalData,
    };
  } catch (err: any) {
    console.error("Card room chit error:", err);
    return {
      success: false,
      message: err.message || "Failed to process card room chit.",
      error: err.message,
    };
  }
}
