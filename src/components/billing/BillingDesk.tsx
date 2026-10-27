"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  CalendarDays,
  Play,
  CheckCircle2,
  AlertTriangle,
  History,
  Send,
  Users,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  Info,
  DollarSign,
  Receipt,
  FileText,
  BadgeCheck,
} from "lucide-react";
import {
  getBillingCyclePreview,
  executeMonthlyBillingRun,
  getBillingHistory,
} from "@/server/actions/billing.actions";
import {
  BillingPreviewResult,
  BillingHistoryItem,
  BillingRunResult,
  DEFAULT_CATEGORY_FEES,
  CategoryFeeConfig,
} from "@/types/billing";

export function BillingDesk() {
  const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const defaultDueDate = `${currentYearMonth}-25`;

  const [billingMonth, setBillingMonth] = useState<string>(currentYearMonth);
  const [dueDate, setDueDate] = useState<string>(defaultDueDate);
  const [categoryFees, setCategoryFees] = useState<CategoryFeeConfig>(DEFAULT_CATEGORY_FEES);
  const [sendSms, setSendSms] = useState<boolean>(true);

  const [preview, setPreview] = useState<BillingPreviewResult | null>(null);
  const [history, setHistory] = useState<BillingHistoryItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"run" | "history">("run");
  const [runResult, setRunResult] = useState<BillingRunResult | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isExecuting, setIsExecuting] = useState(false);

  // Load preview whenever month or fees change
  const refreshPreview = (month: string, fees: CategoryFeeConfig) => {
    startTransition(async () => {
      const p = await getBillingCyclePreview(month, fees);
      setPreview(p);
    });
  };

  const refreshHistory = () => {
    startTransition(async () => {
      const h = await getBillingHistory();
      setHistory(h);
    });
  };

  useEffect(() => {
    refreshPreview(billingMonth, categoryFees);
    refreshHistory();
  }, [billingMonth]);

  const handleExecuteBilling = async () => {
    if (!preview || preview.alreadyBilled) return;
    setIsExecuting(true);
    setRunResult(null);

    try {
      const res = await executeMonthlyBillingRun(billingMonth, dueDate, categoryFees, sendSms);
      setRunResult(res);
      refreshPreview(billingMonth, categoryFees);
      refreshHistory();
    } catch (err: any) {
      setRunResult({
        success: false,
        message: err.message || "Failed to execute monthly billing cycle.",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Automated Monthly Subscription Billing Engine
                </h1>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  Periodic Cycle Run
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated member dues generation with consolidated General Ledger posting (<code>J3-BILL-YYYYMM</code>) and SMS dispatch
              </p>
            </div>
          </div>

          {/* Sub Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveSubTab("run")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === "run"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>New Billing Run</span>
            </button>

            <button
              onClick={() => {
                setActiveSubTab("history");
                refreshHistory();
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === "history"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Cycle History ({history.length})</span>
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === "run" && (
        <div className="space-y-6">
          {/* Billing Configuration Form Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>Billing Run Parameters</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Billing Cycle Month
                </label>
                <input
                  type="month"
                  value={billingMonth}
                  onChange={(e) => {
                    setBillingMonth(e.target.value);
                    setDueDate(`${e.target.value}-25`);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Permanent Member Fee (PM)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    value={categoryFees.PM}
                    onChange={(e) => {
                      const newFees = { ...categoryFees, PM: parseFloat(e.target.value) || 0 };
                      setCategoryFees(newFees);
                      refreshPreview(billingMonth, newFees);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 pl-6 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Life Member Fee (LM)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    value={categoryFees.LM}
                    onChange={(e) => {
                      const newFees = { ...categoryFees, LM: parseFloat(e.target.value) || 0 };
                      setCategoryFees(newFees);
                      refreshPreview(billingMonth, newFees);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 pl-6 font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Notification & Guard Option */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={sendSms}
                  onChange={(e) => setSendSms(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold">
                  Queue Automated SMS Notices to Member Mobile Numbers upon posting
                </span>
              </label>

              <div className="text-[11px] text-slate-500 font-medium">
                Consolidated GL Voucher:{" "}
                <strong className="font-mono text-emerald-700">
                  J3-BILL-{billingMonth.replace("-", "")}
                </strong>
              </div>
            </div>
          </div>

          {/* Duplicate Protection Warning if already billed */}
          {preview?.alreadyBilled && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">
                  Billing Cycle Already Executed for {billingMonth}
                </h4>
                <p className="mt-0.5">
                  The monthly subscription billing for this cycle has already been completed under
                  voucher <strong>{preview.existingVoucherNo}</strong>. Double billing is blocked to
                  protect General Ledger and member balances. To view details, see the Cycle History
                  tab.
                </p>
              </div>
            </div>
          )}

          {/* Aggregate Metrics Bar */}
          {preview && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Eligible Active Members
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-black text-slate-900">
                    {preview.totalEligibleMembers}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                    Active Status
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Subscription Run
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-2xl font-black text-emerald-700">
                    ৳{preview.totalBillingAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Income 4001</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Execution Status
                  </span>
                  <div className="mt-1">
                    {preview.alreadyBilled ? (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                        Already Billed ({preview.existingVoucherNo})
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                        Ready for Execution
                      </span>
                    )}
                  </div>
                </div>

                <button
                  disabled={preview.alreadyBilled || isExecuting || isPending}
                  onClick={handleExecuteBilling}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-2 ${
                    preview.alreadyBilled || isExecuting || isPending
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                  }`}
                >
                  {isExecuting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Batch...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Post Billing Cycle</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Execution Result Banner */}
          {runResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs shadow-sm ${
                runResult.success
                  ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                  : "bg-rose-50/90 border-rose-200 text-rose-900"
              }`}
            >
              {runResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <h4 className="font-bold text-sm">
                  {runResult.success ? "Billing Cycle Successfully Posted!" : "Billing Run Failed"}
                </h4>
                <p className="leading-relaxed">{runResult.message}</p>
              </div>
            </div>
          )}

          {/* Member Pre-Run Simulation Table */}
          {preview && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800">
                    Active Member Billing Simulation Grid ({preview.members.length} members)
                  </h3>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                    Pre-Run View
                  </span>
                </div>

                <div className="text-[11px] text-slate-500">
                  Total Projected Billing:{" "}
                  <strong className="text-slate-900 font-mono">
                    ৳{preview.totalBillingAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Account No</th>
                      <th className="py-2 px-3">Member Name</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3 text-right">Current Sub Dues</th>
                      <th className="py-2 px-3 text-right">Monthly Fee</th>
                      <th className="py-2 px-3 text-right">Projected Sub Dues</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.members.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                          {m.accountNo}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{m.fullName}</td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {m.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          ৳{m.currentSubDues.toLocaleString("en-BD")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          +৳{m.monthlyFee.toLocaleString("en-BD")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ৳{m.projectedSubDues.toLocaleString("en-BD")}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <BadgeCheck className="w-3 h-3 text-emerald-500" />
                            Eligible
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cycle History Tab */}
      {activeSubTab === "history" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-0">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">
              Executed Billing Cycles & General Ledger Vouchers
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">
              {history.length} cycles completed
            </span>
          </div>

          {history.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No previous billing cycles found. Execute a new billing cycle using the &quot;New Billing Run&quot; tab above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">Cycle Month</th>
                    <th className="py-2.5 px-3">GL Voucher No</th>
                    <th className="py-2.5 px-3 text-right">Members Billed</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue Billed</th>
                    <th className="py-2.5 px-3">Executed By</th>
                    <th className="py-2.5 px-3">Execution Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{h.billingMonth}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                        {h.voucherNo}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                        {h.memberCount} members
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        ৳{h.totalAmount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{h.executedBy}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                        {new Date(h.executedAt).toLocaleString("en-GB")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
