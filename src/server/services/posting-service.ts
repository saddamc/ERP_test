import { assertPeriodOpen } from "./period-guard";
import { VoucherFormData, VoucherLineItem } from "@/types/accounting";

const EPSILON = 0.001;

export interface PostingValidationResult {
  isValid: boolean;
  errors: string[];
  totalDebit: number;
  totalCredit: number;
}

/**
 * Validates double-entry accounting integrity adopted from ACCOUNTS posting-service:
 * 1. Must have at least 2 lines.
 * 2. Neither debit nor credit may be negative.
 * 3. Each line must have exactly ONE of debit or credit > 0.
 * 4. Sum of Debits must equal Sum of Credits within EPSILON tolerance.
 */
export function validateDoubleEntryInvariants(lines: VoucherLineItem[]): PostingValidationResult {
  const errors: string[] = [];

  if (!lines || lines.length < 2) {
    errors.push("A double-entry voucher must have at least two line entries.");
    return { isValid: false, errors, totalDebit: 0, totalCredit: 0 };
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const debit = Number(line.debit || 0);
    const credit = Number(line.credit || 0);

    if (debit < 0 || credit < 0) {
      errors.push(`Line #${i + 1} (${line.accountName}): Debit/Credit cannot be negative.`);
    }

    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      errors.push(
        `Line #${i + 1} (${line.accountName}): Each line must have exactly one of Debit or Credit greater than zero.`
      );
    }

    totalDebit += debit;
    totalCredit += credit;
  }

  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > EPSILON) {
    errors.push(
      `Voucher is out of balance by ৳${diff.toFixed(2)}. Total Debit (৳${totalDebit.toFixed(
        2
      )}) must equal Total Credit (৳${totalCredit.toFixed(2)}).`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalDebit,
    totalCredit,
  };
}

/**
 * Execute posting with Period Guard assertion & Invariant validation
 */
export async function executeVoucherPosting(voucher: VoucherFormData): Promise<{
  success: boolean;
  message: string;
  postedVoucher?: VoucherFormData;
  errors?: string[];
}> {
  // 1. Period Guard Check (ACCOUNTS standard)
  try {
    await assertPeriodOpen(voucher.voucherDate);
  } catch (err: any) {
    return {
      success: false,
      message: "Accounting Period Guard Rejection",
      errors: [err.message],
    };
  }

  // 2. Double-Entry Invariant Validation (ACCOUNTS standard)
  const validation = validateDoubleEntryInvariants(voucher.lines);
  if (!validation.isValid) {
    return {
      success: false,
      message: "Double-Entry Invariant Validation Failed",
      errors: validation.errors,
    };
  }

  // 3. Narration Requirement
  if (!voucher.narration || voucher.narration.trim().length === 0) {
    return {
      success: false,
      message: "Validation Error",
      errors: ["Voucher Narration / Memo is mandatory for financial audit trail."],
    };
  }

  const posted: VoucherFormData = {
    ...voucher,
    status: "POSTED",
    totalDebit: validation.totalDebit,
    totalCredit: validation.totalCredit,
    difference: 0,
  };

  return {
    success: true,
    message: `Voucher ${voucher.voucherNo} posted to General Ledger with verified double-entry invariants!`,
    postedVoucher: posted,
  };
}

/**
 * Create an equal-and-opposite Reversal Voucher for cancellations (ACCOUNTS standard)
 */
export function createReversalVoucher(
  originalVoucher: VoucherFormData,
  cancellationReason: string,
  reversalVoucherNo: string
): VoucherFormData {
  // Invert debits and credits
  const reversedLines: VoucherLineItem[] = originalVoucher.lines.map((line, idx) => ({
    id: `rev-line-${idx}-${Date.now()}`,
    accountId: line.accountId,
    accountCode: line.accountCode,
    accountName: line.accountName,
    description: `Reversal: ${line.description || "Offsetting entry"}`,
    debit: line.credit, // Debit becomes Credit
    credit: line.debit, // Credit becomes Debit
  }));

  return {
    id: `rev-vouch-${Date.now()}`,
    voucherNo: reversalVoucherNo,
    voucherType: originalVoucher.voucherType,
    voucherDate: new Date().toISOString().split("T")[0],
    bankCode: originalVoucher.bankCode,
    bankName: originalVoucher.bankName,
    paymentTo: originalVoucher.paymentTo,
    narration: `REVERSAL OF ${originalVoucher.voucherNo}: Reason: "${cancellationReason}"`,
    status: "POSTED",
    lines: reversedLines,
    totalDebit: originalVoucher.totalCredit,
    totalCredit: originalVoucher.totalDebit,
    difference: 0,
  };
}
