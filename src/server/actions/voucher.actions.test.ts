import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser, resetDb, seedAccounts } from "../../../tests/helpers/db";
import { prisma } from "@/server/db";
import type { VoucherFormData } from "@/types/accounting";

const session = vi.hoisted(() => ({ current: null as null | { id: string; role: string } }));
vi.mock("@/server/auth/auth.service", () => ({
  getSessionUser: async () => session.current,
}));

import { cancelVoucherAction, postVoucherAction, saveVoucherToQueue } from "./voucher.actions";

function voucher(no: string, lines: [string, number, number][], date = new Date().toISOString().slice(0, 10)): VoucherFormData {
  return {
    voucherNo: no,
    voucherType: "CASH_PAYMENT",
    voucherDate: date,
    narration: "Salary advance",
    status: "DRAFT",
    lines: lines.map(([accountCode, debit, credit]) => ({ accountCode, accountName: accountCode, description: "", debit, credit })),
    totalDebit: 0,
    totalCredit: 0,
    difference: 0,
  };
}

async function signInAs(role: "PRESIDENT" | "SECRETARY" | "FINANCE" | "ADMIN") {
  const u = await createUser(role);
  session.current = { id: u.id, role };
  return u;
}

describe("voucher actions", () => {
  beforeEach(async () => {
    await resetDb();
    await seedAccounts();
    session.current = null;
  });

  it("refuses anonymous callers", async () => {
    await expect(postVoucherAction(voucher("P1-1", [["5101", 500, 0], ["1001", 0, 500]]))).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("refuses a Secretary (no posting rights)", async () => {
    await signInAs("SECRETARY");
    await expect(postVoucherAction(voucher("P1-1", [["5101", 500, 0], ["1001", 0, 500]]))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("posts a balanced voucher with the signed-in user as creator and one GL line per row", async () => {
    const user = await signInAs("FINANCE");
    const res = await postVoucherAction(voucher("P1-1", [["5101", 500, 0], ["1001", 0, 500]]));
    expect(res.success).toBe(true);

    const v = await prisma.voucher.findUniqueOrThrow({ where: { voucherNo: "P1-1" }, include: { glEntries: true } });
    expect(v.status).toBe("POSTED");
    expect(v.createdById).toBe(user.id);
    expect(v.glEntries).toHaveLength(2);
  });

  it("rejects an unbalanced voucher and saves nothing", async () => {
    await signInAs("FINANCE");
    const res = await postVoucherAction(voucher("P1-1", [["5101", 500, 0], ["1001", 0, 400]]));
    expect(res.success).toBe(false);
    expect(await prisma.voucher.count()).toBe(0);
    expect(await prisma.generalLedgerEntry.count()).toBe(0);
  });

  it("rejects an unknown account code instead of creating a new account", async () => {
    await signInAs("FINANCE");
    const res = await postVoucherAction(voucher("P1-1", [["9999", 500, 0], ["1001", 0, 500]]));
    expect(res.success).toBe(false);
    expect(res.message).toContain("9999");
    expect(await prisma.accountHead.count({ where: { code: "9999" } })).toBe(0);
    expect(await prisma.voucher.count()).toBe(0);
  });

  it("never re-posts (or rewrites) an already posted voucher", async () => {
    await signInAs("FINANCE");
    await postVoucherAction(voucher("P1-1", [["5101", 500, 0], ["1001", 0, 500]]));
    const again = await postVoucherAction(voucher("P1-1", [["5101", 900, 0], ["1001", 0, 900]]));
    expect(again.success).toBe(false);

    const lines = await prisma.generalLedgerEntry.findMany();
    expect(lines.map((l) => Number(l.debit) + Number(l.credit)).sort()).toEqual([500, 500]);
  });

  it("queues a voucher WITH its lines, then posts it", async () => {
    await signInAs("FINANCE");
    const q = await saveVoucherToQueue(voucher("P1-1", [["5101", 300, 0], ["1001", 0, 300]]));
    expect(q.success).toBe(true);
    expect(await prisma.voucherLine.count()).toBe(2);
    expect(await prisma.generalLedgerEntry.count()).toBe(0);

    const posted = await postVoucherAction(voucher("P1-1", [["5101", 300, 0], ["1001", 0, 300]]));
    expect(posted.success).toBe(true);
    expect(await prisma.voucherLine.count()).toBe(2);
    expect(await prisma.generalLedgerEntry.count()).toBe(2);
  });

  it("cancel posts a reversal and keeps the original ledger lines", async () => {
    await signInAs("FINANCE");
    await postVoucherAction(voucher("P1-1", [["5101", 500, 0], ["1001", 0, 500]]));

    const res = await cancelVoucherAction("P1-1", "Entered twice");
    expect(res.success).toBe(true);

    const original = await prisma.voucher.findUniqueOrThrow({ where: { voucherNo: "P1-1" }, include: { glEntries: true } });
    expect(original.status).toBe("CANCELLED");
    expect(original.glEntries).toHaveLength(2);

    const all = await prisma.generalLedgerEntry.findMany();
    expect(all).toHaveLength(4);
    const net = all.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    expect(net).toBe(0);
    const cash = await prisma.accountHead.findUniqueOrThrow({ where: { code: "1001" } });
    const cashNet = all.filter((l) => l.accountId === cash.id).reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    expect(cashNet).toBe(0);

    const second = await cancelVoucherAction("P1-1", "again");
    expect(second.success).toBe(false);
  });

  it("cancel requires a reason", async () => {
    await signInAs("FINANCE");
    await postVoucherAction(voucher("P1-1", [["5101", 500, 0], ["1001", 0, 500]]));
    const res = await cancelVoucherAction("P1-1", "  ");
    expect(res.success).toBe(false);
  });
});
