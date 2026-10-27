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
  getBillingCyclePreview,
  executeMonthlyBillingRun,
  getBillingHistory,
} from "./billing.actions";

async function signInAs(role: "PRESIDENT" | "SECRETARY" | "FINANCE" | "ADMIN") {
  const u = await createUser(role);
  session.current = { id: u.id, role };
  return u;
}

describe("monthly billing actions", () => {
  beforeEach(async () => {
    await resetDb();
    await seedAccounts();
    session.current = null;
  });

  it("getBillingCyclePreview returns safe result even with 0 members without throwing", async () => {
    const preview = await getBillingCyclePreview("2026-10");
    expect(preview.billingMonth).toBe("2026-10");
    expect(preview.totalEligibleMembers).toBe(0);
    expect(preview.totalBillingAmount).toBe(0);
    expect(preview.members).toEqual([]);
    expect(preview.alreadyBilled).toBe(false);
  });

  it("getBillingHistory returns array without throwing even when unauthenticated", async () => {
    const history = await getBillingHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });

  it("denies SECRETARY for executeMonthlyBillingRun gracefully without throwing", async () => {
    await signInAs("SECRETARY");
    const res = await executeMonthlyBillingRun("2026-10", "2026-10-25");
    expect(res.success).toBe(false);
    expect(res.message).toContain("Permission denied");
  });

  it("executeMonthlyBillingRun requires members before posting", async () => {
    await signInAs("FINANCE");
    const res = await executeMonthlyBillingRun("2026-10", "2026-10-25");
    expect(res.success).toBe(false);
    expect(res.message).toContain("No active members found");
  });

  it("executes billing cycle for active members and posts GL voucher", async () => {
    await signInAs("FINANCE");

    // Create a demo active member
    await prisma.member.create({
      data: {
        accountNo: "PM-001",
        prefix: "PM",
        firstName: "Tareq",
        lastName: "Ahmed",
        fullName: "Tareq Ahmed",
        status: "ACTIVE",
      },
    });

    const res = await executeMonthlyBillingRun("2026-10", "2026-10-25");
    expect(res.success).toBe(true);
    expect(res.voucherNo).toBe("J3-BILL-202610");
    expect(res.memberCount).toBe(1);
    expect(res.totalAmount).toBe(3000);

    // Verify duplicate billing block
    const dupRes = await executeMonthlyBillingRun("2026-10", "2026-10-25");
    expect(dupRes.success).toBe(false);
    expect(dupRes.message).toContain("already been processed");
  });
});
