"use server";

import { prisma } from "@/server/db";
import { requireUser, ROLES } from "@/server/auth/guard";

export interface AuditRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string;
  userRole: string;
  oldValues: any;
  newValues: any;
  createdAt: string;
}

/**
 * Fetch system audit trail logs with optional filter
 */
export async function getAuditLogsAction(
  actionFilter?: string,
  limit: number = 100
): Promise<AuditRecord[]> {
  await requireUser(ROLES.AUDIT);
  try {
    const where: any = {};
    if (actionFilter && actionFilter !== "ALL") {
      where.action = actionFilter;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      userName: l.user ? l.user.fullName : "System Automated",
      userRole: l.user ? l.user.role : "SYSTEM",
      oldValues: l.oldValues,
      newValues: l.newValues,
      createdAt: l.createdAt.toISOString(),
    }));
  } catch (err: any) {
    console.error("Failed to query audit logs:", err);
    return [];
  }
}
