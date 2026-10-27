import { prisma } from "@/server/db";

/** Empty every application table (test database only — guarded in tests/setup.ts). */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

/** Minimal chart of accounts used by the tests. */
export async function seedAccounts() {
  const heads: [string, string, "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE"][] = [
    ["1001", "Main Cash in Hand Desk", "ASSET"],
    ["1101", "Sonali Bank - Main Operational A/C", "ASSET"],
    ["1121", "Member Subscription Receivable", "ASSET"],
    ["1122", "Member Dining Room Receivable", "ASSET"],
    ["1123", "Member Card Room Receivable", "ASSET"],
    ["2001", "Member Advance Deposits Payable", "LIABILITY"],
    ["4001", "Monthly / Annual Subscription Income", "INCOME"],
    ["4101", "Dining Room & Restaurant Food Sales", "INCOME"],
    ["4201", "Card Room Daily Table Charges", "INCOME"],
    ["5101", "Staff Salaries, Wages & Allowances", "EXPENSE"],
  ];
  for (const [code, name, category] of heads) {
    await prisma.accountHead.create({ data: { code, name, category } });
  }
}

export async function createUser(role: "PRESIDENT" | "SECRETARY" | "FINANCE" | "ADMIN", isActive = true) {
  return prisma.user.create({
    data: { username: `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`, fullName: `Test ${role}`, role, passwordHash: "x", isActive },
  });
}
