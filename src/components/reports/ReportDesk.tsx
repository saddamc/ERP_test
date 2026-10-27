"use client";

import React, { useState, useEffect } from "react";
import {
  getTrialBalanceAction,
  getBalanceSheetAction,
  getIncomeStatementAction,
  getSubCodeLedgerAction,
  getChartOfAccountsAction,
  TrialBalanceItem,
  BalanceSheetSection,
  IncomeStatementGroup,
  SubCodeTransactionRow,
} from "@/server/actions/report.actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart3,
  Calendar,
  Filter,
  Printer,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Search,
  Scale,
  TrendingUp,
  Receipt,
  Download,
  BookOpen,
} from "lucide-react";

export function ReportDesk() {
  const [activeReport, setActiveReport] = useState<
    "TRIAL_BALANCE" | "BALANCE_SHEET" | "INCOME_STATEMENT" | "SUB_CODE" | "CHART_OF_ACCOUNTS"
  >("TRIAL_BALANCE");

  // Date Filter states
  const [preset, setPreset] = useState<
    "TODAY" | "THIS_MONTH" | "PREVIOUS_MONTH" | "THIS_YEAR" | "CUSTOM"
  >("THIS_MONTH");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-31");
  const [subCodeFilter, setSubCodeFilter] = useState("52"); // Default to Dining 5200

  // Report Data States
  const [tbData, setTbData] = useState<{
    rows: TrialBalanceItem[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  } | null>(null);

  const [bsData, setBsData] = useState<{
    assets: BalanceSheetSection;
    liabilities: BalanceSheetSection;
    equity: BalanceSheetSection;
    totalAssets: number;
    totalLiabilitiesAndEquity: number;
    isBalanced: boolean;
  } | null>(null);

  const [isData, setIsData] = useState<{
    incomeGroups: IncomeStatementGroup[];
    expenseGroups: IncomeStatementGroup[];
    totalIncome: number;
    totalExpense: number;
    netSurplus: number;
  } | null>(null);

  const [subCodeData, setSubCodeData] = useState<{
    transactions: SubCodeTransactionRow[];
    totalDebit: number;
    totalCredit: number;
    netBalance: number;
  } | null>(null);

  const [coaData, setCoaData] = useState<{
    id: string;
    code: string;
    name: string;
    category: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
    controlHead: string;
    isControlHead: boolean;
  }[]>([]);
  const [coaSearch, setCoaSearch] = useState("");
  const [coaCategoryFilter, setCoaCategoryFilter] = useState<string>("ALL");

  // Load Data
  useEffect(() => {
    if (activeReport === "TRIAL_BALANCE") {
      getTrialBalanceAction({ preset, startDate, endDate }).then(setTbData);
    } else if (activeReport === "BALANCE_SHEET") {
      getBalanceSheetAction().then(setBsData);
    } else if (activeReport === "INCOME_STATEMENT") {
      getIncomeStatementAction().then(setIsData);
    } else if (activeReport === "SUB_CODE") {
      getSubCodeLedgerAction(subCodeFilter).then(setSubCodeData);
    } else if (activeReport === "CHART_OF_ACCOUNTS") {
      getChartOfAccountsAction().then(setCoaData);
    }
  }, [activeReport, preset, startDate, endDate, subCodeFilter]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 font-sans text-sm pb-12">
      {/* Top Navigation & Sub-Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-900 px-4 py-2.5 flex flex-wrap items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-wide flex items-center gap-1.5 text-blue-400">
              <BarChart3 className="w-5 h-5" /> Financial Reporting Suite
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Multi-Period & Category Ledgers
            </span>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "TRIAL_BALANCE", label: "Trial Balance", icon: Scale },
              { id: "BALANCE_SHEET", label: "Balance Sheet", icon: Layers },
              { id: "INCOME_STATEMENT", label: "Income & Expenditure", icon: TrendingUp },
              { id: "SUB_CODE", label: "Sub-Code Category Ledger", icon: Receipt },
              { id: "CHART_OF_ACCOUNTS", label: "Chart of Accounts (COA)", icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeReport === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveReport(tab.id as any)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-800/80 hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Period Filter Toolbar */}
        <div className="p-3.5 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-gray-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Reporting Period:</span>
            </div>

            {/* Presets */}
            <select
              value={preset}
              onChange={(e) => {
                const val = e.target.value as any;
                setPreset(val);
                if (val === "TODAY") {
                  setStartDate("2026-10-05");
                  setEndDate("2026-10-05");
                } else if (val === "THIS_MONTH") {
                  setStartDate("2026-10-01");
                  setEndDate("2026-10-31");
                } else if (val === "PREVIOUS_MONTH") {
                  setStartDate("2026-09-01");
                  setEndDate("2026-09-30");
                } else if (val === "THIS_YEAR") {
                  setStartDate("2026-01-01");
                  setEndDate("2026-12-31");
                }
              }}
              className="bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="THIS_MONTH">This Month (Oct 2026)</option>
              <option value="PREVIOUS_MONTH">Last Month (Sep 2026)</option>
              <option value="TODAY">Today (05-Oct-2026)</option>
              <option value="THIS_YEAR">Fiscal Year (2026-2027)</option>
              <option value="CUSTOM">Custom Date Range</option>
            </select>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset("CUSTOM");
                }}
                className="bg-white border border-gray-300 px-2 py-1 rounded-lg text-xs outline-none"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset("CUSTOM");
                }}
                className="bg-white border border-gray-300 px-2 py-1 rounded-lg text-xs outline-none"
              />
            </div>

            {/* Sub-Code Dropdown (if on Sub-Code tab) */}
            {activeReport === "SUB_CODE" && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-gray-300">
                <span className="font-bold text-gray-700">Sub-Category:</span>
                <select
                  value={subCodeFilter}
                  onChange={(e) => setSubCodeFilter(e.target.value)}
                  className="bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-900 outline-none"
                >
                  <option value="ALL">All Categories</option>
                  <option value="51">5100 Administrative Expenses</option>
                  <option value="52">5200 Dining & Catering Expenses</option>
                  <option value="53">5300 Card Room & Sports Expenses</option>
                  <option value="54">5400 Club Maintenance & Utilities</option>
                  <option value="40">4000 Membership Incomes</option>
                  <option value="41">4100 Dining Room Revenues</option>
                  <option value="42">4200 Card Room Table Charges</option>
                </select>
              </div>
            )}
          </div>

          {/* Action / Print Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-gray-600" /> Print Report
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* REPORT 1: TRIAL BALANCE TABLE                                  */}
        {/* ============================================================== */}
        {activeReport === "TRIAL_BALANCE" && tbData && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Trial Balance as of {formatDate(endDate)}
                </h3>
                <p className="text-gray-500 text-xs">
                  Periodic Double-Entry Balances with Opening, Activity, and Closing Summaries
                </p>
              </div>
              <div className="flex items-center gap-2">
                {tbData.isBalanced ? (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1 rounded text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> BALANCED (Dr = Cr)
                  </span>
                ) : (
                  <span className="bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2.5 py-1 rounded text-xs">
                    ⚠ UNBALANCED
                  </span>
                )}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-inner">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 text-slate-200 uppercase font-semibold">
                  <tr className="border-b border-slate-700">
                    <th className="p-2 border-r border-slate-700 w-24">Code</th>
                    <th className="p-2 border-r border-slate-700">Account Title</th>
                    <th className="p-2 border-r border-slate-700 text-center w-28">Category</th>
                    <th className="p-2 border-r border-slate-700 text-right w-28 text-slate-300">
                      Opening Dr
                    </th>
                    <th className="p-2 border-r border-slate-700 text-right w-28 text-slate-300">
                      Opening Cr
                    </th>
                    <th className="p-2 border-r border-slate-700 text-right w-32 text-emerald-300">
                      Closing Debit (৳)
                    </th>
                    <th className="p-2 text-right w-32 text-blue-300">Closing Credit (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {tbData.rows.map((row) => (
                    <tr key={row.code} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 font-mono font-bold text-gray-800 border-r">
                        {row.code}
                      </td>
                      <td className="p-2 font-medium text-gray-900 border-r">{row.name}</td>
                      <td className="p-2 text-center border-r">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {row.category}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono text-gray-500 border-r">
                        {row.openingDebit > 0 ? formatCurrency(row.openingDebit) : "-"}
                      </td>
                      <td className="p-2 text-right font-mono text-gray-500 border-r">
                        {row.openingCredit > 0 ? formatCurrency(row.openingCredit) : "-"}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-800 border-r">
                        {row.closingDebit > 0 ? formatCurrency(row.closingDebit) : "-"}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-blue-800">
                        {row.closingCredit > 0 ? formatCurrency(row.closingCredit) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-bold">
                  <tr>
                    <td colSpan={5} className="p-2.5 text-right uppercase border-r text-gray-700">
                      Total Trial Balance
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-900 border-r text-sm">
                      {formatCurrency(tbData.totalDebit)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-blue-900 text-sm">
                      {formatCurrency(tbData.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* REPORT 2: BALANCE SHEET                                        */}
        {/* ============================================================== */}
        {activeReport === "BALANCE_SHEET" && bsData && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Balance Sheet as of {formatDate(endDate)}
                </h3>
                <p className="text-gray-500 text-xs">
                  Statement of Financial Position: Assets = Liabilities + Capital Fund
                </p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2.5 py-1 rounded text-xs">
                ✓ Balance Sheet Balanced
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: ASSETS */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-slate-800 text-white font-bold p-2.5 uppercase tracking-wide flex justify-between">
                  <span>Assets</span>
                  <span>Amount (৳)</span>
                </div>
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {bsData.assets.items.map((item) => (
                      <tr key={item.code} className="hover:bg-slate-50">
                        <td className="p-2.5 text-gray-800">
                          <span className="font-mono font-bold text-gray-500 mr-2">
                            [{item.code}]
                          </span>
                          {item.name}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-800 w-36">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t border-gray-300">
                    <tr>
                      <td className="p-2.5 text-gray-800 uppercase">Total Assets</td>
                      <td className="p-2.5 text-right font-mono text-emerald-900 text-sm">
                        {formatCurrency(bsData.totalAssets)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Right Column: LIABILITIES & EQUITY */}
              <div className="space-y-4">
                {/* Liabilities */}
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-slate-800 text-white font-bold p-2.5 uppercase tracking-wide flex justify-between">
                    <span>Liabilities</span>
                    <span>Amount (৳)</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {bsData.liabilities.items.map((item) => (
                        <tr key={item.code} className="hover:bg-slate-50">
                          <td className="p-2.5 text-gray-800">
                            <span className="font-mono font-bold text-gray-500 mr-2">
                              [{item.code}]
                            </span>
                            {item.name}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-800 w-36">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t border-gray-300">
                      <tr>
                        <td className="p-2.5 text-gray-800 uppercase">Total Liabilities</td>
                        <td className="p-2.5 text-right font-mono text-slate-900 text-sm">
                          {formatCurrency(bsData.liabilities.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Equity */}
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-slate-800 text-white font-bold p-2.5 uppercase tracking-wide flex justify-between">
                    <span>Equity / Club Capital Fund</span>
                    <span>Amount (৳)</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {bsData.equity.items.map((item) => (
                        <tr key={item.code} className="hover:bg-slate-50">
                          <td className="p-2.5 text-gray-800">
                            <span className="font-mono font-bold text-gray-500 mr-2">
                              [{item.code}]
                            </span>
                            {item.name}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-blue-800 w-36">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t border-gray-300">
                      <tr>
                        <td className="p-2.5 text-gray-800 uppercase">
                          Total Liabilities & Capital Fund
                        </td>
                        <td className="p-2.5 text-right font-mono text-blue-900 text-sm">
                          {formatCurrency(bsData.totalLiabilitiesAndEquity)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* REPORT 3: INCOME & EXPENDITURE STATEMENT                       */}
        {/* ============================================================== */}
        {activeReport === "INCOME_STATEMENT" && isData && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Income & Expenditure Statement ({formatDate(startDate)} to {formatDate(endDate)})
                </h3>
                <p className="text-gray-500 text-xs">
                  Summary of Club Revenues vs Operational Expenses
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 block uppercase font-bold">
                  Net Operating Surplus:
                </span>
                <span className="font-mono font-extrabold text-base text-emerald-700">
                  {formatCurrency(isData.netSurplus)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Incomes */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-emerald-800 text-white font-bold p-2.5 uppercase tracking-wide flex justify-between">
                  <span>Income & Revenues</span>
                  <span>Amount (৳)</span>
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {isData.incomeGroups.map((grp) => (
                    <div key={grp.categoryName} className="p-3">
                      <span className="font-bold text-gray-800 block mb-1 text-xs">
                        {grp.categoryName}
                      </span>
                      {grp.items.map((it) => (
                        <div
                          key={it.code}
                          className="flex justify-between py-1 text-xs text-gray-600 pl-2"
                        >
                          <span>{it.name}</span>
                          <span className="font-mono font-medium text-emerald-800">
                            {formatCurrency(it.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="bg-emerald-50 p-3 font-bold border-t flex justify-between text-xs text-emerald-950">
                  <span className="uppercase">Total Operating Income</span>
                  <span className="font-mono text-sm">{formatCurrency(isData.totalIncome)}</span>
                </div>
              </div>

              {/* Expenses */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-rose-800 text-white font-bold p-2.5 uppercase tracking-wide flex justify-between">
                  <span>Operating Expenditures</span>
                  <span>Amount (৳)</span>
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {isData.expenseGroups.map((grp) => (
                    <div key={grp.categoryName} className="p-3">
                      <span className="font-bold text-gray-800 block mb-1 text-xs">
                        {grp.categoryName}
                      </span>
                      {grp.items.map((it) => (
                        <div
                          key={it.code}
                          className="flex justify-between py-1 text-xs text-gray-600 pl-2"
                        >
                          <span>{it.name}</span>
                          <span className="font-mono font-medium text-rose-800">
                            {formatCurrency(it.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="bg-rose-50 p-3 font-bold border-t flex justify-between text-xs text-rose-950">
                  <span className="uppercase">Total Operating Expenditures</span>
                  <span className="font-mono text-sm">{formatCurrency(isData.totalExpense)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* REPORT 4: SUB-CODE / CATEGORY-WISE EXPENSE LEDGER              */}
        {/* ============================================================== */}
        {activeReport === "SUB_CODE" && subCodeData && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-base text-gray-900">
                  Sub-Code Category Ledger Analysis
                </h3>
                <p className="text-gray-500 text-xs">
                  Date-wise ledger breakdown for category code prefix:{" "}
                  <strong className="text-blue-700">[{subCodeFilter}]</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">
                  Period Net Activity:
                </span>
                <span className="font-mono font-bold text-sm text-blue-900">
                  {formatCurrency(subCodeData.netBalance)}
                </span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-inner">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 text-slate-200 uppercase font-semibold">
                  <tr className="border-b border-slate-700">
                    <th className="p-2 border-r border-slate-700 w-24">Date</th>
                    <th className="p-2 border-r border-slate-700 w-24">Voucher No</th>
                    <th className="p-2 border-r border-slate-700 w-28">A/C Code</th>
                    <th className="p-2 border-r border-slate-700">Account Name</th>
                    <th className="p-2 border-r border-slate-700">Narration / Memo</th>
                    <th className="p-2 border-r border-slate-700 text-right w-28 text-emerald-300">
                      Debit (৳)
                    </th>
                    <th className="p-2 border-r border-slate-700 text-right w-28 text-blue-300">
                      Credit (৳)
                    </th>
                    <th className="p-2 text-right w-32">Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {subCodeData.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-gray-400 italic">
                        No transactions found for this category and date range.
                      </td>
                    </tr>
                  ) : (
                    subCodeData.transactions.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 font-mono text-gray-500 border-r">{t.date}</td>
                        <td className="p-2 font-mono font-bold text-blue-700 border-r">
                          {t.voucherNo}
                        </td>
                        <td className="p-2 font-mono text-gray-800 border-r">{t.accountCode}</td>
                        <td className="p-2 font-medium text-gray-900 border-r">{t.accountName}</td>
                        <td className="p-2 text-gray-600 border-r">{t.narration}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-800 border-r">
                          {t.debit > 0 ? formatCurrency(t.debit) : "-"}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-blue-800 border-r">
                          {t.credit > 0 ? formatCurrency(t.credit) : "-"}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(t.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-bold">
                  <tr>
                    <td colSpan={5} className="p-2 text-right uppercase border-r text-gray-700">
                      Total Category Activity
                    </td>
                    <td className="p-2 text-right font-mono text-emerald-900 border-r">
                      {formatCurrency(subCodeData.totalDebit)}
                    </td>
                    <td className="p-2 text-right font-mono text-blue-900 border-r">
                      {formatCurrency(subCodeData.totalCredit)}
                    </td>
                    <td className="p-2 text-right font-mono text-slate-900">
                      {formatCurrency(subCodeData.netBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* REPORT 5: CHART OF ACCOUNTS (COA) MASTER DIRECTORY             */}
        {/* ============================================================== */}
        {activeReport === "CHART_OF_ACCOUNTS" && (
          <div className="p-4 space-y-4">
            {/* Header / Intro banner */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 rounded-xl border border-blue-900 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-base tracking-wide">
                    Standard Chart of Accounts (COA) Master Directory
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Hierarchical classification tree for Uttara Recreation Club Ltd. (URCL) double-entry general ledger
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full font-mono font-bold">
                  {coaData.length} Account Heads Defined
                </span>
              </div>
            </div>

            {/* Category KPI summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "1000 Assets", cat: "ASSET", color: "border-emerald-300 bg-emerald-50 text-emerald-900", count: coaData.filter((a) => a.category === "ASSET").length },
                { label: "2000 Liabilities", cat: "LIABILITY", color: "border-amber-300 bg-amber-50 text-amber-900", count: coaData.filter((a) => a.category === "LIABILITY").length },
                { label: "3000 Club Equity", cat: "EQUITY", color: "border-purple-300 bg-purple-50 text-purple-900", count: coaData.filter((a) => a.category === "EQUITY").length },
                { label: "4000 Revenue", cat: "INCOME", color: "border-sky-300 bg-sky-50 text-sky-900", count: coaData.filter((a) => a.category === "INCOME").length },
                { label: "5000 Expenses", cat: "EXPENSE", color: "border-rose-300 bg-rose-50 text-rose-900", count: coaData.filter((a) => a.category === "EXPENSE").length },
              ].map((card) => (
                <button
                  key={card.cat}
                  onClick={() => setCoaCategoryFilter(coaCategoryFilter === card.cat ? "ALL" : card.cat)}
                  className={`p-3 rounded-lg border text-left transition-all ${card.color} ${coaCategoryFilter === card.cat ? "ring-2 ring-blue-600 shadow-md font-bold" : "opacity-90 hover:opacity-100 shadow-sm"}`}
                >
                  <span className="text-[11px] block uppercase font-bold tracking-wider">{card.label}</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-lg font-bold font-mono">{card.count}</span>
                    <span className="text-[10px] text-gray-500">Heads</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Search and Category Filter Bar */}
            <div className="bg-slate-50 border border-gray-200 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search account code (e.g., 1001, 5101) or title..."
                  value={coaSearch}
                  onChange={(e) => setCoaSearch(e.target.value)}
                  className="bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-xs w-full outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {["ALL", "ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCoaCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      coaCategoryFilter === cat
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {cat === "ALL" ? "All Classes" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Account List Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden shadow-inner bg-white">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 text-slate-200 uppercase font-semibold">
                  <tr className="border-b border-slate-700">
                    <th className="p-2.5 border-r border-slate-700 w-28 font-mono">A/C Code</th>
                    <th className="p-2.5 border-r border-slate-700">Account Title / Description</th>
                    <th className="p-2.5 border-r border-slate-700 w-32">Class</th>
                    <th className="p-2.5 border-r border-slate-700 w-48">Control Group</th>
                    <th className="p-2.5 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coaData
                    .filter((a) => {
                      const matchesCategory =
                        coaCategoryFilter === "ALL" || a.category === coaCategoryFilter;
                      const matchesSearch =
                        !coaSearch ||
                        a.code.toLowerCase().includes(coaSearch.toLowerCase()) ||
                        a.name.toLowerCase().includes(coaSearch.toLowerCase()) ||
                        a.controlHead.toLowerCase().includes(coaSearch.toLowerCase());
                      return matchesCategory && matchesSearch;
                    })
                    .map((a) => {
                      const badgeStyles: Record<string, string> = {
                        ASSET: "bg-emerald-100 text-emerald-800 border-emerald-300",
                        LIABILITY: "bg-amber-100 text-amber-800 border-amber-300",
                        EQUITY: "bg-purple-100 text-purple-800 border-purple-300",
                        INCOME: "bg-sky-100 text-sky-800 border-sky-300",
                        EXPENSE: "bg-rose-100 text-rose-800 border-rose-300",
                      };
                      return (
                        <tr key={a.code} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono font-bold text-blue-700 border-r">
                            {a.code}
                          </td>
                          <td className="p-2.5 font-semibold text-gray-900 border-r">
                            {a.name}
                          </td>
                          <td className="p-2.5 border-r">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                badgeStyles[a.category] || "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {a.category}
                            </span>
                          </td>
                          <td className="p-2.5 text-gray-600 border-r">
                            {a.controlHead}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => {
                                setSubCodeFilter(a.code.slice(0, 2));
                                setActiveReport("SUB_CODE");
                              }}
                              className="text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded font-semibold inline-flex items-center gap-1 transition-colors"
                            >
                              View Ledger <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
