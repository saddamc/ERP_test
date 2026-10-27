import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser, resetDb, seedAccounts } from "../../../tests/helpers/db";
import { prisma } from "@/server/db";

const session = vi.hoisted(() => ({ current: null as null | { id: string; role: string } }));
vi.mock("@/server/auth/auth.service", () => ({
  getSessionUser: async () => session.current,
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  directMoneyInAction,
  directMoneyOutAction,
  transferFundsAction,
  createFinancialAccountAction,
} from "./finance.actions";

async function signInAs(role: "PRESIDENT" | "SECRETARY" | "FINANCE" | "ADMIN") {
  const u = await createUser(role);
  session.current = { id: u.id, role };
  return u;
}

describe("finance actions permissions and execution", () => {
  beforeEach(async () => {
    await resetDb();
    await seedAccounts();
    session.current = null;
  });

  it("returns failure instead of throwing unhandled exception when unauthenticated", async () => {
    const res = await directMoneyInAction({
      financialAccountId: "non-existent",
      incomeAccountHeadId: "non-existent",
      amount: 500,
    });
    expect(res.success).toBe(false);
    expect(res.message).toBe("Please sign in to continue.");
  });

  it("denies SECRETARY for directMoneyInAction gracefully without throwing", async () => {
    await signInAs("SECRETARY");
    const res = await directMoneyInAction({
      financialAccountId: "dummy",
      incomeAccountHeadId: "dummy",
      amount: 1000,
    });
    expect(res.success).toBe(false);
    expect(res.message).toBe("You do not have permission to do this.");
  });

  it("allows PRESIDENT and FINANCE to execute directMoneyInAction", async () => {
    // Setup cash drawer and income head
    const cashHead = await prisma.accountHead.findUniqueOrThrow({ where: { code: "1001" } });
    const incomeHead = await prisma.accountHead.findUniqueOrThrow({ where: { code: "4001" } });

    const account = await prisma.financialAccount.create({
      data: {
        name: "Main Cash Counter",
        type: "CASH",
        accountHeadId: cashHead.id,
        currentBalance: 0,
        openingBalance: 0,
      },
    });

    // Test as PRESIDENT
    await signInAs("PRESIDENT");
    const resPres = await directMoneyInAction({
      financialAccountId: account.id,
      incomeAccountHeadId: incomeHead.id,
      amount: 2500,
      receivedFrom: "Mr. Tester",
      narration: "Donation received",
    });
    expect(resPres.success).toBe(true);
    expect(resPres.voucherNo).toMatch(/^R1-/);

    // Test as FINANCE
    await signInAs("FINANCE");
    const resFin = await directMoneyInAction({
      financialAccountId: account.id,
      incomeAccountHeadId: incomeHead.id,
      amount: 1500,
      receivedFrom: "Guest User",
    });
    expect(resFin.success).toBe(true);

    const updatedAccount = await prisma.financialAccount.findUniqueOrThrow({ where: { id: account.id } });
    expect(Number(updatedAccount.currentBalance)).toBe(4000);
  });
});
