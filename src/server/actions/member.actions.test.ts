import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser, resetDb, seedAccounts } from "../../../tests/helpers/db";
import { prisma } from "@/server/db";
import type { MemberProfile } from "@/types/member";

const session = vi.hoisted(() => ({ current: null as null | { id: string; role: string } }));
vi.mock("@/server/auth/auth.service", () => ({
  getSessionUser: async () => session.current,
}));

import { addMemberChargeAction, recordMemberPaymentAction, saveMemberAction } from "./member.actions";

async function signInAs(role: "PRESIDENT" | "SECRETARY" | "FINANCE" | "ADMIN") {
  const u = await createUser(role);
  session.current = { id: u.id, role };
  return u;
}

function draft(accountNo: string, firstName = "Karim"): MemberProfile {
  return {
    id: `mem-${accountNo}`,
    accountNo,
    prefix: "PM",
    firstName,
    lastName: "Rahman",
    fullName: "",
    creditLimit: 0,
    status: "ACTIVE",
    subscriptionBalance: 0,
    diningBalance: 0,
    cardRoomBalance: 0,
    totalOutstanding: 0,
    spouses: [],
    children: [],
    references: [],
    nominees: [],
  };
}

describe("member actions", () => {
  beforeEach(async () => {
    await resetDb();
    await seedAccounts();
    session.current = null;
  });

  it("creates a new member and refuses to overwrite another member's account number", async () => {
    await signInAs("SECRETARY");
    const first = await saveMemberAction(draft("PM-001", "Karim"));
    expect(first.success).toBe(true);
    expect(first.member.id).not.toBe("mem-PM-001"); // real database id

    const clash = await saveMemberAction(draft("PM-001", "Someone Else"));
    expect(clash.success).toBe(false);
    const stored = await prisma.member.findUniqueOrThrow({ where: { accountNo: "PM-001" } });
    expect(stored.firstName).toBe("Karim");
  });

  it("a Secretary cannot post member charges", async () => {
    await signInAs("SECRETARY");
    const { member } = await saveMemberAction(draft("PM-002"));
    await expect(addMemberChargeAction({ memberId: member.id, ledgerType: "DINING", amount: 100, description: "Dinner" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("charge and payment post vouchers and credit each paid sub-ledger separately", async () => {
    await signInAs("FINANCE");
    const { member } = await saveMemberAction(draft("PM-003"));

    const c1 = await addMemberChargeAction({ memberId: member.id, ledgerType: "SUBSCRIPTION", amount: 1000, description: "Oct fee" });
    const c2 = await addMemberChargeAction({ memberId: member.id, ledgerType: "DINING", amount: 400, description: "Dinner" });
    expect(c1.success && c2.success).toBe(true);
    expect(c2.member?.totalOutstanding).toBe(1400);

    const pay = await recordMemberPaymentAction({
      memberId: member.id,
      totalPaid: 700,
      paymentMode: "CASH",
      allocations: { subscriptionAmount: 300, diningAmount: 400, cardRoomAmount: 0, advanceAmount: 0 },
    });
    expect(pay.success).toBe(true);
    expect(pay.member?.subscriptionBalance).toBe(700);
    expect(pay.member?.diningBalance).toBe(0);

    const gl = await prisma.generalLedgerEntry.findMany();
    const dr = gl.reduce((s, l) => s + Number(l.debit), 0);
    const cr = gl.reduce((s, l) => s + Number(l.credit), 0);
    expect(dr).toBe(cr);

    const sms = await prisma.notificationLog.findMany();
    expect(sms.every((s) => s.status === "PENDING")).toBe(true);
  });

  it("a failed charge leaves nothing behind (one transaction)", async () => {
    await signInAs("FINANCE");
    const { member } = await saveMemberAction(draft("PM-004"));
    await prisma.accountHead.delete({ where: { code: "4101" } }); // income head missing → posting must fail

    const res = await addMemberChargeAction({ memberId: member.id, ledgerType: "DINING", amount: 250, description: "Dinner" });
    expect(res.success).toBe(false);
    expect(await prisma.voucher.count()).toBe(0);
    expect(await prisma.memberLedgerEntry.count()).toBe(0);
    expect(await prisma.notificationLog.count()).toBe(0);
  });

  it("rejects allocations that do not add up", async () => {
    await signInAs("FINANCE");
    const { member } = await saveMemberAction(draft("PM-005"));
    const res = await recordMemberPaymentAction({
      memberId: member.id,
      totalPaid: 500,
      paymentMode: "CASH",
      allocations: { subscriptionAmount: 100, diningAmount: 0, cardRoomAmount: 0, advanceAmount: 0 },
    });
    expect(res.success).toBe(false);
  });
});
