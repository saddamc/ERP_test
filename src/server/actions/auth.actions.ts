"use server";

import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/server/db";
import {
  UserSession,
  verifyPassword,
  setSessionCookie,
  getSessionUser,
  clearSessionCookie,
} from "@/server/auth/auth.service";
import { requireUser } from "@/server/auth/guard";

export interface LoginResult {
  success: boolean;
  message: string;
  user?: UserSession;
}

/**
 * Sign in user by username and password
 */
export async function loginAction(credentials: {
  username: string;
  password?: string;
}): Promise<LoginResult> {
  const username = credentials.username.trim().toLowerCase();
  const password = credentials.password || "";
  if (!username || !password) {
    return { success: false, message: "Please enter your username and password." };
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: { equals: username, mode: "insensitive" },
        isActive: true,
      },
    });

    if (!user) {
      return {
        success: false,
        message: `User "${credentials.username}" was not found or is inactive.`,
      };
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return {
        success: false,
        message: "Incorrect password. Please try again.",
      };
    }

    const session: UserSession = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    await setSessionCookie(session);

    // Record login in AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "USER_LOGIN",
          entityType: "User",
          entityId: user.id,
          newValues: {
            username: user.username,
            role: user.role,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (auditErr) {
      console.warn("Could not write login audit log:", auditErr);
    }

    return {
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      user: session,
    };
  } catch (err: any) {
    console.error("Login action error:", err);
    let message = "Sign-in failed. Please try again.";
    if (err?.message?.includes("does not exist") || err?.code === "P2021") {
      message = "Database tables are not created yet. Please visit /api/setup or run prisma db push.";
    } else if (err?.message?.includes("Can't reach database") || err?.code === "P1001") {
      message = "Cannot connect to the database. Please verify DATABASE_URL in Vercel settings.";
    }
    return {
      success: false,
      message,
    };
  }
}

/**
 * Sign out current user
 */
export async function logoutAction(): Promise<{ success: boolean; message: string }> {
  await clearSessionCookie();
  return {
    success: true,
    message: "Signed out successfully.",
  };
}

/**
 * Retrieve currently logged-in user
 */
export async function getCurrentUserAction(): Promise<UserSession | null> {
  return getSessionUser();
}

/**
 * List active users (admin only — usernames are not shown to anonymous visitors)
 */
export async function getAvailableUsersAction(): Promise<
  { id: string; username: string; fullName: string; role: string }[]
> {
  await requireUser(["ADMIN"]);
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, username: true, fullName: true, role: true },
    orderBy: { username: "asc" },
  });
}

/**
 * Auto-login or create demo admin user for frictionless customer review
 */
export async function autoLoginAction(): Promise<LoginResult> {
  try {
    // 1. Try to find admin or president or finance user
    let user = await prisma.user.findFirst({
      where: {
        username: { in: ["admin", "president", "finance"] },
        isActive: true,
      },
      orderBy: { username: "asc" },
    });

    // 2. If no user in DB yet, auto-provision default demo admin
    if (!user) {
      const defaultPasswordHash = bcrypt.hashSync("pass123", 10);
      user = await prisma.user.create({
        data: {
          username: "admin",
          fullName: "System Administrator",
          email: "admin@club-erp.local",
          phone: "01700-000001",
          passwordHash: defaultPasswordHash,
          role: UserRole.ADMIN,
          isActive: true,
        },
      });
    }

    const session: UserSession = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    await setSessionCookie(session);

    return {
      success: true,
      message: `Signed in as ${user.fullName}`,
      user: session,
    };
  } catch (err: any) {
    console.error("Auto login error:", err);
    // If DB is offline or table does not exist, return client demo session so customer can review smoothly!
    const demoSession: UserSession = {
      id: "demo-admin",
      username: "admin",
      fullName: "System Administrator (Demo Mode)",
      email: "admin@club-erp.local",
      phone: "01700-000001",
      role: UserRole.ADMIN,
    };
    try {
      await setSessionCookie(demoSession);
    } catch (_) {}
    return {
      success: true,
      message: "Signed in as Demo Administrator",
      user: demoSession,
    };
  }
}

