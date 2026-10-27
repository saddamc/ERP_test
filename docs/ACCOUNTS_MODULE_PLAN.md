# Club ERP — Accounts Module Plan (ported from the ACCOUNTS project)

> Written 2026-10-08. Target: `ERP-TEST/club-erp` (Next.js 16 + Prisma 6 + PostgreSQL, single club).
> Source of the design: `D:\Client Project\ACCOUNTS\server\src\common\{accounting,finance}` (Fastify, multi-company SaaS).
> Rule of the port: **copy the accounting rules and engine, not the SaaS.** Club ERP stays a single-club Next.js app.

## Status

| Phase | State | Notes |
|---|---|---|
| 0 — Safety net | ✅ Done 2026-10-08 | See "Phase 0 result" below |
| 1 — Ledger core | Next | Needs answer to D6 (wipe dev DB?) before the schema migration |
| 2–8 | Not started | |

**Phase 0 result**
- Login: removed the `pass123` / `admin123` any-user bypass, placeholder-hash acceptance and the hard-coded JWT secret fallback (`JWT_SECRET` now required). Demo persona buttons show only in development. User list is admin-only.
- `requireUser(ROLES.X)` added to 43 server actions (only login, logout and get-current-user stay open); creators are now the signed-in user (no more "first FINANCE user"). Page requires a real login (fake Finance persona removed).
- `voucher.actions.ts` + `member.actions.ts`: DB only (in-memory `Map` stores removed), failures return `success: false`, queued vouchers keep their lines, posted vouchers can't be re-posted or rewritten, unknown account codes are rejected, cancel = reversal in one transaction. Member charge/payment save voucher + member ledger + SMS log in one transaction; payments credit each paid sub-ledger (was always Subscription); new member can't overwrite another member's account number; search applies prefix AND text.
- SMS logs are saved as `PENDING` (no gateway is connected), not `SENT`.
- Period guard: President bypass removed (D3).
- Prisma baseline migration `0_init` (DB had no diff from schema); Vitest + `club_erp_test`; 19 tests green; `tsc`, `next build` pass.
- **Still open (by design, later phases):** dashboard, Trial Balance and Chart of Accounts fall back to hard-coded figures if the DB read fails, and the sub-code ledger always shows sample data (Phase 6). Money in/out/transfer, billing, dining, card room and collections still write GL directly and use stored `currentBalance` (Phase 2). Voucher numbers are still `count + 1` (Phase 1). Older files still have ESLint `any` errors.

---

## 1. Where we are today (what was found in the code)

The club-erp accounts screens look complete, but the ledger underneath is not safe yet. These are the problems the plan fixes, in order of risk:

| # | Problem | Where | Why it matters |
|---|---|---|---|
| 1 | **No server action checks who is logged in** (only `auth.actions.ts` does). Next.js server actions are public POST endpoints. | all of `src/server/actions/*` | Anyone who can reach the site can post vouchers, transfer money, run billing. |
| 2 | **Posting trusts the browser for the role.** `postVoucherAction(voucher, { userRole })` — the President "override" of a locked period comes from the client. | `voucher.actions.ts:210`, `period-guard.ts:46` | Anyone can post into a locked month by sending `userRole: "PRESIDENT"`. |
| 3 | **Database errors are swallowed and reported as success.** `catch (dbErr) { console.error(...) }` then `return { success: true }`; vouchers are kept in an in-memory `Map`. | `voucher.actions.ts:18, 197, 314` · `member.actions.ts:10` | The user sees "Posted" while nothing was saved; data disappears on restart. |
| 4 | **Re-posting deletes ledger history.** `voucherLine.deleteMany` + `generalLedgerEntry.deleteMany` on an already-posted voucher. | `voucher.actions.ts:274-275` | Posted books can be silently rewritten. |
| 5 | **GL is written from 8 places**, each with its own copy of the rules (voucher, finance, billing, payment, dining, card room, member, migration). `posting-service.ts` only *validates* in memory; it never writes. | `tx.generalLedgerEntry.create` in 8 action files | Dr = Cr, period lock and numbering are not guaranteed for most money flows. |
| 6 | **Period lock lives in a hard-coded array in memory.** | `period-guard.ts:16` | Locks vanish on restart; no audit of who reopened what. |
| 7 | **Voucher numbers can collide**: `count + 1` and `Date.now().slice(-6)`. | `finance.actions.ts:379, 523, 650`, `payment.actions.ts:85`, `dining/cardRoom` | Two cashiers at once → duplicate / failed vouchers. |
| 8 | **Bank/cash balance is a stored number** (`FinancialAccount.currentBalance` incremented/decremented) instead of being read from the ledger. | `finance.actions.ts:390-395, 533, 660` | Balance drifts from the GL; Trial Balance and Cash screen disagree. |
| 9 | **Unknown account codes are auto-created as EXPENSE** while posting. | `voucher.actions.ts:281` | A typo creates a new expense head and posts to it. |
| 10 | `createdById` = "first FINANCE user", not the real user. | `voucher.actions.ts:233` | Audit trail is wrong. |
| 11 | **Reports use sample data** (`sampleLedgerEntries`); Balance Sheet / I&E take no date filter. | `report.actions.ts:50, 322, 372` | Reports are not trustworthy. |
| 12 | Money is added with JS `Number`; member sub-ledger stores a `runningBalance`; no Prisma migrations (only `db push`); no tests. | various | Rounding errors, drift, no safe schema history. |

## 2. What we take from ACCOUNTS (and what we leave)

**Take (adapted to one club — drop `organizationId` everywhere):**

| ACCOUNTS file | Becomes in club-erp | Notes |
|---|---|---|
| `common/accounting/posting-service.ts` → `postJournal`, `postReversal`, `reversePostedJournalBySourceId`, `hasJournalForSource`, `postOpeningBalance`, `postManualJournal`, `assertManualJournalLedgers` | `src/server/accounting/posting-service.ts` | The **only** writer of ledger lines. |
| `common/finance/period-guard.ts` (`assertPeriodOpen`, `assertPeriodsOpen`, `getPeriodStatus`, `periodMonthOf`) + `ClosedPeriod` model | `src/server/accounting/period-guard.ts` | DB-backed OPEN / LOCKED / CLOSED per month, reopen needs a reason. |
| `common/finance/voucher.ts` (`generateVoucherNo`, advisory lock) | `src/server/accounting/voucher-numbering.ts` | Keep club codes J3/P1/R1/P2/R2/C3. |
| `common/finance/account-balance.ts` (`getAccountBalance(s)`, "the ONLY formula") | `src/server/accounting/account-balance.ts` | Cash/bank balance always from the ledger. |
| `common/accounting/journal-filters.ts` | `src/server/accounting/journal-filters.ts` | One "what counts in reports" filter. |
| `common/finance/party-balance.ts` | `src/server/accounting/member-balance.ts` | Member dues from GL lines tagged with `memberId`. |
| `common/finance/default-money-accounts.ts` (`systemKey`, `findSystemAccount`) | `src/server/accounting/system-accounts.ts` | Find built-in heads by key, never by name/code. |
| `common/finance/transaction-void.ts`, `account-lock.ts`, `cash-integrity.ts` | same folder | Void = reversal; lock rows before money-out; cash vs GL check. |
| `common/errors/app-error.ts` (`Errors.badRequest/notFound/conflict/forbidden` + codes) | `src/server/errors.ts` | Same error codes (`JOURNAL_UNBALANCED`, `PERIOD_CLOSED`, …). |
| `BankReconciliation` model + reconciliation rules | schema + `src/server/accounting/reconciliation.ts` | Manual reconciliation, no journal. |
| Report logic: trial balance, ledger, P&L, balance sheet, cash flow, cash book | `src/server/reports/*` | Rename P&L → **Income & Expenditure**, add **Receipts & Payments** (club format). |
| Screens: Chart of Accounts, Journal, Ledger, Trial Balance, Transaction Locking, Cash & Bank, Reconciliation | `src/components/accounts/*` | Re-built in club-erp's own UI style. |
| AGENTS.md §2 rules | new `club-erp/AGENTS.md` section | Same non-negotiable rules (see §3). |

**Leave behind:** multi-company tenancy (`org-scoped-client`, org URLs), plans/subscriptions/payments gateways, platform admin, sales/purchase/credit-note documents, inventory/stock, approvals engine (club uses its simpler Draft → Queued → Posted), VAT/TDS/Mushak, document template studio, Fastify/Swagger. These can be added later only if the club asks.

## 3. Rules for the club accounts module (copy into `club-erp/AGENTS.md`)

1. **One posting engine.** Every money effect goes through `src/server/accounting/posting-service.ts`. No action, report, import or component writes `GeneralLedgerEntry` directly.
2. **Dr = Cr** on every voucher; each line is debit XOR credit; at least 2 lines; amounts > 0, max 2 decimals.
3. **Every server action starts with `requireUser(roles)`** — role comes from the session cookie, never from the request body.
4. **Validate every id the browser sends** (account, member, financial account, voucher) → `NOT_FOUND` if missing/archived. Never create an account head while posting.
5. **Never delete or rewrite posted history.** Cancel = reversal voucher; edit of a posted voucher = reverse + new voucher. Heads with history are archived, not deleted.
6. **Locked/closed months are untouchable** — the period guard runs on the old date and the new date of every change; reopening needs a reason and is audited. No role bypass in code.
7. **Balances are derived, never stored**: cash/bank, member dues, trial balance all come from posted ledger lines.
8. **Reports never post** and never use sample data.
9. **Errors are real errors**: a failed DB write returns failure; no in-memory fallback stores.
10. **Schema change = Prisma migration** (`prisma migrate dev`), never `db push` after the baseline.
11. Money math uses `Prisma.Decimal` (or integer paisa) — never JS float sums.

## 4. Target data model

Changes to `prisma/schema.prisma` (single club, so no `organizationId`):

```prisma
model AccountHead {                 // = ACCOUNTS LedgerAccount
  id            String   @id @default(uuid())
  code          String   @unique
  name          String
  category      AccountCategory          // ASSET/LIABILITY/EQUITY/INCOME/EXPENSE
  normalBalance NormalBalance            // NEW: DEBIT / CREDIT (from category)
  isGroup       Boolean  @default(false) // NEW: group heads (e.g. "5100 Administrative") can't be posted to
  isSystem      Boolean  @default(false) // NEW
  systemKey     String?  @unique         // NEW: CASH_MAIN, MEMBER_SUBSCRIPTION_AR, MEMBER_ADVANCE, RETAINED_SURPLUS …
  status        HeadStatus @default(ACTIVE) // NEW: ACTIVE / ARCHIVED
  parentId      String?
  // relations unchanged
}

model Voucher {                     // header of one journal entry
  // existing fields +
  sourceType     VoucherSource   // NEW: MANUAL, MONEY_IN, MONEY_OUT, TRANSFER, MEMBER_CHARGE, MEMBER_PAYMENT,
                                 //      BILLING_RUN, DINING, CARD_ROOM, OPENING_BALANCE, REVERSAL, YEAR_CLOSE, IMPORT
  sourceId       String?         // NEW: e.g. billing month "2026-10", dining order id
  reversalOfId   String?  @unique // NEW: points at the voucher this one reverses
  createdById    String          // real session user
  postedById     String?         // NEW
  @@unique([sourceType, sourceId]) // idempotency: billing for a month can only post once
}
// VoucherStatus: DRAFT, QUEUED, POSTED, REVERSED  (CANCELLED renamed → REVERSED; row kept)

model VoucherLine { ... }           // editable draft lines (DRAFT/QUEUED only)

model GeneralLedgerEntry {          // = ACCOUNTS JournalLine — written ONLY by the engine, never updated/deleted
  // existing fields +
  memberId    String?               // NEW: member sub-ledger tag (replaces MemberLedgerEntry as source of truth)
  subLedger   SubLedgerType?        // NEW: SUBSCRIPTION / DINING / CARD_ROOM / ADVANCE
  // reconciledAt moves to the reconciliation link below
  bankReconciliationId String?      // NEW
}

model FinancialAccount {
  // REMOVE currentBalance (derived now)
  accountHeadId String @unique      // now REQUIRED, 1:1 with an ASSET head
  systemKey     String? @unique     // NEW: MAIN_CASH, PETTY_CASH (built-in, can't be archived)
}

model ClosedPeriod {                // from ACCOUNTS
  id String @id @default(uuid())
  periodMonth String @unique        // "2026-09"
  status FiscalPeriodStatus @default(CLOSED) // OPEN / LOCKED / CLOSED
  closedAt DateTime @default(now()); closedById String?
  reopenReason String?; reopenedAt DateTime?; reopenedById String?
}

model BankReconciliation {          // from ACCOUNTS
  id String @id @default(uuid())
  financialAccountId String
  statementDate DateTime
  statementBalance Decimal @db.Decimal(14, 2)
  notes String?; createdById String; createdAt DateTime @default(now())
}

model FiscalYear {                  // NEW (not built in ACCOUNTS either)
  id String @id @default(uuid())
  name String @unique               // "2026-27"
  startDate DateTime; endDate DateTime
  status String @default("OPEN")    // OPEN / CLOSED
  closingVoucherId String?
}

model ClubSetting { key String @id; value Json }  // fiscal year start month, voucher number padding, club name/logo for print
```

`MemberLedgerEntry` and `PaymentAllocation` stay during the move (Phase 3), then `MemberLedgerEntry` becomes read-only history and is dropped once statements read from GL.

## 5. Phased build plan

Each phase ends working, tested and shippable. Do them in order — later phases depend on the engine.

### Phase 0 — Safety net (2–3 days)
- `prisma migrate diff` → **baseline migration** from the current DB; from now on only `prisma migrate dev`.
- Add **Vitest** + a separate test database (`club_erp_test`) + `tests/helpers/db.ts` (truncate between tests).
- `src/server/auth/guard.ts`: `requireUser(allowedRoles)` reading the session cookie; add it as line 1 of **every** server action. Role matrix:

  | Action | PRESIDENT | SECRETARY | FINANCE | ADMIN |
  |---|---|---|---|---|
  | View reports / ledgers | ✓ | ✓ (read) | ✓ | ✓ |
  | Draft / queue vouchers, money in/out, transfers, collections | – | – | ✓ | ✓ |
  | Post queued vouchers | ✓ | – | ✓ | ✓ |
  | Reverse a posted voucher | ✓ | – | ✓ (with reason) | ✓ |
  | Lock / close / reopen periods, close fiscal year | ✓ | – | – | ✓ |
  | Chart of accounts edit | – | – | ✓ | ✓ |

- `src/server/errors.ts` (`AppError`, `Errors.*`, codes) and `src/lib/money.ts` (Decimal add/sum/round, `formatBDT`).
- Remove every `catch { console.error } return success` pattern and the in-memory `voucherStore` / `memberStore` maps.

**Done when:** every action rejects anonymous calls (test), migrations run clean on a fresh DB.

### Phase 1 — Ledger core (port the engine) (4–5 days)
- Schema migration from §4 (AccountHead fields, Voucher source/reversal, GL `memberId/subLedger`, `ClosedPeriod`, `FinancialAccount.accountHeadId` required). **Show the SQL before applying.**
- Data fix-up script (in scratch, not repo): set `normalBalance`/`systemKey` on seeded heads; link each `FinancialAccount` to its head; mark group heads.
- New `src/server/accounting/`:
  - `posting-service.ts` — `postVoucher(tx, voucherId, user)` (DRAFT/QUEUED → POSTED: validate lines, assert period open, assert heads active & not groups, assign number, write GL lines, audit) · `postJournal(tx, meta, lines)` for system flows · `postReversal(tx, voucherId, reason, user)` · `hasPostedVoucherForSource`.
  - `period-guard.ts` — DB version of ACCOUNTS guard, UTC-month rule kept identical (documented Dhaka caveat).
  - `voucher-numbering.ts` — `pg_advisory_xact_lock` per prefix, `J3-00001` style (see decision D2), must run inside `$transaction`.
  - `account-balance.ts`, `journal-filters.ts`, `system-accounts.ts`.
- Unit tests (port ACCOUNTS cases): unbalanced → `JOURNAL_UNBALANCED`; both/neither side → `JOURNAL_LINE_INVALID`; one line → `JOURNAL_TOO_FEW_LINES`; locked month → `PERIOD_CLOSED`; reversal of reversed → conflict; concurrent numbering gives unique numbers; group/archived head rejected.

**Done when:** engine tests green; nothing outside `accounting/` imports `generalLedgerEntry.create` (add a lint/grep check).

### Phase 2 — Rewire every money flow onto the engine (4–5 days)
One flow at a time, each with a test:

| Flow | File | Posting (Dr / Cr) | sourceType / sourceId |
|---|---|---|---|
| Voucher desk J3/P1/R1/P2/R2/C3 | `voucher.actions.ts` | as entered | MANUAL / voucher id |
| Money In | `finance.actions.ts directMoneyIn` | Dr cash/bank head · Cr income head | MONEY_IN |
| Money Out | `directMoneyOut` | Dr expense head · Cr cash/bank head (lock account, check derived balance) | MONEY_OUT |
| Transfer (C3) | `transferFunds` | Dr to-account · Cr from-account | TRANSFER |
| New cash/bank account opening balance | `createFinancialAccount` | Dr account · Cr Opening Balance Equity (system head) | OPENING_BALANCE / account id |
| Monthly subscription billing | `billing.actions.ts` | Dr 1121 (per member line, `memberId`) · Cr 4001 | BILLING_RUN / `2026-10` (unique → no double billing) |
| Dining bill | `dining.actions.ts` | Dr 1122 (`memberId`) · Cr 4101/4102 | DINING / order id |
| Card room chit | `cardRoom.actions.ts` | Dr 1123 (`memberId`) · Cr 4201/4202 | CARD_ROOM / chit id |
| Member charge | `member.actions.ts addMemberCharge` | Dr 112x · Cr income | MEMBER_CHARGE |
| Member payment / collection | `member.actions.ts`, `payment.actions.ts` | Dr cash/bank · Cr 1121/1122/1123 per allocation, surplus Cr 2001 Member Advance | MEMBER_PAYMENT |
| Legacy import | `migration.actions.ts` | one OPENING_BALANCE voucher per import batch, dated the go-live date | IMPORT / batch id |
| Cancel anything | all | `postReversal` (new voucher, original → REVERSED) | REVERSAL |

- Delete `currentBalance` reads/writes; balances come from `getAccountBalances`.
- Delete the `deleteMany` re-post path; delete auto-create-head path.

**Done when:** a seeded day of activity gives Trial Balance Dr = Cr, cash screen = GL, and every flow's test passes.

### Phase 3 — Member sub-ledgers on the GL (3 days)
- Member balance per sub-ledger = Σ(Dr − Cr) of GL lines with that `memberId` on 1121 / 1122 / 1123, minus advance on 2001 (port `party-balance.ts` → `member-balance.ts`, batch version for lists).
- Payment allocation: manual split or FIFO (oldest charge first per ledger), surplus → advance; advance auto-applied on next charge (posted as Dr 2001 / Cr 112x).
- Member statement + print slip read from GL (opening, charges, payments, running balance computed on read).
- One-off reconciliation: compare old `MemberLedgerEntry` totals to GL totals per member; then freeze the old table.
- SMS hooks fire **after** commit, from the posted voucher (never before posting).

**Done when:** sum of all member balances on 1121/1122/1123 = those heads' balances in Trial Balance (test + integrity check).

### Phase 4 — Chart of Accounts, Journal & Period Locking screens (3–4 days)
- **Chart of Accounts**: tree by category → group → head; add / rename / archive (archive only at zero balance, system heads locked); code uniqueness; group heads not postable.
- **Journal / Voucher list**: filter by type, date, status, account, member; open voucher → lines, who created/posted, reversal link; Reverse button (reason required).
- **Transaction Locking** (port ACCOUNTS page): month grid with OPEN / LOCKED / CLOSED; lock/close (President/Admin); reopen needs reason → audit log.
- **Manual J3 guard** (port `assertManualJournalLedgers`): manual journals can't touch cash/bank heads (use P/R/C vouchers) and can touch member receivable heads only with a member selected.

### Phase 5 — Cash & Bank (3 days)
- Accounts list with **derived** balance, type (Cash / Bank / bKash-Nagad), primary account, built-in Main Cash & Petty Cash.
- Account register: running balance, filters, export.
- Money In / Money Out / Transfer modals rewired (already exist: `DirectMoneyInModal`, `DirectMoneyOutModal`, `QuickTransferModal`).
- **Bank reconciliation** (port ACCOUNTS rules): statement date + balance, tick cleared lines, difference must be exactly 0 to save, can't reconcile into a locked month, undo only the latest.
- Integrity check (port `cash-integrity.ts`): register total vs GL head balance, shown to Admin.

### Phase 6 — Reports from the ledger only (4–5 days)
All take `from / to` (inclusive end date, `endOfUtcDay`), read only POSTED + REVERSED pairs via `journal-filters.ts`, export to PDF and Excel, print with club header.
1. **Trial Balance** — opening, period Dr/Cr, closing; by head or by group; must show Dr = Cr.
2. **General Ledger / Account Ledger** — any head, running balance, drill into voucher.
3. **Sub-code ledger** — by expense/income group (`5100 Administrative` …) — replace sample data.
4. **Income & Expenditure Statement** — current vs previous period, surplus/deficit.
5. **Balance Sheet** — as of date; current-year surplus shown under Accumulated Fund until year close.
6. **Receipts & Payments Account** — club/society format (cash-basis summary of cash & bank movements by head) — new, required for club AGM.
7. **Cash Book / Bank Book** and **Day Book**.
8. **Member Dues & Aging** — per sub-ledger, 0–30 / 31–60 / 61–90 / 90+ days.
- Remove `sampleLedgerEntries` and every hard-coded figure from `report.actions.ts` and the dashboard.

### Phase 7 — Fiscal year, opening balances & go-live (3 days)
- Settings: fiscal year start month (Bangladesh clubs usually **July–June**; decision D1).
- **Opening balances screen**: enter legacy desktop closing TB once → one OPENING_BALANCE voucher (Dr = Cr enforced, difference to Opening Balance Equity flagged).
- **Year-end close** (not built in ACCOUNTS either — new): check all months of the year are CLOSED → post YEAR_CLOSE voucher moving every Income/Expense balance to 3002 Retained Surplus → mark FiscalYear CLOSED. Reopen = reverse that voucher (President, reason).
- Go-live runbook: freeze legacy system → import members → import opening TB → verify TB matches legacy → lock all months before go-live.

### Phase 8 — Hardening & docs (2–3 days)
- Integrity screen for Admin: TB balanced, cash register = GL, member sub-ledgers = control heads, no GL line on group/archived heads, no voucher number gaps per prefix.
- Audit log on every post / reverse / lock / reopen / head change (who, when, before/after).
- E2E smoke test of a full month: billing run → dining → collections → expenses → lock → reports.
- Update `README.md`, `docs/ACCOUNTING_STANDARDS.md`, `docs/DATABASE.md`; add the §3 rules and a helper map (like ACCOUNTS §4) to `club-erp/AGENTS.md`.

**Rough total: 28–35 working days** for one developer.

## 6. Target folder layout

```
club-erp/src/server/
  accounting/            posting-service.ts · period-guard.ts · voucher-numbering.ts · account-balance.ts
                         member-balance.ts · journal-filters.ts · system-accounts.ts · reconciliation.ts
                         cash-integrity.ts · fiscal-year.ts   (+ *.test.ts next to each)
  reports/               trial-balance.ts · ledger.ts · income-expenditure.ts · balance-sheet.ts
                         receipts-payments.ts · cash-book.ts · member-aging.ts
  auth/guard.ts          requireUser(roles)
  errors.ts
  actions/*.actions.ts   thin: requireUser → validate (zod) → $transaction → accounting/* → return
src/components/accounts/ ChartOfAccounts · JournalList · VoucherDetail · TransactionLocking
                         CashBankRegisterDesk · Reconciliation · OpeningBalances · YearClose
src/components/reports/  one component per report (split ReportDesk.tsx, 797 lines)
```

Add `zod` for action input validation (ACCOUNTS uses it). Split `VoucherDesk.tsx` (1053 lines) and `ReportDesk.tsx` into section files the same way ACCOUNTS splits its big forms.

## 7. Decisions needed from you

| # | Question | My recommendation |
|---|---|---|
| D1 | Fiscal year | July–June (Bangladesh standard), configurable |
| D2 | Voucher number format | Keep club codes, pad: `P1-00007` (sortable, matches ACCOUNTS); old numbers kept as-is |
| D3 | Can President bypass a locked month? | No bypass — President **reopens** the month with a reason (audited), posts, then re-locks |
| D4 | Maker-checker: must Finance's voucher be posted by someone else? | Optional setting, default off; Queued → Post by President/Admin when on |
| D5 | VAT on dining bills | Out of scope for now; add later as its own phase if the club is VAT-registered |
| D6 | Existing test data in `club_erp` DB | Wipe and re-seed after the Phase 1 migration (no real data yet) — confirm |

## 8. Definition of done (every phase)

Balanced vouchers only through the engine · every action behind `requireUser` · `vitest` green · `tsc --noEmit` clean · `next build` passes · migration SQL reviewed · docs updated · no in-memory stores, no sample data, no swallowed errors.
