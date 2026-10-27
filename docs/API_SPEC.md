# API & Server Actions Specification

This document outlines the typed Server Actions (RPC) and REST endpoints for the **Elite Club ERP**.

---

## 1. Voucher Actions (`src/server/actions/voucher.actions.ts`)

### `createVoucherDraft(input: CreateVoucherInput): Promise<VoucherDto>`
Creates a new draft or queued voucher.
- **Access:** `FINANCE`, `ADMIN`
- **Input Parameters:**
  ```typescript
  interface CreateVoucherInput {
    voucherType: "JOURNAL" | "CASH_PAYMENT" | "CASH_RECEIVE" | "BANK_PAYMENT" | "BANK_RECEIVE" | "CONTRA";
    voucherDate: string; // ISO-8601
    bankCode?: string;
    bankName?: string;
    paymentTo?: string;
    narration: string;
    status: "DRAFT" | "QUEUED";
    lines: Array<{
      accountId: string;
      description?: string;
      debit: number;
      credit: number;
    }>;
  }
  ```
- **Returns:** Full voucher object with auto-generated sequential number (e.g. `J3-8`, `P1-4`).

### `postVoucher(voucherId: string): Promise<PostVoucherResult>`
Validates double-entry invariants, generates General Ledger entries, and locks the voucher.
- **Access:** `FINANCE`, `ADMIN`
- **Validation:** Throws `ValidationError` if $\sum \text{Debit} \neq \sum \text{Credit}$ or difference $\neq 0$.
- **Side Effects:**
  - Updates voucher status to `POSTED` with timestamp and user ID.
  - Inserts atomic rows into `GeneralLedgerEntry`.
  - If lines touch member accounts, updates `MemberLedgerEntry` and fires SMS alert.

### `cancelVoucher(voucherId: string, reason: string): Promise<CancelResult>`
Reverses a posted voucher in accordance with financial audit standards.
- **Access:** `FINANCE` (with supervisor approval), `ADMIN`
- **Side Effects:**
  - Marks original voucher status as `CANCELLED`.
  - Posts an equal-and-opposite offsetting reversal voucher.
  - Writes audit record with IP, user ID, timestamp, and explanation.

---

## 2. Member & Ledger Actions (`src/server/actions/member.actions.ts`)

### `createMember(input: CreateMemberInput): Promise<MemberDto>`
Onboards a new club member with complete family, spouse, and reference details.
- **Access:** `SECRETARY`, `ADMIN`
- **Input:**
  ```typescript
  interface CreateMemberInput {
    accountNo: string; // e.g. PM-030
    prefix?: string;    // e.g. PM
    title?: string;     // e.g. Mr. / Dr.
    firstName: string;
    middleName?: string;
    lastName: string;
    address?: string;
    phone?: string;
    email?: string;
    bloodGroup?: string;
    creditLimit: number;
    spouses?: Array<{
      spouseIndex: number;
      name: string;
      dob?: string;
      mobile?: string;
      bloodGroup?: string;
      anniversary?: string;
    }>;
    children?: Array<{
      childIndex: number;
      name: string;
      dob?: string;
      gender?: string;
    }>;
    references?: Array<{
      refMemberNo?: string;
      refName: string;
      phone?: string;
    }>;
  }
  ```

### `getMemberLedgerSummary(memberId: string): Promise<MemberBalancesDto>`
Fetches the current real-time balances for a member across all 3 sub-ledgers.
- **Returns:**
  ```typescript
  interface MemberBalancesDto {
    memberId: string;
    accountNo: string;
    fullName: string;
    subscriptionBalance: number;
    diningBalance: number;
    cardRoomBalance: number;
    totalOutstanding: number;
    lastPaymentDate?: string;
  }
  ```

### `recordMemberPayment(input: MemberPaymentInput): Promise<PaymentResult>`
Records a payment received from a member and allocates it across the 3 sub-ledgers.
- **Input:**
  ```typescript
  interface MemberPaymentInput {
    memberId: string;
    voucherType: "CASH_RECEIVE" | "BANK_RECEIVE";
    voucherDate: string;
    totalAmount: number;
    allocations: {
      subscriptionAmount: number;
      diningAmount: number;
      cardRoomAmount: number;
      advanceAmount?: number;
    };
    narration?: string;
  }
  ```
- **Side Effects:**
  - Posts `R1` or `R2` voucher.
  - Deducts member sub-ledger balances.
  - Queues SMS confirmation to member mobile number.

---

## 3. Financial Reporting Actions (`src/server/actions/report.actions.ts`)

### `getTrialBalance(params: DateFilterParams): Promise<TrialBalanceReport>`
Generates a multi-tier Trial Balance grouped by Account Categories (Assets, Liabilities, Equity, Income, Expenses).
- **Parameters:**
  ```typescript
  interface DateFilterParams {
    startDate?: string;
    endDate?: string;
    preset?: "TODAY" | "THIS_MONTH" | "PREVIOUS_MONTH" | "THIS_YEAR" | "CUSTOM";
  }
  ```
- **Returns:** Rows with `accountCode`, `accountName`, `openingDebit`, `openingCredit`, `periodDebit`, `periodCredit`, `closingDebit`, `closingCredit`, plus total balancing validation.

### `getSubCodeLedger(params: SubCodeFilterParams): Promise<SubCodeReport>`
Extracts detailed ledger transactions for a specific Expense or Income sub-code/category.
- **Parameters:**
  ```typescript
  interface SubCodeFilterParams extends DateFilterParams {
    accountCode: string; // e.g. "5201" for Food Purchases
  }
  ```
- **Returns:** Transaction items with `voucherNo`, `date`, `narration`, `debit`, `credit`, `runningBalance`.
