"use server";

import { prisma } from "@/server/db";
import { SubLedgerType, AccountCategory, VoucherType, VoucherStatus } from "@prisma/client";
import { requireUser, ROLES } from "@/server/auth/guard";

export interface ImportMemberRow {
  accountNo: string;
  prefix?: string;
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  bloodGroup?: string;
  profession?: string;
  creditLimit?: number;
  subscriptionBalance?: number;
  diningBalance?: number;
  cardRoomBalance?: number;
  spouseName?: string;
  spouseMobile?: string;
  child1Name?: string;
  child2Name?: string;
  nomineeName?: string;
  nomineeRelation?: string;
}

export interface ImportAccountRow {
  code: string;
  name: string;
  category: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  controlHead?: string;
  openingDebit?: number;
  openingCredit?: number;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  importedCount: number;
  updatedCount: number;
  totalOpeningDues?: number;
  details?: {
    subscriptionTotal: number;
    diningTotal: number;
    cardRoomTotal: number;
  };
  errors?: string[];
}

/**
 * Bulk import legacy desktop members and their opening sub-ledger balances into PostgreSQL
 */
export async function importMembersBulkAction(
  rows: ImportMemberRow[]
): Promise<MigrationResult> {
  const sessionUser = await requireUser(ROLES.IMPORT);
  if (!rows || rows.length === 0) {
    return {
      success: false,
      message: "No member data rows provided for migration.",
      importedCount: 0,
      updatedCount: 0,
    };
  }

  let importedCount = 0;
  let updatedCount = 0;
  let subTotal = 0;
  let dinTotal = 0;
  let crdTotal = 0;
  const errors: string[] = [];

  try {
    const userId = sessionUser.id;

    await prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r.accountNo || !r.accountNo.trim()) {
            errors.push(`Row #${i + 1}: Account Number is required.`);
            continue;
          }

          const acNo = r.accountNo.trim().toUpperCase();
          const fName = (r.firstName || "Member").trim();
          const lName = (r.lastName || "").trim();
          const fullName = `${fName} ${r.middleName || ""} ${lName}`.replace(/\s+/g, " ").trim();

          const subBal = Number(r.subscriptionBalance || 0);
          const dinBal = Number(r.diningBalance || 0);
          const crdBal = Number(r.cardRoomBalance || 0);

          subTotal += subBal;
          dinTotal += dinBal;
          crdTotal += crdBal;

          const existing = await tx.member.findUnique({
            where: { accountNo: acNo },
          });

          let memberId = "";

          if (existing) {
            const updated = await tx.member.update({
              where: { id: existing.id },
              data: {
                prefix: r.prefix || existing.prefix,
                title: r.title || existing.title,
                firstName: fName,
                middleName: r.middleName || null,
                lastName: lName,
                fullName,
                phone: r.phone || existing.phone,
                email: r.email || existing.email,
                address: r.address || existing.address,
                city: r.city || existing.city,
                bloodGroup: r.bloodGroup || existing.bloodGroup,
                profession: r.profession || existing.profession,
                creditLimit: Number(r.creditLimit || existing.creditLimit || 50000),
              },
            });
            memberId = updated.id;
            updatedCount++;
          } else {
            const created = await tx.member.create({
              data: {
                accountNo: acNo,
                prefix: r.prefix || acNo.split("-")[0] || "PM",
                title: r.title || "Mr.",
                firstName: fName,
                middleName: r.middleName || null,
                lastName: lName,
                fullName,
                phone: r.phone || null,
                email: r.email || null,
                address: r.address || null,
                city: r.city || "Dhaka",
                bloodGroup: r.bloodGroup || null,
                profession: r.profession || null,
                creditLimit: Number(r.creditLimit || 50000),
              },
            });
            memberId = created.id;
            importedCount++;
          }

          // Spouses
          if (r.spouseName && r.spouseName.trim()) {
            await tx.memberSpouse.deleteMany({
              where: { memberId, spouseIndex: 1 },
            });
            await tx.memberSpouse.create({
              data: {
                memberId,
                spouseIndex: 1,
                name: r.spouseName.trim(),
                mobile: r.spouseMobile || null,
              },
            });
          }

          // Children
          if (r.child1Name && r.child1Name.trim()) {
            await tx.memberChild.deleteMany({
              where: { memberId, childIndex: 1 },
            });
            await tx.memberChild.create({
              data: {
                memberId,
                childIndex: 1,
                name: r.child1Name.trim(),
              },
            });
          }
          if (r.child2Name && r.child2Name.trim()) {
            await tx.memberChild.deleteMany({
              where: { memberId, childIndex: 2 },
            });
            await tx.memberChild.create({
              data: {
                memberId,
                childIndex: 2,
                name: r.child2Name.trim(),
              },
            });
          }

          // Nominee
          if (r.nomineeName && r.nomineeName.trim()) {
            await tx.memberNominee.deleteMany({ where: { memberId } });
            await tx.memberNominee.create({
              data: {
                memberId,
                name: r.nomineeName.trim(),
                relation: r.nomineeRelation || "Family",
                sharePercent: 100,
              },
            });
          }

          // Record Opening Sub-Ledger Entries if balances exist
          if (subBal > 0) {
            await tx.memberLedgerEntry.create({
              data: {
                memberId,
                ledgerType: SubLedgerType.SUBSCRIPTION,
                entryDate: new Date(),
                description: `Legacy Desktop Migration Opening Subscription Balance (${acNo})`,
                debit: subBal,
                credit: 0,
                runningBalance: subBal,
              },
            });
          }
          if (dinBal > 0) {
            await tx.memberLedgerEntry.create({
              data: {
                memberId,
                ledgerType: SubLedgerType.DINING,
                entryDate: new Date(),
                description: `Legacy Desktop Migration Opening Dining Balance (${acNo})`,
                debit: dinBal,
                credit: 0,
                runningBalance: dinBal,
              },
            });
          }
          if (crdBal > 0) {
            await tx.memberLedgerEntry.create({
              data: {
                memberId,
                ledgerType: SubLedgerType.CARD_ROOM,
                entryDate: new Date(),
                description: `Legacy Desktop Migration Opening Card Room Balance (${acNo})`,
                debit: crdBal,
                credit: 0,
                runningBalance: crdBal,
              },
            });
          }
        }

        // Post Balancing Opening Journal Voucher to keep GL in equilibrium
        const totalOpeningDues = subTotal + dinTotal + crdTotal;
        if (totalOpeningDues > 0) {
          const vNo = `J3-MIG-${Date.now().toString().slice(-4)}`;
          const openVoucher = await tx.voucher.create({
            data: {
              voucherNo: vNo,
              voucherType: VoucherType.JOURNAL,
              voucherDate: new Date(),
              narration: `LEGACY DESKTOP MIGRATION: Opening Member Sub-Ledger Balances (${rows.length} members migrated)`,
              status: VoucherStatus.POSTED,
              totalAmount: totalOpeningDues,
              createdById: userId,
              postedAt: new Date(),
            },
          });

          // Debit Member Receivables & Credit Retained Surplus / Capital Fund
          const linesToPost: { code: string; desc: string; dr: number; cr: number }[] = [];
          if (subTotal > 0)
            linesToPost.push({
              code: "1121",
              desc: "Migration Opening Subscription Receivable",
              dr: subTotal,
              cr: 0,
            });
          if (dinTotal > 0)
            linesToPost.push({
              code: "1122",
              desc: "Migration Opening Dining Receivable",
              dr: dinTotal,
              cr: 0,
            });
          if (crdTotal > 0)
            linesToPost.push({
              code: "1123",
              desc: "Migration Opening Card Room Receivable",
              dr: crdTotal,
              cr: 0,
            });
          linesToPost.push({
            code: "3002",
            desc: "Offsetting Retained Surplus Balance",
            dr: 0,
            cr: totalOpeningDues,
          });

          for (const l of linesToPost) {
            let acc = await tx.accountHead.findUnique({ where: { code: l.code } });
            if (!acc) {
              acc = await tx.accountHead.create({
                data: {
                  code: l.code,
                  name: l.desc,
                  category: l.code.startsWith("1") ? AccountCategory.ASSET : AccountCategory.EQUITY,
                },
              });
            }

            await tx.voucherLine.create({
              data: {
                voucherId: openVoucher.id,
                accountId: acc.id,
                description: l.desc,
                debit: l.dr,
                credit: l.cr,
              },
            });

            await tx.generalLedgerEntry.create({
              data: {
                voucherId: openVoucher.id,
                accountId: acc.id,
                entryDate: new Date(),
                narration: l.desc,
                debit: l.dr,
                credit: l.cr,
              },
            });
          }
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: "BULK_MEMBER_MIGRATION",
            entityType: "Member",
            entityId: "BATCH-MIGRATION",
            newValues: {
              importedCount,
              updatedCount,
              subTotal,
              dinTotal,
              crdTotal,
              totalOpeningDues,
            },
          },
        });
      },
      { timeout: 30000 }
    );

    return {
      success: true,
      message: `Successfully migrated ${importedCount} new members, updated ${updatedCount} existing members, and posted ৳${(
        subTotal +
        dinTotal +
        crdTotal
      ).toLocaleString("en-BD", { minimumFractionDigits: 2 })} in balanced opening sub-ledgers.`,
      importedCount,
      updatedCount,
      totalOpeningDues: subTotal + dinTotal + crdTotal,
      details: {
        subscriptionTotal: subTotal,
        diningTotal: dinTotal,
        cardRoomTotal: crdTotal,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error("Bulk migration failure:", err);
    return {
      success: false,
      message: err.message || "Failed to execute bulk member migration.",
      importedCount,
      updatedCount,
      errors: [err.message],
    };
  }
}

/**
 * Bulk import legacy Chart of Accounts & GL opening balances
 */
export async function importAccountsBulkAction(
  rows: ImportAccountRow[]
): Promise<MigrationResult> {
  await requireUser(ROLES.IMPORT);
  if (!rows || rows.length === 0) {
    return {
      success: false,
      message: "No account rows provided for migration.",
      importedCount: 0,
      updatedCount: 0,
    };
  }

  let importedCount = 0;
  let updatedCount = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        if (!r.code || !r.name) continue;
        const code = r.code.trim();
        const existing = await tx.accountHead.findUnique({ where: { code } });

        if (existing) {
          await tx.accountHead.update({
            where: { id: existing.id },
            data: {
              name: r.name.trim(),
              category: r.category as AccountCategory,
            },
          });
          updatedCount++;
        } else {
          await tx.accountHead.create({
            data: {
              code,
              name: r.name.trim(),
              category: r.category as AccountCategory,
              isControlHead: false,
            },
          });
          importedCount++;
        }
      }
    });

    return {
      success: true,
      message: `Successfully processed Chart of Accounts: ${importedCount} created, ${updatedCount} updated.`,
      importedCount,
      updatedCount,
    };
  } catch (err: any) {
    console.error("COA migration failure:", err);
    return {
      success: false,
      message: err.message || "Failed to import Chart of Accounts.",
      importedCount: 0,
      updatedCount: 0,
    };
  }
}
