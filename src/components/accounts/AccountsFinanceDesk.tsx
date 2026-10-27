"use client";

import React, { useState } from "react";
import { CashBankRegisterDesk } from "@/components/accounts/CashBankRegisterDesk";
import { VoucherDesk } from "@/components/vouchers/VoucherDesk";
import { ReportDesk } from "@/components/reports/ReportDesk";
import {
  Landmark,
  FileText,
  BarChart3,
  Scale,
  Receipt,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Wallet,
} from "lucide-react";

interface AccountsFinanceDeskProps {
  initialSection?: "accounts" | "vouchers" | "reports";
}

export function AccountsFinanceDesk({
  initialSection = "accounts",
}: AccountsFinanceDeskProps) {
  const [activeSection, setActiveSection] = useState<
    "accounts" | "vouchers" | "reports"
  >(initialSection);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 font-sans text-sm pb-12">
      {/* Accounts & Finance Top Master Banner & Sub-Module Switcher */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Landmark className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Accounts & Finance Master Suite
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-blue-500 text-white">
                Double-Entry GL
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Uttara Recreation Club Ltd. (URCL) — Cash & Bank Registers, Vouchers, General Ledgers & Financial Statements
            </p>
          </div>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveSection("accounts")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSection === "accounts"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-300" />
            <span>Cash & Bank Registers</span>
          </button>

          <button
            onClick={() => setActiveSection("vouchers")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSection === "vouchers"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileText className="w-4 h-4 text-blue-300" />
            <span>Voucher Desk (J3, P1, R1, P2, R2, C3)</span>
          </button>

          <button
            onClick={() => setActiveSection("reports")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSection === "reports"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-300" />
            <span>Financial Reports & COA</span>
          </button>
        </div>
      </div>

      {/* Render Active Sub-Module */}
      <div className="transition-all">
        {activeSection === "accounts" && <CashBankRegisterDesk />}
        {activeSection === "vouchers" && <VoucherDesk />}
        {activeSection === "reports" && <ReportDesk />}
      </div>
    </div>
  );
}
