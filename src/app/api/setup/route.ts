import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import bcrypt from "bcryptjs";
import {
  UserRole,
  AccountCategory,
  FinancialAccountType,
} from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const defaultPasswordHash = bcrypt.hashSync("pass123", 10);

    // 1. Seed or Upsert System Users
    const users = [
      {
        username: "admin",
        fullName: "System Administrator",
        email: "admin@club-erp.local",
        phone: "01700-000001",
        passwordHash: defaultPasswordHash,
        role: UserRole.ADMIN,
      },
      {
        username: "president",
        fullName: "Maj. Gen. (Retd.) M. A. Matin (President)",
        email: "president@club.org.bd",
        phone: "01700-000002",
        passwordHash: defaultPasswordHash,
        role: UserRole.PRESIDENT,
      },
      {
        username: "secretary",
        fullName: "Commodore (Retd.) K. R. Alam (Club Secretary)",
        email: "secretary@club.org.bd",
        phone: "01700-000003",
        passwordHash: defaultPasswordHash,
        role: UserRole.SECRETARY,
      },
      {
        username: "finance",
        fullName: "Mohammad Arifur Rahman, FCA (Finance Director)",
        email: "finance@club.org.bd",
        phone: "01700-000004",
        passwordHash: defaultPasswordHash,
        role: UserRole.FINANCE,
      },
    ];

    const seededUsers: string[] = [];
    for (const u of users) {
      await prisma.user.upsert({
        where: { username: u.username },
        update: { passwordHash: u.passwordHash, isActive: true },
        create: {
          username: u.username,
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          passwordHash: u.passwordHash,
          role: u.role,
          isActive: true,
        },
      });
      seededUsers.push(u.username);
    }

    // 2. Ensure Essential Chart of Accounts
    const coreCOA = [
      { code: "1001", name: "Main Cash in Hand Desk", category: AccountCategory.ASSET },
      { code: "1002", name: "Secretary Office Petty Cash", category: AccountCategory.ASSET },
      { code: "1101", name: "Sonali Bank - Main Operational A/C", category: AccountCategory.ASSET },
      { code: "1102", name: "Dhaka Bank - Club Development Fund", category: AccountCategory.ASSET },
      { code: "1103", name: "City Bank - Credit Card Settlement A/C", category: AccountCategory.ASSET },
      { code: "1121", name: "Member Subscription Receivable", category: AccountCategory.ASSET },
      { code: "1122", name: "Member Dining Room Receivable", category: AccountCategory.ASSET },
      { code: "2001", name: "Member Advance Deposits Payable", category: AccountCategory.LIABILITY },
      { code: "2002", name: "General Accounts Payable (Suppliers)", category: AccountCategory.LIABILITY },
      { code: "3001", name: "Club General Capital Fund", category: AccountCategory.EQUITY },
      { code: "4001", name: "Monthly / Annual Subscription Income", category: AccountCategory.INCOME },
      { code: "4101", name: "Dining Room & Restaurant Food Sales", category: AccountCategory.INCOME },
      { code: "5101", name: "Staff Salaries, Wages & Allowances", category: AccountCategory.EXPENSE },
      { code: "5201", name: "Food & Kitchen Grocery Purchases", category: AccountCategory.EXPENSE },
      { code: "5401", name: "Electricity Bills & Generator Diesel", category: AccountCategory.EXPENSE },
    ];

    for (const acc of coreCOA) {
      await prisma.accountHead.upsert({
        where: { code: acc.code },
        update: { name: acc.name, category: acc.category },
        create: {
          code: acc.code,
          name: acc.name,
          category: acc.category,
          isControlHead: false,
        },
      });
    }

    // 3. Ensure Financial Accounts
    const financialAccounts = [
      {
        name: "Main Cash in Hand Desk",
        type: FinancialAccountType.CASH,
        provider: "Club Reception Vault",
        accountNumber: "CASH-MAIN-01",
        accountCode: "1001",
        branchName: "URCL Club House",
        isPrimary: true,
        openingBalance: 450000,
        currentBalance: 450000,
        status: "ACTIVE",
      },
      {
        name: "Secretary Office Petty Cash",
        type: FinancialAccountType.CASH,
        provider: "Secretary Desk",
        accountNumber: "PETTY-SEC-02",
        accountCode: "1002",
        branchName: "URCL Admin Building",
        isPrimary: false,
        openingBalance: 50000,
        currentBalance: 50000,
        status: "ACTIVE",
      },
      {
        name: "Sonali Bank - Main Operational A/C",
        type: FinancialAccountType.BANK,
        provider: "Sonali Bank PLC",
        accountNumber: "0201402001923",
        accountCode: "1101",
        bankIdentifierCode: "SBINBDDH01",
        branchName: "Uttara Model Town Branch, Dhaka",
        isPrimary: true,
        openingBalance: 3250000,
        currentBalance: 3250000,
        status: "ACTIVE",
      },
    ];

    for (const fa of financialAccounts) {
      const existing = await prisma.financialAccount.findFirst({
        where: { accountNumber: fa.accountNumber },
      });
      if (!existing) {
        await prisma.financialAccount.create({ data: fa });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database initialized successfully!",
      users: seededUsers,
      defaultPassword: "pass123",
      nextStep: "You can now go to the homepage and sign in.",
    });
  } catch (error: any) {
    console.error("Setup route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to initialize database",
        hint:
          error?.message?.includes("does not exist")
            ? "The database tables have not been created yet. Make sure to run 'npx prisma db push' with your live DATABASE_URL."
            : "Check your DATABASE_URL in Vercel environment variables.",
      },
      { status: 500 }
    );
  }
}
