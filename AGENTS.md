<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Club ERP — project rules

Accounts work follows `docs/ACCOUNTS_MODULE_PLAN.md` (ported from `../../ACCOUNTS`). Rules that already apply:

1. **Every server action starts with `requireUser(ROLES.X)`** (`src/server/auth/guard.ts`). Server actions are public POST endpoints; the role comes from the DB user, never from the request body. ADMIN passes every check.
2. **Vouchers + GL lines are written only through `src/server/services/voucher-persistence.ts`** (`savePostedVoucher`, `saveQueuedVoucher`) inside a `prisma.$transaction`. Related rows (member ledger, allocation, SMS log) go in the same transaction. Phase 1 replaces this with `src/server/accounting/posting-service.ts`.
3. **Never delete or rewrite posted history.** Cancel = reversal voucher; posted vouchers can't be re-posted. Never auto-create an account head while posting.
4. **No in-memory stores, sample data or "success" after a failed DB write.** Use `Errors.*` / `userMessage()` from `src/server/errors.ts`; return `{ success: false, message }` for user-facing failures.
5. **No role bypass of a locked period.** Reopen the period instead.
6. **Schema change = Prisma migration** (`npx prisma migrate dev`, show the SQL first). Baseline is `prisma/migrations/0_init`. Never `db push` again.
7. `JWT_SECRET` (32+ chars) is required in `.env`; there is no fallback.

Commands: `pnpm dev` · `pnpm test` (Vitest → `.env.test` → `club_erp_test`, TRUNCATEs tables; `tests/setup.ts` refuses any non-`_test` DB) · `npx tsc --noEmit` · `pnpm build`.
New test DB: `DATABASE_URL=<.env.test url> npx prisma migrate deploy`.
