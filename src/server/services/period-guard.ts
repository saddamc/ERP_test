/**
 * Accounting Period Guard (Adopted from ACCOUNTS enterprise architecture)
 * Prevents inadvertent voucher postings, modifications, or backdated entries
 * into closed or locked accounting periods without explicit administrative override.
 */

export interface AccountingPeriod {
  year: number;
  month: number; // 1 to 12
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
}

// In-memory period registry (default: all periods open except historical fiscal year 2025)
const periodsStore: AccountingPeriod[] = [
  { year: 2025, month: 12, isLocked: true, lockedAt: "2026-01-01", lockedBy: "President Office" },
  { year: 2026, month: 8, isLocked: true, lockedAt: "2026-09-05", lockedBy: "President Office" },
  { year: 2026, month: 9, isLocked: true, lockedAt: "2026-10-02", lockedBy: "President Office" },
  { year: 2026, month: 10, isLocked: false }, // Current Active Period
  { year: 2026, month: 11, isLocked: false },
  { year: 2026, month: 12, isLocked: false },
];

/**
 * Asserts that the given transaction date falls inside an open accounting period.
 * Throws an error if the period has been closed/locked.
 */
export async function assertPeriodOpen(dateInput: Date | string): Promise<void> {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid voucher date provided.");
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  const found = periodsStore.find((p) => p.year === year && p.month === month);

  // No role bypass: a locked month must be reopened (audited) before anyone can post into it.
  if (found && found.isLocked) {
    throw new Error(
      `Accounting Period ${month.toString().padStart(2, "0")}/${year} is LOCKED. Backdated transactions into closed periods are restricted by financial governance. Contact the President's office for authorized period reopening.`
    );
  }
}

/**
 * Fetch all periods status
 */
export async function getAccountingPeriods(): Promise<AccountingPeriod[]> {
  return [...periodsStore];
}

/**
 * Lock or unlock an accounting period (President / Executive action)
 */
export async function setPeriodLockStatus(
  year: number,
  month: number,
  isLocked: boolean,
  actor: string
): Promise<{ success: boolean; message: string }> {
  let period = periodsStore.find((p) => p.year === year && p.month === month);
  if (!period) {
    period = { year, month, isLocked };
    periodsStore.push(period);
  } else {
    period.isLocked = isLocked;
  }

  if (isLocked) {
    period.lockedAt = new Date().toISOString();
    period.lockedBy = actor;
  }

  return {
    success: true,
    message: `Accounting Period ${month}/${year} has been ${isLocked ? "LOCKED" : "REOPENED"} by ${actor}.`,
  };
}
