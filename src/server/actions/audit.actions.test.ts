import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser, resetDb } from "../../../tests/helpers/db";
import { prisma } from "@/server/db";

const session = vi.hoisted(() => ({ current: null as null | { id: string; role: string } }));
vi.mock("@/server/auth/auth.service", () => ({
  getSessionUser: async () => session.current,
}));

import { getAuditLogsAction } from "./audit.actions";

async function signInAs(role: "PRESIDENT" | "SECRETARY" | "FINANCE" | "ADMIN") {
  const u = await createUser(role);
  session.current = { id: u.id, role };
  return u;
}

describe("audit actions", () => {
  beforeEach(async () => {
    await resetDb();
    session.current = null;
  });

  it("refuses anonymous callers", async () => {
    await expect(getAuditLogsAction()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("allows SECRETARY to read audit logs", async () => {
    const user = await signInAs("SECRETARY");
    await prisma.auditLog.create({
      data: {
        action: "MEMBER_SAVED",
        entityType: "Member",
        entityId: "PM-001",
        userId: user.id,
      },
    });

    const logs = await getAuditLogsAction("ALL");
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("MEMBER_SAVED");
    expect(logs[0].userRole).toBe("SECRETARY");
  });

  it("allows PRESIDENT, FINANCE, and ADMIN to read audit logs", async () => {
    for (const role of ["PRESIDENT", "FINANCE", "ADMIN"] as const) {
      const user = await signInAs(role);
      await prisma.auditLog.create({
        data: {
          action: "VOUCHER_POSTED",
          entityType: "Voucher",
          entityId: "V-100",
          userId: user.id,
        },
      });

      const logs = await getAuditLogsAction();
      expect(logs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("filters audit logs by action filter", async () => {
    const user = await signInAs("FINANCE");
    await prisma.auditLog.create({
      data: {
        action: "VOUCHER_POSTED",
        entityType: "Voucher",
        entityId: "V-1",
        userId: user.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "VOUCHER_REVERSED",
        entityType: "Voucher",
        entityId: "V-2",
        userId: user.id,
      },
    });

    const postedLogs = await getAuditLogsAction("VOUCHER_POSTED");
    expect(postedLogs).toHaveLength(1);
    expect(postedLogs[0].entityId).toBe("V-1");

    const allLogs = await getAuditLogsAction("ALL");
    expect(allLogs).toHaveLength(2);
  });
});
