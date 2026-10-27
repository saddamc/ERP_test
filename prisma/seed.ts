import { PrismaClient, UserRole, MemberStatus, AccountCategory, VoucherType, VoucherStatus, SubLedgerType, FinancialAccountType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Club ERP PostgreSQL Database Seeding...");

  // Generate real bcrypt hash for "pass123"
  const defaultPasswordHash = bcrypt.hashSync("pass123", 10);

  // 1. Seed System Users (Default Roles)
  console.log("  -> Seeding System Users with bcrypt passwords...");
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      username: "admin",
      fullName: "System Administrator",
      email: "admin@club-erp.local",
      phone: "01700-000001",
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const presidentUser = await prisma.user.upsert({
    where: { username: "president" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      username: "president",
      fullName: "Maj. Gen. (Retd.) M. A. Matin (President)",
      email: "president@club.org.bd",
      phone: "01700-000002",
      passwordHash: defaultPasswordHash,
      role: UserRole.PRESIDENT,
      isActive: true,
    },
  });

  const secretaryUser = await prisma.user.upsert({
    where: { username: "secretary" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      username: "secretary",
      fullName: "Commodore (Retd.) K. R. Alam (Club Secretary)",
      email: "secretary@club.org.bd",
      phone: "01700-000003",
      role: UserRole.SECRETARY,
      passwordHash: defaultPasswordHash,
      isActive: true,
    },
  });

  const financeUser = await prisma.user.upsert({
    where: { username: "finance" },
    update: { passwordHash: defaultPasswordHash },
    create: {
      username: "finance",
      fullName: "Mohammad Arifur Rahman, FCA (Finance Director)",
      email: "finance@club.org.bd",
      phone: "01700-000004",
      role: UserRole.FINANCE,
      passwordHash: defaultPasswordHash,
      isActive: true,
    },
  });

  // 2. Seed Chart of Accounts
  console.log("  -> Seeding Chart of Accounts (COA)...");
  const chartOfAccounts = [
    // 1000 ASSETS - CASH & BANK
    { code: "1001", name: "Main Cash in Hand Desk", category: AccountCategory.ASSET, isControlHead: false },
    { code: "1002", name: "Secretary Office Petty Cash", category: AccountCategory.ASSET, isControlHead: false },
    { code: "1101", name: "Sonali Bank - Main Operational A/C", category: AccountCategory.ASSET, isControlHead: false },
    { code: "1102", name: "Dhaka Bank - Club Development Fund", category: AccountCategory.ASSET, isControlHead: false },
    { code: "1103", name: "City Bank - Credit Card Settlement A/C", category: AccountCategory.ASSET, isControlHead: false },

    // 1120 MEMBER RECEIVABLES (CONTROL HEADS)
    { code: "1121", name: "Member Subscription Receivable", category: AccountCategory.ASSET, isControlHead: false },
    { code: "1122", name: "Member Dining Room Receivable", category: AccountCategory.ASSET, isControlHead: false },
    { code: "1123", name: "Member Card Room Receivable", category: AccountCategory.ASSET, isControlHead: false },
    { code: "1124", name: "Guest & Miscellaneous Receivables", category: AccountCategory.ASSET, isControlHead: false },

    // 2000 LIABILITIES
    { code: "2001", name: "Member Advance Deposits Payable", category: AccountCategory.LIABILITY, isControlHead: false },
    { code: "2002", name: "General Accounts Payable (Suppliers)", category: AccountCategory.LIABILITY, isControlHead: false },
    { code: "2003", name: "Accrued Utility Bills (DESCO / Titas)", category: AccountCategory.LIABILITY, isControlHead: false },
    { code: "2004", name: "Staff Provident Fund Payable", category: AccountCategory.LIABILITY, isControlHead: false },

    // 3000 EQUITY / CAPITAL FUND
    { code: "3001", name: "Club General Capital Fund", category: AccountCategory.EQUITY, isControlHead: false },
    { code: "3002", name: "Retained Surplus / (Deficit)", category: AccountCategory.EQUITY, isControlHead: false },

    // 4000 REVENUE / INCOME
    { code: "4001", name: "Monthly / Annual Subscription Income", category: AccountCategory.INCOME, isControlHead: false },
    { code: "4002", name: "New Member Admission & Registration Fee", category: AccountCategory.INCOME, isControlHead: false },
    { code: "4101", name: "Dining Room & Restaurant Food Sales", category: AccountCategory.INCOME, isControlHead: false },
    { code: "4102", name: "Beverage & Soft Drinks Sales", category: AccountCategory.INCOME, isControlHead: false },
    { code: "4201", name: "Card Room Daily Table Charges", category: AccountCategory.INCOME, isControlHead: false },
    { code: "4202", name: "Card Tournament Registration Fees", category: AccountCategory.INCOME, isControlHead: false },
    { code: "4301", name: "Club Community Hall Rent Income", category: AccountCategory.INCOME, isControlHead: false },

    // 5000 EXPENSES (SUB-CODES & CATEGORIES)
    { code: "5101", name: "Staff Salaries, Wages & Allowances", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5102", name: "Printing, Stationery & Ledger Forms", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5103", name: "Telephone, SMS & Internet Charges", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5104", name: "Audit & Professional Legal Fees", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5201", name: "Food & Kitchen Grocery Purchases", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5202", name: "Beverage & Bakery Purchases", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5203", name: "Kitchen Gas, Fuel & Cooking Utensils", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5301", name: "Playing Cards & Card Room Consumables", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5302", name: "Billiard & Table Maintenance", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5401", name: "Electricity Bills & Generator Diesel", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5402", name: "Building Repair, Painting & Plumbing", category: AccountCategory.EXPENSE, isControlHead: false },
    { code: "5403", name: "Security Guard & Cleaning Services", category: AccountCategory.EXPENSE, isControlHead: false },
  ];

  const createdAccounts: Record<string, string> = {};
  for (const acc of chartOfAccounts) {
    const record = await prisma.accountHead.upsert({
      where: { code: acc.code },
      update: { name: acc.name, category: acc.category },
      create: {
        code: acc.code,
        name: acc.name,
        category: acc.category,
        isControlHead: acc.isControlHead,
      },
    });
    createdAccounts[acc.code] = record.id;
  }

  // 2.1 Seed Financial Accounts (Cash, Bank & Mobile Wallets - ACCOUNTS architecture)
  console.log("  -> Seeding Financial Accounts (Cash, Bank & Mobile Wallets)...");
  const financialAccountsData = [
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
      notes: "Main front desk reception cash drawer for counter receipts and small payments",
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
      notes: "Admin secretary imprest petty cash drawer",
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
      notes: "Primary club operational account for high-value payments, cheques and vendor billing",
    },
    {
      name: "Dhaka Bank - Club Development Fund",
      type: FinancialAccountType.BANK,
      provider: "Dhaka Bank Ltd.",
      accountNumber: "0104100088921",
      accountCode: "1102",
      bankIdentifierCode: "DHBLBDDH02",
      branchName: "Sector-03 Branch, Uttara",
      isPrimary: false,
      openingBalance: 5400000,
      currentBalance: 5400000,
      status: "ACTIVE",
      notes: "Dedicated fund for infrastructure expansion, gym renovation & development",
    },
    {
      name: "City Bank - Credit Card Settlement A/C",
      type: FinancialAccountType.BANK,
      provider: "City Bank PLC",
      accountNumber: "3101889201001",
      accountCode: "1103",
      bankIdentifierCode: "CIBLBDDH03",
      branchName: "Airport Road Branch",
      isPrimary: false,
      openingBalance: 1200000,
      currentBalance: 1200000,
      status: "ACTIVE",
      notes: "Merchant POS settlement account for club POS card swiping",
    },
    {
      name: "bKash Merchant Desk",
      type: FinancialAccountType.MOBILE_WALLET,
      provider: "bKash Limited",
      accountNumber: "01711-000099",
      accountCode: "1001",
      branchName: "Uttara Merchant Gateway",
      isPrimary: false,
      openingBalance: 185000,
      currentBalance: 185000,
      status: "ACTIVE",
      notes: "Digital MFS wallet for quick QR code dining and member subscription receipts",
    },
  ];

  for (const fa of financialAccountsData) {
    const headId = createdAccounts[fa.accountCode];
    const existing = await prisma.financialAccount.findFirst({
      where: { name: fa.name },
    });
    if (existing) {
      await prisma.financialAccount.update({
        where: { id: existing.id },
        data: {
          currentBalance: fa.currentBalance,
          accountHeadId: headId || null,
        },
      });
    } else {
      await prisma.financialAccount.create({
        data: {
          name: fa.name,
          type: fa.type,
          provider: fa.provider,
          accountNumber: fa.accountNumber,
          accountCode: fa.accountCode,
          bankIdentifierCode: fa.bankIdentifierCode,
          branchName: fa.branchName,
          isPrimary: fa.isPrimary,
          openingBalance: fa.openingBalance,
          currentBalance: fa.currentBalance,
          status: fa.status,
          notes: fa.notes,
          accountHeadId: headId || null,
        },
      });
    }
  }

  // 3. Seed Members & Families
  console.log("  -> Seeding Members & Sub-Ledger records...");
  const memberData = [
    {
      accountNo: "PM-029",
      prefix: "PM",
      title: "Mr.",
      firstName: "Md. Shadiqul",
      middleName: "",
      lastName: "Mostuk",
      fullName: "Md. Shadiqul Mostuk",
      address: "House #14, Road #07, Sector-03, Uttara, Dhaka",
      city: "Dhaka",
      phone: "01711-234567",
      email: "shadiqul.mostuk@gmail.com",
      bloodGroup: "B+",
      profession: "Managing Director, Mostuk Group",
      creditLimit: 50000.0,
      status: MemberStatus.ACTIVE,
      subBalances: { subscription: 2000.0, dining: 1250.0, cardRoom: 0.0 },
      spouses: [
        {
          spouseIndex: 1,
          name: "Nasima Mostuk",
          dob: new Date("1978-04-12"),
          mobile: "01711-987654",
          bloodGroup: "A+",
          anniversary: new Date("2002-11-20"),
          email: "nasima.m@gmail.com",
        },
      ],
      children: [
        { childIndex: 1, name: "Saad Mostuk", dob: new Date("2004-06-15"), gender: "Male" },
        { childIndex: 2, name: "Samia Mostuk", dob: new Date("2008-09-24"), gender: "Female" },
      ],
      references: [
        { refMemberNo: "PM-010", refName: "Maj. Gen. (Retd.) M. A. Matin", phone: "01819-112233" },
        { refMemberNo: "PM-015", refName: "Prof. Dr. Shamsul Alam", phone: "01912-334455" },
      ],
      nominees: [
        { name: "Nasima Mostuk", relation: "Wife", phone: "01711-987654", sharePercent: 100.0 },
      ],
    },
    {
      accountNo: "PM-030",
      prefix: "PM",
      title: "Mr.",
      firstName: "Mahbub",
      middleName: "",
      lastName: "Hasan",
      fullName: "Mahbub Hasan",
      address: "Shop #5,7 Ground Floor, Sector #11, Uttara, Dhaka",
      city: "Dhaka",
      phone: "01819-456789",
      email: "mahbub.hasan@yahoo.com",
      bloodGroup: "O+",
      profession: "Businessman / Importer",
      creditLimit: 75000.0,
      status: MemberStatus.ACTIVE,
      subBalances: { subscription: 4000.0, dining: 3500.0, cardRoom: 1500.0 },
      spouses: [
        {
          spouseIndex: 1,
          name: "Farhana Hasan",
          dob: new Date("1982-08-10"),
          mobile: "01819-876543",
          bloodGroup: "O+",
          anniversary: new Date("2005-02-14"),
        },
      ],
      children: [
        { childIndex: 1, name: "Rayan Hasan", dob: new Date("2007-03-12"), gender: "Male" },
      ],
      references: [
        { refMemberNo: "PM-005", refName: "Alhaj M. A. Wadud", phone: "01711-556677" },
      ],
      nominees: [
        { name: "Farhana Hasan", relation: "Wife", phone: "01819-876543", sharePercent: 100.0 },
      ],
    },
    {
      accountNo: "LM-104",
      prefix: "LM",
      title: "Engr.",
      firstName: "Tanvir",
      middleName: "Ahmed",
      lastName: "Chowdhury",
      fullName: "Engr. Tanvir Ahmed Chowdhury",
      address: "Plot #18, Road #04, Banani DOHS, Dhaka",
      city: "Dhaka",
      phone: "01713-112233",
      email: "tanvir.engr@northsouth.edu",
      bloodGroup: "A+",
      profession: "Chief Architect, ArcDesign Studio",
      creditLimit: 100000.0,
      status: MemberStatus.ACTIVE,
      subBalances: { subscription: 0.0, dining: 4200.0, cardRoom: 0.0 },
      spouses: [],
      children: [],
      references: [],
      nominees: [],
    },
    {
      accountNo: "PM-045",
      prefix: "PM",
      title: "Dr.",
      firstName: "Nusrat",
      middleName: "",
      lastName: "Jahan",
      fullName: "Dr. Nusrat Jahan",
      address: "Apartment 5B, Concord Tower, Gulshan-2, Dhaka",
      city: "Dhaka",
      phone: "01911-334455",
      email: "dr.nusrat@squarehospital.com",
      bloodGroup: "B+",
      profession: "Associate Professor, Cardiology",
      creditLimit: 60000.0,
      status: MemberStatus.ACTIVE,
      subBalances: { subscription: 2000.0, dining: 0.0, cardRoom: 0.0 },
      spouses: [],
      children: [],
      references: [],
      nominees: [],
    },
  ];

  for (const m of memberData) {
    const existing = await prisma.member.findUnique({ where: { accountNo: m.accountNo } });
    if (!existing) {
      const created = await prisma.member.create({
        data: {
          accountNo: m.accountNo,
          prefix: m.prefix,
          title: m.title,
          firstName: m.firstName,
          middleName: m.middleName,
          lastName: m.lastName,
          fullName: m.fullName,
          address: m.address,
          city: m.city,
          phone: m.phone,
          email: m.email,
          bloodGroup: m.bloodGroup,
          profession: m.profession,
          creditLimit: m.creditLimit,
          status: m.status,
          spouses: {
            create: m.spouses.map((s) => ({
              spouseIndex: s.spouseIndex,
              name: s.name,
              dob: s.dob,
              mobile: s.mobile,
              bloodGroup: s.bloodGroup,
              anniversary: s.anniversary,
            })),
          },
          children: {
            create: m.children.map((c) => ({
              childIndex: c.childIndex,
              name: c.name,
              dob: c.dob,
              gender: c.gender,
            })),
          },
          references: {
            create: m.references.map((r) => ({
              refMemberNo: r.refMemberNo,
              refName: r.refName,
              phone: r.phone,
            })),
          },
          nominees: {
            create: m.nominees.map((n) => ({
              name: n.name,
              relation: n.relation,
              phone: n.phone,
              sharePercent: n.sharePercent,
            })),
          },
        },
      });

      // Create opening sub-ledger entries
      if (m.subBalances.subscription > 0) {
        await prisma.memberLedgerEntry.create({
          data: {
            memberId: created.id,
            ledgerType: SubLedgerType.SUBSCRIPTION,
            entryDate: new Date("2026-10-01"),
            description: "Opening Subscription Dues Balance",
            debit: m.subBalances.subscription,
            credit: 0,
            runningBalance: m.subBalances.subscription,
          },
        });
      }
      if (m.subBalances.dining > 0) {
        await prisma.memberLedgerEntry.create({
          data: {
            memberId: created.id,
            ledgerType: SubLedgerType.DINING,
            entryDate: new Date("2026-10-01"),
            description: "Opening Dining Dues Balance",
            debit: m.subBalances.dining,
            credit: 0,
            runningBalance: m.subBalances.dining,
          },
        });
      }
      if (m.subBalances.cardRoom > 0) {
        await prisma.memberLedgerEntry.create({
          data: {
            memberId: created.id,
            ledgerType: SubLedgerType.CARD_ROOM,
            entryDate: new Date("2026-10-01"),
            description: "Opening Card Room Dues Balance",
            debit: m.subBalances.cardRoom,
            credit: 0,
            runningBalance: m.subBalances.cardRoom,
          },
        });
      }
    }
  }

  // 4. Seed Initial Double-Entry Vouchers
  console.log("  -> Seeding Double-Entry Vouchers & GL records...");
  const sampleVouchers = [
    {
      voucherNo: "J3-1",
      voucherType: VoucherType.JOURNAL,
      voucherDate: new Date("2026-10-01"),
      narration: "October 2026 monthly club subscription billings",
      status: VoucherStatus.POSTED,
      totalAmount: 1250000.0,
      lines: [
        { accountCode: "1121", description: "Monthly Subscription Dues Receivable", debit: 1250000.0, credit: 0.0 },
        { accountCode: "4001", description: "Monthly Subscription Revenue Accrual", debit: 0.0, credit: 1250000.0 },
      ],
    },
    {
      voucherNo: "P1-1",
      voucherType: VoucherType.CASH_PAYMENT,
      voucherDate: new Date("2026-10-02"),
      paymentTo: "Dhaka Kitchen Suppliers Ltd",
      narration: "Fresh grocery, meat and vegetable purchases for restaurant kitchen",
      status: VoucherStatus.POSTED,
      totalAmount: 45000.0,
      lines: [
        { accountCode: "5201", description: "Kitchen Groceries Purchases", debit: 45000.0, credit: 0.0 },
        { accountCode: "1001", description: "Payment from Main Cash Desk", debit: 0.0, credit: 45000.0 },
      ],
    },
    {
      voucherNo: "R1-1",
      voucherType: VoucherType.CASH_RECEIVE,
      voucherDate: new Date("2026-10-03"),
      narration: "Daily dining room cash collections deposited to cash desk",
      status: VoucherStatus.POSTED,
      totalAmount: 92400.0,
      lines: [
        { accountCode: "1001", description: "Receipt into Main Cash Desk", debit: 92400.0, credit: 0.0 },
        { accountCode: "4101", description: "Daily Restaurant Food Sales", debit: 0.0, credit: 92400.0 },
      ],
    },
    {
      voucherNo: "P2-1",
      voucherType: VoucherType.BANK_PAYMENT,
      voucherDate: new Date("2026-10-04"),
      bankCode: "1101",
      bankName: "Sonali Bank - Main Operational A/C",
      paymentTo: "DESCO Electricity Board",
      narration: "Cheque #402911 for September 2026 club electrical utility bill",
      status: VoucherStatus.POSTED,
      totalAmount: 115000.0,
      lines: [
        { accountCode: "5401", description: "Electricity & Substation Utility Expenses", debit: 115000.0, credit: 0.0 },
        { accountCode: "1101", description: "Payment from Sonali Bank A/C", debit: 0.0, credit: 115000.0 },
      ],
    },
    {
      voucherNo: "C3-1",
      voucherType: VoucherType.CONTRA,
      voucherDate: new Date("2026-10-05"),
      narration: "Cash deposit from Main Cash Desk into Sonali Bank Operational A/C",
      status: VoucherStatus.POSTED,
      totalAmount: 200000.0,
      lines: [
        { accountCode: "1101", description: "Sonali Bank Main A/C Deposit", debit: 200000.0, credit: 0.0 },
        { accountCode: "1001", description: "Cash withdrawn from Cash Desk", debit: 0.0, credit: 200000.0 },
      ],
    },
  ];

  for (const v of sampleVouchers) {
    const existingV = await prisma.voucher.findUnique({ where: { voucherNo: v.voucherNo } });
    if (!existingV) {
      const createdV = await prisma.voucher.create({
        data: {
          voucherNo: v.voucherNo,
          voucherType: v.voucherType,
          voucherDate: v.voucherDate,
          bankCode: v.bankCode,
          bankName: v.bankName,
          paymentTo: v.paymentTo,
          narration: v.narration,
          status: v.status,
          totalAmount: v.totalAmount,
          createdById: financeUser.id,
          postedAt: v.status === VoucherStatus.POSTED ? v.voucherDate : null,
          lines: {
            create: v.lines.map((l) => ({
              accountId: createdAccounts[l.accountCode],
              description: l.description,
              debit: l.debit,
              credit: l.credit,
            })),
          },
        },
      });

      // Create General Ledger entries for posted vouchers
      if (v.status === VoucherStatus.POSTED) {
        for (const l of v.lines) {
          await prisma.generalLedgerEntry.create({
            data: {
              voucherId: createdV.id,
              accountId: createdAccounts[l.accountCode],
              entryDate: v.voucherDate,
              debit: l.debit,
              credit: l.credit,
              narration: l.description,
            },
          });
        }
      }
    }
  }

  console.log("✅ PostgreSQL Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
