import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser, resetDb } from "../../../tests/helpers/db";

const session = vi.hoisted(() => ({ current: null as null | { id: string; role: string } }));
vi.mock("./auth.service", () => ({
  getSessionUser: async () => session.current,
}));

import { requireUser, ROLES } from "./guard";

describe("requireUser", () => {
  beforeEach(async () => {
    await resetDb();
    session.current = null;
  });

  it("rejects a request with no session", async () => {
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
  });

  it("rejects a session whose user no longer exists or is deactivated", async () => {
    session.current = { id: "00000000-0000-0000-0000-000000000000", role: "ADMIN" };
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });

    const inactive = await createUser("FINANCE", false);
    session.current = { id: inactive.id, role: "FINANCE" };
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("uses the role stored in the database, not the one in the cookie", async () => {
    const secretary = await createUser("SECRETARY");
    session.current = { id: secretary.id, role: "PRESIDENT" }; // forged/stale role claim
    await expect(requireUser(["PRESIDENT"])).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("allows a listed role and always allows ADMIN", async () => {
    const finance = await createUser("FINANCE");
    session.current = { id: finance.id, role: "FINANCE" };
    await expect(requireUser(["FINANCE"])).resolves.toMatchObject({ id: finance.id, role: "FINANCE" });

    const admin = await createUser("ADMIN");
    session.current = { id: admin.id, role: "ADMIN" };
    await expect(requireUser(["FINANCE"])).resolves.toMatchObject({ role: "ADMIN" });
  });

  it("any signed-in active user passes when no roles are given", async () => {
    const secretary = await createUser("SECRETARY");
    session.current = { id: secretary.id, role: "SECRETARY" };
    await expect(requireUser()).resolves.toMatchObject({ role: "SECRETARY" });
  });

  it("allows PRESIDENT, SECRETARY, FINANCE, and ADMIN for ROLES.AUDIT", async () => {
    for (const role of ["PRESIDENT", "SECRETARY", "FINANCE", "ADMIN"] as const) {
      const u = await createUser(role);
      session.current = { id: u.id, role };
      await expect(requireUser(ROLES.AUDIT)).resolves.toMatchObject({ role });
    }
  });

  it("allows PRESIDENT, FINANCE, and ADMIN for ROLES.FINANCE but refuses SECRETARY", async () => {
    for (const role of ["PRESIDENT", "FINANCE", "ADMIN"] as const) {
      const u = await createUser(role);
      session.current = { id: u.id, role };
      await expect(requireUser(ROLES.FINANCE)).resolves.toMatchObject({ role });
    }

    const sec = await createUser("SECRETARY");
    session.current = { id: sec.id, role: "SECRETARY" };
    await expect(requireUser(ROLES.FINANCE)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
