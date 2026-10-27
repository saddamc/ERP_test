# Elite Club ERP & Financial Accounting System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15%2F16-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791.svg)](https://www.postgresql.org/)

An enterprise-grade, web-based **Club Management & Double-Entry Accounting ERP** engineered to replace legacy Windows desktop accounting systems. Designed for clubs, societies, and membership organizations requiring strict financial accounting, multi-ledger member balances, high-speed keyboard data entry, and automated SMS balance notifications.

---

## 🏛️ System Overview

The system bridges club member operations directly with standard double-entry financial accounting:

```
                            ┌─────────────────────────────────────────┐
                            │               CLUB ERP                  │
                            └────────────────────┬────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   │                                                           │
        ┌──────────▼──────────┐                                     ┌──────────▼──────────┐
        │     MEMBERSHIP      │                                     │     ACCOUNTING      │
        └──────────┬──────────┘                                     └──────────┬──────────┘
                   │                                                           │
        ┌──────────┴──────────┐                                     ┌──────────┴──────────┐
        │  3 Member Ledgers   │                                     │  6 Voucher Types    │
        │  • Subscription     │                                     │  • Journal (J3)     │
        │  • Dining           │                                     │  • Cash Pay (P1)    │
        │  • Card Room        │                                     │  • Cash Recv (R1)   │
        └──────────┬──────────┘                                     │  • Bank Pay (P2)    │
                   │                                                │  • Bank Recv (R2)   │
                   │                                                │  • Contra (C3)      │
                   │                                                └──────────┬──────────┘
                   │                                                           │
                   └─────────────────────────────┬─────────────────────────────┘
                                                 ▼
                                ┌─────────────────────────────────┐
                                │      TRANSACTION & GL CORE      │
                                └────────────────┬────────────────┘
                                                 │
                                ┌────────────────▼────────────────┐
                                │       REPORTING & ALERTS        │
                                │  • Trial Balance  • P&L / Inc   │
                                │  • Balance Sheet  • Sub-Codes   │
                                │  • Auto SMS Balance Alerts      │
                                └─────────────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 1. Member Master & 3 Isolated Sub-Ledgers
- **Full Member Records:** Tracks title, account number (e.g. `PM-029`), full contact info, profession, blood group, and credit limits.
- **Family, Spouses & Nominees:** Up to 2 spouses (with DOB, anniversary, specimen signatures), children (1 to 4), proposer/seconder member references, and nominee share percentages.
- **3 Independent Member Sub-Ledgers:**
  - 🟡 **Subscription Ledger:** Monthly/annual club membership fees and dues.
  - 🔵 **Dining Ledger:** Restaurant, bar, and catering billing charges.
  - 🟢 **Card Room Ledger:** Table charges, tournament fees, and game room bills.
- **Intelligent Payment Allocation:** Supports manual payment splits across the 3 ledgers as well as automated FIFO allocation (oldest dues first), with surplus payments held as Member Advances.

### 2. Double-Entry Accounting Core (6 Voucher Types)
Strict adherence to financial accounting standards matching legacy desktop workflows:
- **Journal Voucher (`J3`):** General ledger adjustments between heads.
- **Cash Payment (`P1`):** Cash paid out from main or petty cash for expenses/suppliers.
- **Cash Receive (`R1`):** Cash collected at reception for member dues or miscellaneous income.
- **Bank Payment (`P2`):** Cheque or online bank payments with payee details.
- **Bank Receive (`R2`):** Bank deposits and wire transfers.
- **Contra Voucher (`C3`):** Internal transfers between Cash and Bank accounts.
- **Validation Rule:** Zero difference enforcement ($\sum \text{Debit} == \sum \text{Credit}$) before posting.
- **Voucher Staging:** `Draft` $\rightarrow$ `Queued` $\rightarrow$ `Posted` (Immutable) $\rightarrow$ `Cancelled` (Audited Reversal).

### 3. Automated SMS Balance Notifications
- **Charge Alerts:** Dispatched immediately when a dining bill, subscription fee, or card room charge is added to a member's account.
- **Payment Confirmations:** Dispatched immediately upon payment receipt, detailing the breakdown of settled accounts and the remaining net balance.
- **Async Queue:** Managed asynchronously via BullMQ / Redis to prevent third-party SMS gateway latency from delaying accounting transactions.

### 4. Financial Reporting Suite
- **Trial Balance:** Filterable by Day, Month, Year, or Custom Date Range, with opening balances, period transactions, and closing balances.
- **Balance Sheet:** Real-time summary of Assets, Liabilities, and Club Accumulated Surplus.
- **Income & Expenditure Statement:** Breakdown of membership dues, dining revenues, card room earnings against categorized operating expenses.
- **Sub-Code / Category Ledger:** Instant drill-down into specific expense/income categories (e.g. `5100 Administrative`, `5200 Dining Kitchen`).

### 5. Role-Based Access Control (RBAC)
- 🎖️ **President:** Executive dashboard, club KPIs, total collections vs outstanding, approval visibility, and read-only audit oversight.
- 📋 **Secretary:** Member onboarding, profile updates, family/spouse management, operational notices.
- 💼 **Finance:** Full voucher desk (`J3`, `P1`, `R1`, `P2`, `R2`, `C3`), chart of accounts, payment collections, bank reconciliation, and financial reports.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15/16 (App Router, Turbopack)** | Full-stack TypeScript, React Server Components & Server Actions |
| **Frontend** | **React 19 + TypeScript** | Strongly-typed components, hooks, and responsive UX |
| **Styling** | **Tailwind CSS v4** | Compact, high-density ERP layout; modern SaaS styling (NOT Bootstrap) |
| **Icons** | **Lucide React** | Clean, lightweight enterprise icon set |
| **Database** | **PostgreSQL 18** | ACID compliance, strict transactions, native decimals and JSONB |
| **ORM** | **Prisma ORM 6** | Type-safe queries, schema migrations, and relational integrity |
| **Queue** | **Redis + BullMQ** | Reliable asynchronous processing for SMS and email alerts |

---

## 📂 Project Structure

```
club-erp/
├── docs/                             # In-depth architectural & API specifications
│   ├── ARCHITECTURE.md               # Technical architecture & transaction flows
│   ├── ACCOUNTING_STANDARDS.md       # Chart of accounts, vouchers & ledger rules
│   ├── API_SPEC.md                   # Server actions & REST endpoints reference
│   └── DATABASE.md                   # Data dictionary, tables & relationships
├── prisma/
│   ├── schema.prisma                 # PostgreSQL database models & enums
│   └── seed.ts                       # Initial seed (COA, Admin user, Sample data)
├── src/
│   ├── app/                          # Next.js App Router (Pages & Routes)
│   │   ├── (auth)/login/             # Secure authentication pages
│   │   ├── (dashboard)/              # Role-protected dashboard layouts
│   │   │   ├── vouchers/             # Voucher entry desk (J3, P1, R1, P2, R2, C3)
│   │   │   ├── members/              # Member directory & 3-ledger profiles
│   │   │   ├── reports/              # Financial reports (TB, P&L, Balance Sheet)
│   │   │   └── settings/             # System configuration & COA management
│   │   ├── api/                      # REST API endpoints for external integrations
│   │   ├── layout.tsx                # Root layout & theme providers
│   │   └── page.tsx                  # Landing / router entry
│   ├── server/                       # Backend Business Logic & Database Services
│   │   ├── db.ts                     # Prisma client singleton instance
│   │   ├── services/                 # Pure domain business services
│   │   │   ├── accounting.service.ts # Double-entry validations, GL posting
│   │   │   ├── voucher.service.ts    # 6-Voucher lifecycle, numbers, staging
│   │   │   ├── member.service.ts     # Member master, family, 3-ledger calculations
│   │   │   ├── report.service.ts     # Trial balance, Balance sheet, P&L aggregations
│   │   │   └── notification.service.ts# SMS dispatch & delivery tracking
│   │   └── actions/                  # Next.js Server Actions (RPC caller from Client)
│   │       ├── voucher.actions.ts
│   │       ├── member.actions.ts
│   │       └── report.actions.ts
│   ├── client/                       # Interactive Frontend UI Components
│   │   ├── components/
│   │   │   ├── ui/                   # Reusable atomic UI (buttons, inputs, tables)
│   │   │   ├── vouchers/             # Keyboard-centric voucher desk grids
│   │   │   ├── members/              # Profile tabs, 3-ledger cards, payment modals
│   │   │   ├── reports/              # Filterable financial tables & export tools
│   │   │   └── dashboard/            # Executive KPI metric cards & charts
│   │   └── hooks/                    # Client hooks (hotkeys, notifications)
│   ├── types/                        # Shared TypeScript interfaces & definitions
│   │   ├── accounting.ts
│   │   ├── member.ts
│   │   └── user.ts
│   └── lib/                          # Shared utilities (currency, date formatters)
├── .env                              # Environment variables (Database URL, SMS keys)
├── package.json                      # Dependencies & package configuration
├── tsconfig.json                     # TypeScript compiler options
└── README.md                         # Project documentation
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js:** v20.x or v24.x
- **Package Manager:** `pnpm` (v11+)
- **Database:** PostgreSQL (v16+)

### 1. Installation
```bash
git clone <repository-url>
cd club-erp
pnpm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/club_erp?schema=public"
NEXT_PUBLIC_APP_NAME="Elite Club ERP"
SMS_GATEWAY_API_KEY="your_api_key_here"
```

### 3. Database Migration & Prisma Generation
```bash
npx prisma db push
npx prisma generate
```

### 4. Running the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 5. Running Production Build
```bash
pnpm build
pnpm start
```

---

## 📖 Detailed Documentation
For comprehensive technical details, consult the documents in the [`docs/`](file:///d:/Client%20Project/ERP-TEST/club-erp/docs) folder:
* 📘 [Architecture Guide (`docs/ARCHITECTURE.md`)](file:///d:/Client%20Project/ERP-TEST/club-erp/docs/ARCHITECTURE.md)
* 📗 [Accounting Standards & Voucher Workflows (`docs/ACCOUNTING_STANDARDS.md`)](file:///d:/Client%20Project/ERP-TEST/club-erp/docs/ACCOUNTING_STANDARDS.md)
* 📙 [API & Server Actions Specification (`docs/API_SPEC.md`)](file:///d:/Client%20Project/ERP-TEST/club-erp/docs/API_SPEC.md)
* 📕 [Database Schema & Data Dictionary (`docs/DATABASE.md`)](file:///d:/Client%20Project/ERP-TEST/club-erp/docs/DATABASE.md)

---

## 📄 License
Proprietary & Confidential. All rights reserved.
