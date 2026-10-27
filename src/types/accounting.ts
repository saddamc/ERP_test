export type VoucherTypeCode =
  | "JOURNAL"
  | "CASH_PAYMENT"
  | "CASH_RECEIVE"
  | "BANK_PAYMENT"
  | "BANK_RECEIVE"
  | "CONTRA";

export type VoucherStatusCode = "DRAFT" | "QUEUED" | "POSTED" | "CANCELLED";

export interface VoucherLineItem {
  id?: string;
  accountId?: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface VoucherFormData {
  id?: string;
  voucherNo: string;
  voucherType: VoucherTypeCode;
  voucherDate: string;
  bankCode?: string;
  bankName?: string;
  paymentTo?: string;
  narration: string;
  status: VoucherStatusCode;
  lines: VoucherLineItem[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
}

export interface AccountHeadItem {
  id: string;
  code: string;
  name: string;
  category: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  isControlHead: boolean;
  parentId?: string | null;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  category: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}
