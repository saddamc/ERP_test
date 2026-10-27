import { UserRole } from "@prisma/client";
import { prisma } from "@/server/db";
import { getSessionUser, UserSession } from "./auth.service";
import { Errors } from "@/server/errors";

/**
 * Server actions are public POST endpoints, so EVERY action must call this first.
 * The role always comes from the database row of the signed-in user — never from the request —
 * and a deactivated user loses access immediately even if their cookie is still valid.
 * ADMIN passes every role check.
 */
export async function requireUser(allowedRoles?: readonly UserRole[]): Promise<UserSession> {
  const session = await getSessionUser();
  if (!session) throw Errors.unauthenticated();

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.isActive) throw Errors.unauthenticated("Your session has ended. Please sign in again.");

  if (allowedRoles && user.role !== "ADMIN" && !allowedRoles.includes(user.role)) {
    throw Errors.forbidden();
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
  };
}

/** Role groups used by the actions (ADMIN is always allowed on top of these). */
export const ROLES = {
  /** Anyone signed in may read. */
  ANY: undefined,
  /** Day-to-day money entry: vouchers, money in/out, collections, POS, billing. */
  FINANCE: ["FINANCE", "PRESIDENT"],
  /** Posting and reversing vouchers. */
  POST: ["FINANCE", "PRESIDENT"],
  /** Member master data. */
  MEMBERS: ["SECRETARY", "FINANCE"],
  /** Audit trail. */
  AUDIT: ["PRESIDENT", "SECRETARY", "FINANCE"],
  /** Bulk data import. */
  IMPORT: ["FINANCE"],
} as const satisfies Record<string, readonly UserRole[] | undefined>;
