export interface CategoryFeeConfig {
  [prefix: string]: number;
}

export const DEFAULT_CATEGORY_FEES: CategoryFeeConfig = {
  PM: 3000, // Permanent Member
  LM: 1000, // Life Member
  AM: 2500, // Associate Member
  CM: 5000, // Corporate Member
  DEFAULT: 3000,
};

export interface BillingMemberPreview {
  memberId: string;
  accountNo: string;
  prefix: string;
  fullName: string;
  phone: string | null;
  category: string;
  currentSubDues: number;
  monthlyFee: number;
  projectedSubDues: number;
}

export interface BillingPreviewResult {
  billingMonth: string;
  alreadyBilled: boolean;
  existingVoucherNo?: string;
  totalEligibleMembers: number;
  totalBillingAmount: number;
  members: BillingMemberPreview[];
}

export interface BillingRunResult {
  success: boolean;
  message: string;
  voucherNo?: string;
  billingMonth?: string;
  memberCount?: number;
  totalAmount?: number;
  error?: string;
}

export interface BillingHistoryItem {
  id: string;
  billingMonth: string;
  voucherNo: string;
  memberCount: number;
  totalAmount: number;
  executedAt: string;
  executedBy: string;
}
