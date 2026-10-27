"use server";

import { prisma } from "@/server/db";
import { SubLedgerType, AccountCategory, VoucherType, VoucherStatus } from "@prisma/client";
import { MoneyReceiptData } from "@/components/print/MoneyReceiptSlip";
import { requireUser, ROLES } from "@/server/auth/guard";

export interface ProcessCollectionInput {
  memberId: string;
  totalPaid: number;
  paymentMode: "CASH" | "BKASH" | "NAGAD" | "BANK_CARD" | "CHEQUE";
  bankName?: string;
  referenceNo?: string;
  allocSubscription: number;
  allocDining: number;
  allocCardRoom: number;
  allocAdvance: number;
  narration?: string;
}

export interface CollectionResult {
  success: boolean;
  message: string;
  receiptNo?: string;
  voucherNo?: string;
  receiptData?: MoneyReceiptData;
  error?: string;
}

export interface RecentReceiptItem {
  id: string;
  receiptNo: string;
  date: string;
  memberNo: string;
  memberName: string;
  amount: number;
  paymentMode: string;
  voucherNo: string;
}

/**
 * Process member payment collection and generate Money Receipt & GL Voucher
 */
export async function processCollectionAction(
  input: ProcessCollectionInput
): Promise<CollectionResult> {
  const sessionUser = await requireUser(ROLES.FINANCE);
  const sumAlloc =
    input.allocSubscription + input.allocDining + input.allocCardRoom + input.allocAdvance;

  if (Math.abs(sumAlloc - input.totalPaid) > 0.01) {
    return {
      success: false,
      message: `Allocation sum (৳${sumAlloc.toFixed(2)}) must equal Total Paid (৳${input.totalPaid.toFixed(2)}).`,
    };
  }

  try {
    const member = await prisma.member.findUnique({
      where: { id: input.memberId },
      include: {
        ledgerEntries: true,
      },
    });

    if (!member) {
      return { success: false, message: "Selected member not found." };
    }

    // Calculate current dues
    let subDues = 0;
    let dinDues = 0;
    let crdDues = 0;
    member.ledgerEntries.forEach((e) => {
      const net = Number(e.debit) - Number(e.credit);
      if (e.ledgerType === "SUBSCRIPTION") subDues += net;
      else if (e.ledgerType === "DINING") dinDues += net;
      else if (e.ledgerType === "CARD_ROOM") crdDues += net;
    });

    const previousTotalOutstanding = Math.max(0, subDues) + Math.max(0, dinDues) + Math.max(0, crdDues);
    const remainingBalance = Math.max(0, previousTotalOutstanding - (input.totalPaid - input.allocAdvance));

    const receiptNo = `MR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const isCash = input.paymentMode === "CASH";
    const voucherType = isCash ? VoucherType.CASH_RECEIVE : VoucherType.BANK_RECEIVE;
    const voucherNo = `${isCash ? "R1" : "R2"}-${Date.now().toString().slice(-6)}`;

    // Debit Account Code (1001 for cash, 1103 for cards/MFS, 1101 for cheque)
    const debitAccountCode = isCash
      ? "1001"
      : input.paymentMode === "CHEQUE"
      ? "1101"
      : "1103";

    const userId = sessionUser.id;
    const cashierName = sessionUser.fullName;

    await prisma.$transaction(
      async (tx) => {
        // Ensure Debit Account exists
        let debitAccount = await tx.accountHead.findUnique({ where: { code: debitAccountCode } });
        if (!debitAccount) {
          debitAccount = await tx.accountHead.create({
            data: {
              code: debitAccountCode,
              name: isCash ? "Main Cash in Hand Desk" : "Bank / MFS Collection Account",
              category: AccountCategory.ASSET,
            },
          });
        }

        // 1. Create General Ledger Voucher (R1 or R2)
        const voucher = await tx.voucher.create({
          data: {
            voucherNo,
            voucherType,
            voucherDate: new Date(),
            narration: `MONEY RECEIPT ${receiptNo} (${input.paymentMode}): Received from ${member.fullName} (${member.accountNo}) - Ref: ${
              input.referenceNo || "Counter Cash"
            }`,
            status: VoucherStatus.POSTED,
            totalAmount: input.totalPaid,
            createdById: userId,
            postedAt: new Date(),
            bankCode: !isCash ? debitAccountCode : undefined,
            bankName: input.bankName || (input.paymentMode === "BKASH" ? "bKash Merchant" : input.paymentMode === "NAGAD" ? "Nagad Merchant" : "Sonali Bank"),
          },
        });

        // 2. Voucher Line - Debit Cash/Bank
        await tx.voucherLine.create({
          data: {
            voucherId: voucher.id,
            accountId: debitAccount.id,
            description: `Payment received via ${input.paymentMode} (${receiptNo})`,
            debit: input.totalPaid,
            credit: 0,
          },
        });

        // GL Entry - Debit Cash/Bank
        await tx.generalLedgerEntry.create({
          data: {
            voucherId: voucher.id,
            accountId: debitAccount.id,
            entryDate: new Date(),
            narration: `Payment received via ${input.paymentMode} (${receiptNo})`,
            debit: input.totalPaid,
            credit: 0,
          },
        });

        // 3. Voucher Lines - Credit Receivables / Advances
        const creditLines: { code: string; name: string; amount: number; desc: string; ledger?: SubLedgerType }[] = [];
        if (input.allocSubscription > 0) {
          creditLines.push({
            code: "1121",
            name: "Member Subscription Receivable",
            amount: input.allocSubscription,
            desc: `Subscription dues collection (${receiptNo})`,
            ledger: SubLedgerType.SUBSCRIPTION,
          });
        }
        if (input.allocDining > 0) {
          creditLines.push({
            code: "1122",
            name: "Member Dining Room Receivable",
            amount: input.allocDining,
            desc: `Dining dues collection (${receiptNo})`,
            ledger: SubLedgerType.DINING,
          });
        }
        if (input.allocCardRoom > 0) {
          creditLines.push({
            code: "1123",
            name: "Member Card Room Receivable",
            amount: input.allocCardRoom,
            desc: `Card Room dues collection (${receiptNo})`,
            ledger: SubLedgerType.CARD_ROOM,
          });
        }
        if (input.allocAdvance > 0) {
          creditLines.push({
            code: "2001",
            name: "Member Advance Deposits Payable",
            amount: input.allocAdvance,
            desc: `Advance deposit credit balance (${receiptNo})`,
          });
        }

        for (const cl of creditLines) {
          let crAcc = await tx.accountHead.findUnique({ where: { code: cl.code } });
          if (!crAcc) {
            crAcc = await tx.accountHead.create({
              data: {
                code: cl.code,
                name: cl.name,
                category: cl.code.startsWith("1") ? AccountCategory.ASSET : AccountCategory.LIABILITY,
              },
            });
          }

          await tx.voucherLine.create({
            data: {
              voucherId: voucher.id,
              accountId: crAcc.id,
              description: cl.desc,
              debit: 0,
              credit: cl.amount,
            },
          });

          await tx.generalLedgerEntry.create({
            data: {
              voucherId: voucher.id,
              accountId: crAcc.id,
              entryDate: new Date(),
              narration: cl.desc,
              debit: 0,
              credit: cl.amount,
            },
          });

          // Post to Member Sub-Ledger
          if (cl.ledger) {
            let prevLedgerBal = 0;
            if (cl.ledger === "SUBSCRIPTION") prevLedgerBal = subDues;
            else if (cl.ledger === "DINING") prevLedgerBal = dinDues;
            else if (cl.ledger === "CARD_ROOM") prevLedgerBal = crdDues;

            await tx.memberLedgerEntry.create({
              data: {
                memberId: member.id,
                voucherId: voucher.id,
                ledgerType: cl.ledger,
                entryDate: new Date(),
                description: `Payment Received (${receiptNo} - ${input.paymentMode})`,
                debit: 0,
                credit: cl.amount,
                runningBalance: Math.max(0, prevLedgerBal - cl.amount),
              },
            });
          }
        }

        // 4. Record Payment Allocation
        await tx.paymentAllocation.create({
          data: {
            voucherId: voucher.id,
            memberId: member.id,
            subscriptionAmount: input.allocSubscription,
            diningAmount: input.allocDining,
            cardRoomAmount: input.allocCardRoom,
            advanceAmount: input.allocAdvance,
          },
        });

        // 5. Send SMS Notification
        if (member.phone) {
          await tx.notificationLog.create({
            data: {
              memberId: member.id,
              recipient: member.phone,
              channel: "SMS",
              message: `Dear Member (${member.accountNo}), your payment of BDT ${input.totalPaid.toLocaleString()} (Receipt: ${receiptNo}) has been received with thanks. Remaining Dues: BDT ${remainingBalance.toLocaleString()}. - Uttara Recreation Club Ltd.`,
              status: "SENT",
              sentAt: new Date(),
            },
          });
        }

        // 6. Record Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: "MEMBER_PAYMENT_COLLECTION",
            entityType: "MoneyReceipt",
            entityId: receiptNo,
            newValues: {
              receiptNo,
              voucherNo,
              memberNo: member.accountNo,
              totalPaid: input.totalPaid,
              paymentMode: input.paymentMode,
              referenceNo: input.referenceNo,
              allocations: {
                subscription: input.allocSubscription,
                dining: input.allocDining,
                cardRoom: input.allocCardRoom,
                advance: input.allocAdvance,
              },
              remainingBalance,
            },
          },
        });
      },
      { timeout: 30000 }
    );

    const receiptData: MoneyReceiptData = {
      receiptNo,
      date: `${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      memberNo: member.accountNo,
      memberName: member.fullName,
      memberPhone: member.phone || undefined,
      amount: input.totalPaid,
      paymentMode: input.paymentMode,
      referenceNo: input.referenceNo,
      bankName: input.bankName,
      allocations: {
        subscription: input.allocSubscription,
        dining: input.allocDining,
        cardRoom: input.allocCardRoom,
        advance: input.allocAdvance,
      },
      previousBalance: previousTotalOutstanding,
      remainingBalance,
      receivedBy: cashierName,
    };

    return {
      success: true,
      message: `Payment of ৳${input.totalPaid.toLocaleString("en-BD", {
        minimumFractionDigits: 2,
      })} successfully recorded for ${member.fullName} (${member.accountNo}) under Receipt ${receiptNo} & Voucher ${voucherNo}.`,
      receiptNo,
      voucherNo,
      receiptData,
    };
  } catch (err: any) {
    console.error("Payment collection error:", err);
    return {
      success: false,
      message: err.message || "Failed to process payment collection.",
      error: err.message,
    };
  }
}

/**
 * Fetch recent money receipts
 */
export async function getRecentReceipts(): Promise<RecentReceiptItem[]> {
  await requireUser(ROLES.ANY);
  try {
    const logs = await prisma.auditLog.findMany({
      where: { action: "MEMBER_PAYMENT_COLLECTION" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return logs.map((l) => {
      const val = (l.newValues as any) || {};
      return {
        id: l.id,
        receiptNo: val.receiptNo || l.entityId,
        date: l.createdAt.toISOString(),
        memberNo: val.memberNo || "—",
        memberName: val.memberName || "Member",
        amount: Number(val.totalPaid || 0),
        paymentMode: val.paymentMode || "CASH",
        voucherNo: val.voucherNo || "—",
      };
    });
  } catch (err: any) {
    console.error("Failed to fetch recent receipts:", err);
    return [];
  }
}
