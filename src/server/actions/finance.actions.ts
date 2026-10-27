"use server";

import { prisma } from "@/server/db";
import { FinancialAccountType, VoucherType, VoucherStatus, AccountCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser, ROLES } from "@/server/auth/guard";
import { userMessage } from "@/server/errors";

export interface FinancialAccountDTO {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "MOBILE_WALLET";
  provider: string | null;
  accountNumber: string | null;
  accountCode: string | null;
  bankIdentifierCode: string | null;
  branchName: string | null;
  isPrimary: boolean;
  openingBalance: number;
  currentBalance: number;
  status: string;
  notes: string | null;
  accountHeadId: string | null;
  accountHeadName?: string | null;
  updatedAt: string;
}

export interface FinancialSummaryKPI {
  totalLiquidFunds: number;
  totalInBanks: number;
  totalInCash: number;
  totalInMfs: number;
  activeAccountsCount: number;
  monthlyReceipts: number;
  monthlyPayments: number;
  netMonthlyCashFlow: number;
  reconciledRate: number;
}

export interface RegisterTransactionRow {
  id: string;
  date: string;
  voucherNo: string;
  voucherType: string;
  narration: string;
  moneyIn: number;
  moneyOut: number;
  runningBalance: number;
  isReconciled: boolean;
  reconciledAt: string | null;
}

/**
 * Fetch all financial accounts with summary KPIs
 */
export async function getFinancialAccountsSummaryAction(): Promise<{
  accounts: FinancialAccountDTO[];
  kpis: FinancialSummaryKPI;
}> {
  await requireUser(ROLES.ANY);
  try {
    const rawAccounts = await prisma.financialAccount.findMany({
      include: {
        accountHead: {
          select: { name: true, code: true },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });

    const accounts: FinancialAccountDTO[] = rawAccounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      type: acc.type as any,
      provider: acc.provider,
      accountNumber: acc.accountNumber,
      accountCode: acc.accountCode,
      bankIdentifierCode: acc.bankIdentifierCode,
      branchName: acc.branchName,
      isPrimary: acc.isPrimary,
      openingBalance: Number(acc.openingBalance),
      currentBalance: Number(acc.currentBalance),
      status: acc.status,
      notes: acc.notes,
      accountHeadId: acc.accountHeadId,
      accountHeadName: acc.accountHead?.name,
      updatedAt: acc.updatedAt.toISOString(),
    }));

    let totalLiquidFunds = 0;
    let totalInBanks = 0;
    let totalInCash = 0;
    let totalInMfs = 0;

    for (const a of accounts) {
      if (a.status === "ACTIVE") {
        totalLiquidFunds += a.currentBalance;
        if (a.type === "BANK") totalInBanks += a.currentBalance;
        else if (a.type === "CASH") totalInCash += a.currentBalance;
        else if (a.type === "MOBILE_WALLET") totalInMfs += a.currentBalance;
      }
    }

    // Calculate month-to-date money in / money out
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const periodGlEntries = await prisma.generalLedgerEntry.findMany({
      where: {
        entryDate: { gte: startOfMonth },
        account: {
          category: AccountCategory.ASSET,
          OR: [
            { code: { startsWith: "10" } },
            { code: { startsWith: "11" } },
          ],
        },
      },
      select: {
        debit: true,
        credit: true,
        reconciledAt: true,
      },
    });

    let monthlyReceipts = 0;
    let monthlyPayments = 0;
    let reconciledCount = 0;

    for (const g of periodGlEntries) {
      monthlyReceipts += Number(g.debit);
      monthlyPayments += Number(g.credit);
      if (g.reconciledAt) reconciledCount++;
    }

    const reconciledRate =
      periodGlEntries.length > 0
        ? Math.round((reconciledCount / periodGlEntries.length) * 100)
        : 100;

    return {
      accounts,
      kpis: {
        totalLiquidFunds,
        totalInBanks,
        totalInCash,
        totalInMfs,
        activeAccountsCount: accounts.filter((a) => a.status === "ACTIVE").length,
        monthlyReceipts,
        monthlyPayments,
        netMonthlyCashFlow: monthlyReceipts - monthlyPayments,
        reconciledRate,
      },
    };
  } catch (err) {
    console.error("Error fetching financial accounts summary:", err);
    return {
      accounts: [],
      kpis: {
        totalLiquidFunds: 0,
        totalInBanks: 0,
        totalInCash: 0,
        totalInMfs: 0,
        activeAccountsCount: 0,
        monthlyReceipts: 0,
        monthlyPayments: 0,
        netMonthlyCashFlow: 0,
        reconciledRate: 100,
      },
    };
  }
}

/**
 * Create a new Financial Account (Cash Desk, Bank A/C or Mobile Wallet)
 */
export async function createFinancialAccountAction(data: {
  name: string;
  type: "CASH" | "BANK" | "MOBILE_WALLET";
  provider?: string;
  accountNumber?: string;
  accountCode?: string;
  bankIdentifierCode?: string;
  branchName?: string;
  isPrimary?: boolean;
  openingBalance?: number;
  notes?: string;
}): Promise<{ success: boolean; message: string; account?: FinancialAccountDTO }> {
  try {
    const sessionUser = await requireUser(ROLES.FINANCE);
    const openingBal = Number(data.openingBalance || 0);

    // Resolve or find linked AccountHead
    let head = await prisma.accountHead.findFirst({
      where: { code: data.accountCode || (data.type === "CASH" ? "1001" : "1101") },
    });

    if (!head) {
      // create default head if not found
      head = await prisma.accountHead.create({
        data: {
          code: data.accountCode || (data.type === "CASH" ? "1003" : "1105"),
          name: data.name,
          category: AccountCategory.ASSET,
          isControlHead: false,
        },
      });
    }

    const created = await prisma.financialAccount.create({
      data: {
        name: data.name,
        type: data.type as FinancialAccountType,
        provider: data.provider || null,
        accountNumber: data.accountNumber || null,
        accountCode: head.code,
        bankIdentifierCode: data.bankIdentifierCode || null,
        branchName: data.branchName || null,
        isPrimary: Boolean(data.isPrimary),
        openingBalance: openingBal,
        currentBalance: openingBal,
        status: "ACTIVE",
        notes: data.notes || null,
        accountHeadId: head.id,
      },
      include: {
        accountHead: true,
      },
    });

    // If opening balance > 0, post double-entry opening equity
    if (openingBal > 0) {
      let equityHead = await prisma.accountHead.findFirst({
        where: { code: "3001" },
      });
      if (!equityHead) {
        equityHead = await prisma.accountHead.create({
          data: {
            code: "3001",
            name: "Club General Capital Fund",
            category: AccountCategory.EQUITY,
          },
        });
      }

      const defaultUser = sessionUser;
      if (defaultUser) {
        const voucherCount = await prisma.voucher.count({
          where: { voucherType: VoucherType.JOURNAL },
        });
        const vNo = `J3-OB-${voucherCount + 1}`;

        await prisma.voucher.create({
          data: {
            voucherNo: vNo,
            voucherType: VoucherType.JOURNAL,
            voucherDate: new Date(),
            narration: `Opening balance setup for ${created.name}`,
            status: VoucherStatus.POSTED,
            totalAmount: openingBal,
            createdById: defaultUser.id,
            postedAt: new Date(),
            lines: {
              create: [
                {
                  accountId: head.id,
                  debit: openingBal,
                  credit: 0,
                  description: `Opening balance debit to ${created.name}`,
                },
                {
                  accountId: equityHead.id,
                  debit: 0,
                  credit: openingBal,
                  description: `Opening equity credit for ${created.name}`,
                },
              ],
            },
            glEntries: {
              create: [
                {
                  accountId: head.id,
                  financialAccountId: created.id,
                  entryDate: new Date(),
                  debit: openingBal,
                  credit: 0,
                  narration: `Opening balance debit`,
                },
                {
                  accountId: equityHead.id,
                  entryDate: new Date(),
                  debit: 0,
                  credit: openingBal,
                  narration: `Opening equity credit`,
                },
              ],
            },
          },
        });
      }
    }

    revalidatePath("/");
    return {
      success: true,
      message: `Account "${created.name}" created successfully.`,
      account: {
        id: created.id,
        name: created.name,
        type: created.type as any,
        provider: created.provider,
        accountNumber: created.accountNumber,
        accountCode: created.accountCode,
        bankIdentifierCode: created.bankIdentifierCode,
        branchName: created.branchName,
        isPrimary: created.isPrimary,
        openingBalance: Number(created.openingBalance),
        currentBalance: Number(created.currentBalance),
        status: created.status,
        notes: created.notes,
        accountHeadId: created.accountHeadId,
        accountHeadName: created.accountHead?.name,
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error("Error creating financial account:", err);
    return { success: false, message: userMessage(err, "Failed to create account") };
  }
}

/**
 * Execute Account-to-Account Fund Transfer (Creates a Contra C3 voucher)
 */
export async function transferFundsAction(data: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date?: string;
  reference?: string;
  narration?: string;
}): Promise<{ success: boolean; message: string; voucherNo?: string }> {
  try {
    const sessionUser = await requireUser(ROLES.FINANCE);
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: "Transfer amount must be greater than zero." };
    }

    if (data.fromAccountId === data.toAccountId) {
      return { success: false, message: "Source and Destination account cannot be the same." };
    }

    const [fromAcc, toAcc] = await Promise.all([
      prisma.financialAccount.findUnique({
        where: { id: data.fromAccountId },
        include: { accountHead: true },
      }),
      prisma.financialAccount.findUnique({
        where: { id: data.toAccountId },
        include: { accountHead: true },
      }),
    ]);

    if (!fromAcc || !toAcc) {
      return { success: false, message: "Source or Destination account was not found." };
    }

    if (Number(fromAcc.currentBalance) < amount) {
      return {
        success: false,
        message: `Insufficient balance in ${fromAcc.name}. Available: ৳${Number(fromAcc.currentBalance).toLocaleString()}`,
      };
    }

    const adminUser = sessionUser;
    if (!adminUser) {
      return { success: false, message: "System user not found." };
    }

    const contraCount = await prisma.voucher.count({
      where: { voucherType: VoucherType.CONTRA },
    });
    const voucherNo = `C3-${contraCount + 1}`;
    const txDate = data.date ? new Date(data.date) : new Date();
    const memo =
      data.narration ||
      `Internal Fund Transfer from ${fromAcc.name} to ${toAcc.name}${data.reference ? ` (Ref: ${data.reference})` : ""}`;

    // Execute atomic transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update balances
      await tx.financialAccount.update({
        where: { id: fromAcc.id },
        data: { currentBalance: { decrement: amount } },
      });

      await tx.financialAccount.update({
        where: { id: toAcc.id },
        data: { currentBalance: { increment: amount } },
      });

      // 2. Create Contra Voucher with balanced double-entry lines
      const fromHeadId = fromAcc.accountHeadId || (await tx.accountHead.findFirst({ where: { code: "1001" } }))!.id;
      const toHeadId = toAcc.accountHeadId || (await tx.accountHead.findFirst({ where: { code: "1101" } }))!.id;

      await tx.voucher.create({
        data: {
          voucherNo,
          voucherType: VoucherType.CONTRA,
          voucherDate: txDate,
          narration: memo,
          bankName: toAcc.provider || toAcc.name,
          paymentTo: toAcc.name,
          status: VoucherStatus.POSTED,
          totalAmount: amount,
          createdById: adminUser.id,
          postedAt: new Date(),
          lines: {
            create: [
              {
                accountId: toHeadId,
                debit: amount,
                credit: 0,
                description: `Fund receipt into ${toAcc.name}`,
              },
              {
                accountId: fromHeadId,
                debit: 0,
                credit: amount,
                description: `Fund transfer out of ${fromAcc.name}`,
              },
            ],
          },
          glEntries: {
            create: [
              {
                accountId: toHeadId,
                financialAccountId: toAcc.id,
                entryDate: txDate,
                debit: amount,
                credit: 0,
                narration: `Contra Debit: ${toAcc.name}`,
              },
              {
                accountId: fromHeadId,
                financialAccountId: fromAcc.id,
                entryDate: txDate,
                debit: 0,
                credit: amount,
                narration: `Contra Credit: ${fromAcc.name}`,
              },
            ],
          },
        },
      });

      // 3. Add audit log
      await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          action: "FUND_TRANSFER",
          entityType: "VOUCHER",
          entityId: voucherNo,
          newValues: {
            fromAccount: fromAcc.name,
            toAccount: toAcc.name,
            amount,
            voucherNo,
          },
        },
      });
    });

    revalidatePath("/");
    return {
      success: true,
      message: `Transferred ৳${amount.toLocaleString()} from ${fromAcc.name} to ${toAcc.name} (Voucher ${voucherNo})`,
      voucherNo,
    };
  } catch (err: any) {
    console.error("Error executing fund transfer:", err);
    return { success: false, message: userMessage(err, "Failed to transfer funds") };
  }
}

/**
 * Direct Money In (Quick Receipt - Creates Cash/Bank Receive R1/R2 voucher)
 */
export async function directMoneyInAction(data: {
  financialAccountId: string;
  incomeAccountHeadId: string;
  amount: number;
  date?: string;
  receivedFrom?: string;
  reference?: string;
  narration?: string;
}): Promise<{ success: boolean; message: string; voucherNo?: string }> {
  try {
    const sessionUser = await requireUser(ROLES.FINANCE);
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: "Receipt amount must be greater than zero." };
    }

    const [account, incomeHead] = await Promise.all([
      prisma.financialAccount.findUnique({
        where: { id: data.financialAccountId },
      }),
      prisma.accountHead.findUnique({
        where: { id: data.incomeAccountHeadId },
      }),
    ]);

    if (!account || !incomeHead) {
      return { success: false, message: "Receiving account or Income Head not found." };
    }

    const adminUser = sessionUser;
    if (!adminUser) return { success: false, message: "System user not found." };

    const isCash = account.type === "CASH";
    const vType = isCash ? VoucherType.CASH_RECEIVE : VoucherType.BANK_RECEIVE;
    const vPrefix = isCash ? "R1" : "R2";

    const vCount = await prisma.voucher.count({
      where: { voucherType: vType },
    });
    const voucherNo = `${vPrefix}-${vCount + 1}`;
    const txDate = data.date ? new Date(data.date) : new Date();
    const memo =
      data.narration ||
      `Direct Receipt into ${account.name} from ${data.receivedFrom || "Guest / Miscellaneous"}`;

    await prisma.$transaction(async (tx) => {
      // 1. Update account balance
      await tx.financialAccount.update({
        where: { id: account.id },
        data: { currentBalance: { increment: amount } },
      });

      // 2. Create Receive Voucher
      const assetHeadId = account.accountHeadId || (await tx.accountHead.findFirst({ where: { code: "1001" } }))!.id;

      await tx.voucher.create({
        data: {
          voucherNo,
          voucherType: vType,
          voucherDate: txDate,
          narration: memo,
          paymentTo: data.receivedFrom || null,
          bankName: account.provider || account.name,
          status: VoucherStatus.POSTED,
          totalAmount: amount,
          createdById: adminUser.id,
          postedAt: new Date(),
          lines: {
            create: [
              {
                accountId: assetHeadId,
                debit: amount,
                credit: 0,
                description: `Debit into ${account.name}`,
              },
              {
                accountId: incomeHead.id,
                debit: 0,
                credit: amount,
                description: `Credit to income head ${incomeHead.name}`,
              },
            ],
          },
          glEntries: {
            create: [
              {
                accountId: assetHeadId,
                financialAccountId: account.id,
                entryDate: txDate,
                debit: amount,
                credit: 0,
                narration: memo,
              },
              {
                accountId: incomeHead.id,
                entryDate: txDate,
                debit: 0,
                credit: amount,
                narration: memo,
              },
            ],
          },
        },
      });
    });

    revalidatePath("/");
    return {
      success: true,
      message: `Receipt of ৳${amount.toLocaleString()} posted to ${account.name} (Voucher ${voucherNo})`,
      voucherNo,
    };
  } catch (err: any) {
    console.error("Error executing direct money in:", err);
    return { success: false, message: userMessage(err, "Failed to post receipt") };
  }
}

/**
 * Direct Money Out (Quick Expense - Creates Cash/Bank Payment P1/P2 voucher)
 */
export async function directMoneyOutAction(data: {
  financialAccountId: string;
  expenseAccountHeadId: string;
  amount: number;
  date?: string;
  paidTo?: string;
  reference?: string;
  narration?: string;
}): Promise<{ success: boolean; message: string; voucherNo?: string }> {
  try {
    const sessionUser = await requireUser(ROLES.FINANCE);
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, message: "Payment amount must be greater than zero." };
    }

    const [account, expenseHead] = await Promise.all([
      prisma.financialAccount.findUnique({
        where: { id: data.financialAccountId },
      }),
      prisma.accountHead.findUnique({
        where: { id: data.expenseAccountHeadId },
      }),
    ]);

    if (!account || !expenseHead) {
      return { success: false, message: "Paying account or Expense Head not found." };
    }

    if (Number(account.currentBalance) < amount) {
      return {
        success: false,
        message: `Insufficient balance in ${account.name}. Available: ৳${Number(account.currentBalance).toLocaleString()}`,
      };
    }

    const adminUser = sessionUser;
    if (!adminUser) return { success: false, message: "System user not found." };

    const isCash = account.type === "CASH";
    const vType = isCash ? VoucherType.CASH_PAYMENT : VoucherType.BANK_PAYMENT;
    const vPrefix = isCash ? "P1" : "P2";

    const vCount = await prisma.voucher.count({
      where: { voucherType: vType },
    });
    const voucherNo = `${vPrefix}-${vCount + 1}`;
    const txDate = data.date ? new Date(data.date) : new Date();
    const memo =
      data.narration ||
      `Expense payment from ${account.name} to ${data.paidTo || "Vendor / Supplier"}`;

    await prisma.$transaction(async (tx) => {
      // 1. Decrement account balance
      await tx.financialAccount.update({
        where: { id: account.id },
        data: { currentBalance: { decrement: amount } },
      });

      // 2. Create Payment Voucher
      const assetHeadId = account.accountHeadId || (await tx.accountHead.findFirst({ where: { code: "1001" } }))!.id;

      await tx.voucher.create({
        data: {
          voucherNo,
          voucherType: vType,
          voucherDate: txDate,
          narration: memo,
          paymentTo: data.paidTo || null,
          bankName: account.provider || account.name,
          status: VoucherStatus.POSTED,
          totalAmount: amount,
          createdById: adminUser.id,
          postedAt: new Date(),
          lines: {
            create: [
              {
                accountId: expenseHead.id,
                debit: amount,
                credit: 0,
                description: `Expense debit to ${expenseHead.name}`,
              },
              {
                accountId: assetHeadId,
                debit: 0,
                credit: amount,
                description: `Payment credit from ${account.name}`,
              },
            ],
          },
          glEntries: {
            create: [
              {
                accountId: expenseHead.id,
                entryDate: txDate,
                debit: amount,
                credit: 0,
                narration: memo,
              },
              {
                accountId: assetHeadId,
                financialAccountId: account.id,
                entryDate: txDate,
                debit: 0,
                credit: amount,
                narration: memo,
              },
            ],
          },
        },
      });
    });

    revalidatePath("/");
    return {
      success: true,
      message: `Expense of ৳${amount.toLocaleString()} paid from ${account.name} (Voucher ${voucherNo})`,
      voucherNo,
    };
  } catch (err: any) {
    console.error("Error executing direct money out:", err);
    return { success: false, message: userMessage(err, "Failed to post expense") };
  }
}

/**
 * Fetch Account Statement / Passbook Register
 */
export async function getAccountRegisterAction(accountId: string): Promise<{
  account: FinancialAccountDTO | null;
  transactions: RegisterTransactionRow[];
}> {
  await requireUser(ROLES.ANY);
  try {
    const acc = await prisma.financialAccount.findUnique({
      where: { id: accountId },
      include: { accountHead: true },
    });

    if (!acc) return { account: null, transactions: [] };

    // Fetch GL entries directly linked or via account head
    const entries = await prisma.generalLedgerEntry.findMany({
      where: {
        OR: [
          { financialAccountId: acc.id },
          ...(acc.accountHeadId ? [{ accountId: acc.accountHeadId }] : []),
        ],
      },
      include: {
        voucher: true,
      },
      orderBy: { entryDate: "asc" },
    });

    let running = Number(acc.openingBalance);
    const rows: RegisterTransactionRow[] = [];

    // Add opening balance row
    rows.push({
      id: `ob-${acc.id}`,
      date: new Date(acc.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      voucherNo: "OB-00",
      voucherType: "OPENING",
      narration: "Initial Opening Balance on record",
      moneyIn: Number(acc.openingBalance),
      moneyOut: 0,
      runningBalance: running,
      isReconciled: true,
      reconciledAt: acc.createdAt.toISOString(),
    });

    for (const e of entries) {
      const debit = Number(e.debit);
      const credit = Number(e.credit);
      // For Asset accounts: Debit is Money In, Credit is Money Out
      running = running + debit - credit;

      rows.push({
        id: e.id,
        date: new Date(e.entryDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        voucherNo: e.voucher?.voucherNo || "JV",
        voucherType: e.voucher?.voucherType || "JOURNAL",
        narration: e.narration || e.voucher?.narration || "General Ledger Movement",
        moneyIn: debit,
        moneyOut: credit,
        runningBalance: running,
        isReconciled: Boolean(e.reconciledAt),
        reconciledAt: e.reconciledAt ? e.reconciledAt.toISOString() : null,
      });
    }

    return {
      account: {
        id: acc.id,
        name: acc.name,
        type: acc.type as any,
        provider: acc.provider,
        accountNumber: acc.accountNumber,
        accountCode: acc.accountCode,
        bankIdentifierCode: acc.bankIdentifierCode,
        branchName: acc.branchName,
        isPrimary: acc.isPrimary,
        openingBalance: Number(acc.openingBalance),
        currentBalance: Number(acc.currentBalance),
        status: acc.status,
        notes: acc.notes,
        accountHeadId: acc.accountHeadId,
        accountHeadName: acc.accountHead?.name,
        updatedAt: acc.updatedAt.toISOString(),
      },
      transactions: rows.reverse(), // latest first for display
    };
  } catch (err) {
    console.error("Error fetching account register:", err);
    return { account: null, transactions: [] };
  }
}

/**
 * Toggle reconciliation checkmark on a GL entry
 */
export async function toggleReconcileEntryAction(
  entryId: string
): Promise<{ success: boolean; isReconciled: boolean }> {
  await requireUser(ROLES.FINANCE);
  try {
    const entry = await prisma.generalLedgerEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) return { success: false, isReconciled: false };

    const newReconciled = entry.reconciledAt ? null : new Date();
    await prisma.generalLedgerEntry.update({
      where: { id: entryId },
      data: { reconciledAt: newReconciled },
    });

    revalidatePath("/");
    return { success: true, isReconciled: Boolean(newReconciled) };
  } catch (err) {
    console.error("Error toggling reconcile entry:", err);
    return { success: false, isReconciled: false };
  }
}
