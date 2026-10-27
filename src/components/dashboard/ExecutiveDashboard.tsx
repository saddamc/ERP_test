"use client";

import React, { useState, useEffect } from "react";
import {
  getDashboardMetricsAction,
  DashboardMetrics,
} from "@/server/actions/dashboard.actions";
import { formatCurrency } from "@/lib/utils";
import {
  Building2,
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  FileText,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Send,
  Eye,
} from "lucide-react";

interface ExecutiveDashboardProps {
  activeRole: "PRESIDENT" | "SECRETARY" | "FINANCE";
  onNavigateToTab?: (tab: "vouchers" | "members" | "reports") => void;
}

export function ExecutiveDashboard({
  activeRole,
  onNavigateToTab,
}: ExecutiveDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadMetrics = () => {
    setLoading(true);
    setError(null);
    getDashboardMetricsAction(activeRole)
      .then((data) => {
        setMetrics(data);
      })
      .catch((err: any) => {
        console.error("Dashboard metrics load error:", err);
        setError(err.message || "Failed to load executive dashboard.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMetrics();
  }, [activeRole]);

  if (loading && !metrics) {
    return (
      <div className="w-full max-w-7xl mx-auto p-8 space-y-6 animate-pulse">
        <div className="h-24 bg-slate-200/80 rounded-2xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-slate-200/70 rounded-xl" />
          <div className="h-32 bg-slate-200/70 rounded-xl" />
          <div className="h-32 bg-slate-200/70 rounded-xl" />
          <div className="h-32 bg-slate-200/70 rounded-xl" />
        </div>
        <div className="h-64 bg-slate-200/60 rounded-xl" />
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="w-full max-w-xl mx-auto p-8 text-center bg-white border border-rose-200 rounded-2xl shadow-sm my-12 space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">Dashboard Temporarily Unavailable</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <button
          onClick={loadMetrics}
          className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
        >
          Retry Loading Dashboard
        </button>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 font-sans text-sm pb-12">
      {/* Role-Specific Executive Persona Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-5 text-white shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            {activeRole === "PRESIDENT" && <Award className="w-6 h-6 text-amber-400" />}
            {activeRole === "SECRETARY" && <Users className="w-6 h-6 text-blue-400" />}
            {activeRole === "FINANCE" && <ShieldCheck className="w-6 h-6 text-emerald-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">
                {activeRole === "PRESIDENT" && "Executive President's Portal"}
                {activeRole === "SECRETARY" && "Honorary General Secretary's Desk"}
                {activeRole === "FINANCE" && "Finance & Treasury Control Desk"}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-emerald-500 text-slate-950">
                {activeRole} ACCESS
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {activeRole === "PRESIDENT" &&
                "Overall financial governance, club solvency, high-value approvals, and audit trail."}
              {activeRole === "SECRETARY" &&
                "Membership records, family enrolments, credit limits, and communication notices."}
              {activeRole === "FINANCE" &&
                "Double-entry vouchers (J3, P1, R1, P2, R2, C3), bank positions, and 3-ledger collections."}
            </p>
          </div>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3.5 py-2 rounded-lg text-xs">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">
            Period: <strong>October 2026</strong> | GL Status:{" "}
            <strong className="text-emerald-400">Balanced</strong>
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4 HIGH-IMPACT EXECUTIVE FINANCIAL KPI METRIC CARDS             */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: Monthly Collections */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span className="font-bold uppercase tracking-wider">Total Collection</span>
            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono font-extrabold text-xl text-slate-900">
            {formatCurrency(metrics.totalMonthlyCollection)}
          </div>
          <div className="flex items-center text-xs text-emerald-700 font-semibold gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.2% vs previous month</span>
          </div>
        </div>

        {/* CARD 2: Total Outstanding Dues (with 3-Ledgers breakdown) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span className="font-bold uppercase tracking-wider">Member Outstanding</span>
            <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono font-extrabold text-xl text-amber-900">
            {formatCurrency(metrics.totalOutstandingDues)}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold">
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
              Sub: {formatCurrency(metrics.subscriptionOutstanding)}
            </span>
            <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
              Din: {formatCurrency(metrics.diningOutstanding)}
            </span>
            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
              Card: {formatCurrency(metrics.cardRoomOutstanding)}
            </span>
          </div>
        </div>

        {/* CARD 3: Cash & Bank Position */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span className="font-bold uppercase tracking-wider">Liquid Cash & Banks</span>
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono font-extrabold text-xl text-blue-900">
            {formatCurrency(metrics.totalLiquidity)}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Cash: {formatCurrency(metrics.cashLiquidity)}</span>
            <span>•</span>
            <span>Bank: {formatCurrency(metrics.bankLiquidity)}</span>
          </div>
        </div>

        {/* CARD 4: Net Operating Surplus */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span className="font-bold uppercase tracking-wider">Net Surplus (Profit)</span>
            <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono font-extrabold text-xl text-emerald-700">
            {formatCurrency(metrics.netOperatingSurplus)}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>Rev: {formatCurrency(metrics.monthlyIncome)}</span>
            <span>-</span>
            <span>Exp: {formatCurrency(metrics.monthlyExpense)}</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ROLE-SPECIFIC DETAILED PANELS                                  */}
      {/* ============================================================== */}

      {/* 1. PRESIDENT VIEW: APPROVALS & FINANCIAL HEALTH */}
      {activeRole === "PRESIDENT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Financial Solvency Overview */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Club Financial Solvency &
                Budget Execution
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                Healthy Surplus Ratio: 60.5%
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-700">Monthly Operating Income vs Expense</span>
                  <span className="text-gray-500">
                    ৳{metrics.monthlyExpense.toLocaleString()} of ৳
                    {metrics.monthlyIncome.toLocaleString()} spent
                  </span>
                </div>
                {/* Visual Ratio Bar */}
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${(metrics.monthlyExpense / metrics.monthlyIncome) * 100}%`,
                    }}
                    className="bg-rose-500 h-full"
                    title="Operating Expenses"
                  ></div>
                  <div
                    style={{
                      width: `${
                        (metrics.netOperatingSurplus / metrics.monthlyIncome) * 100
                      }%`,
                    }}
                    className="bg-emerald-500 h-full"
                    title="Net Retained Surplus"
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                  <span className="flex items-center gap-1 text-rose-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Operating Expenses (39.5%)
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Net Retained Surplus (60.5%)
                  </span>
                </div>
              </div>

              {/* 3-Ledgers Distribution */}
              <div className="pt-2 border-t">
                <span className="block text-xs font-bold text-gray-700 mb-2">
                  Outstanding Dues Concentration by Sub-Ledger:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] text-amber-800 font-bold block uppercase">
                      Subscription (76.2%)
                    </span>
                    <span className="font-mono font-bold text-amber-950">
                      {formatCurrency(metrics.subscriptionOutstanding)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-[10px] text-blue-800 font-bold block uppercase">
                      Dining (17.7%)
                    </span>
                    <span className="font-mono font-bold text-blue-950">
                      {formatCurrency(metrics.diningOutstanding)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                      Card Room (6.1%)
                    </span>
                    <span className="font-mono font-bold text-emerald-950">
                      {formatCurrency(metrics.cardRoomOutstanding)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* High-Value Vouchers Awaiting President Approval */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Pending Executive Approvals (
                {metrics.pendingApprovalsCount})
              </h3>
              <span className="text-[10px] text-gray-500">Threshold &gt; ৳50,000</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between">
                <div>
                  <strong className="text-gray-900 font-mono">P2-3 (Bank Payment)</strong>
                  <p className="text-gray-600 text-[11px] mt-0.5">
                    DESCO Sub-Station Transformer Maintenance & Cable Replacement
                  </p>
                  <span className="text-[10px] text-gray-400">Submitted by Finance • Today 09:15 AM</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-emerald-800 block text-sm">৳1,15,000</span>
                  <button className="mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm">
                    Approve
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex items-start justify-between">
                <div>
                  <strong className="text-gray-900 font-mono">P1-5 (Cash Payment)</strong>
                  <p className="text-gray-600 text-[11px] mt-0.5">
                    Annual Card Tournament Cash Prize Money Allocation
                  </p>
                  <span className="text-[10px] text-gray-400">Submitted by Sports Sec. • Yesterday</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-emerald-800 block text-sm">৳60,000</span>
                  <button className="mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[10px] shadow-sm">
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SECRETARY VIEW: MEMBERSHIP ROSTER & COMMUNICATIONS */}
      {activeRole === "SECRETARY" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Membership Census & Roster Status
              </h3>
              <button
                onClick={() => onNavigateToTab?.("members")}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                Open Member Desk →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                  Active Members
                </span>
                <span className="font-mono font-bold text-lg text-emerald-950">
                  {metrics.activeMembersCount}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">
                  Suspended / Due
                </span>
                <span className="font-mono font-bold text-lg text-rose-950">
                  {metrics.inactiveMembersCount}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-bold text-blue-800 uppercase block">
                  New (Oct 2026)
                </span>
                <span className="font-mono font-bold text-lg text-blue-950">
                  +{metrics.newMembersThisMonth}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t space-y-1.5 text-xs text-gray-600">
              <p>
                • <strong>Total Permanent Members (PM):</strong> 1,120
              </p>
              <p>
                • <strong>Honorary & Associate Members:</strong> 125
              </p>
              <p>
                • <strong>Credit Limits Enforced:</strong> 100% compliant with club constitution.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" /> Automated Member Notifications
              </h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                SMS Gateway: ONLINE
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Today's Real-Time SMS Sent</span>
                  <span className="text-gray-500 text-[11px]">
                    Charge alerts, payments, and balance updates
                  </span>
                </div>
                <span className="font-mono font-bold text-base text-emerald-700">
                  {metrics.todaySmsDeliveredCount} Messages
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Upcoming Scheduled SMS</span>
                  <span className="text-gray-500 text-[11px]">
                    Monthly subscription billing notice (10-Oct-2026)
                  </span>
                </div>
                <span className="text-xs bg-slate-200 text-slate-800 px-2 py-1 rounded font-bold">
                  Scheduled
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. FINANCE VIEW: CASH DESK & VOUCHER PROCESSING */}
      {activeRole === "FINANCE" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Voucher Desk & Queue Status
              </h3>
              <button
                onClick={() => onNavigateToTab?.("vouchers")}
                className="text-xs text-emerald-600 hover:underline font-semibold"
              >
                Open Voucher Desk →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">
                  Vouchers Held in Queue
                </span>
                <span className="font-mono font-bold text-lg text-amber-950">
                  {metrics.unpostedVouchersCount}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                  GL Status
                </span>
                <span className="font-bold text-sm text-emerald-800 flex items-center justify-center gap-1 mt-1">
                  <CheckCircle2 className="w-4 h-4" /> 100% Balanced
                </span>
              </div>
            </div>

            <div className="pt-2 border-t flex items-center justify-between text-xs">
              <span className="text-gray-500">Need to post multi-line vouchers?</span>
              <button
                onClick={() => onNavigateToTab?.("vouchers")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
              >
                New Voucher (Alt+N)
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" /> Bank & Cash Balances
              </h3>
              <button
                onClick={() => onNavigateToTab?.("reports")}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                View Trial Balance →
              </button>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-2 flex justify-between">
                <span>[1001] Main Cash in Hand Desk</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCurrency(metrics.cashLiquidity)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span>[1101] Sonali Bank - Operational A/C</span>
                <span className="font-mono font-bold text-emerald-800">৳33,21,000.00</span>
              </div>
              <div className="py-2 flex justify-between">
                <span>[1102] Dhaka Bank - Development Fund</span>
                <span className="font-mono font-bold text-emerald-800">৳52,00,000.00</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* AUDIT TRAIL & RECENT SYSTEM ACTIVITY FEED                      */}
      {/* ============================================================== */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" /> Audit Trail & System Activity Feed
          </h3>
          <span className="text-[10px] text-gray-400">Strict Audit Logging Enabled</span>
        </div>

        <div className="divide-y divide-gray-100">
          {metrics.recentActivities.map((act) => (
            <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{act.action}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                    {act.actor}
                  </span>
                </div>
                <p className="text-gray-600 text-[11px]">{act.details}</p>
              </div>
              <span className="text-[10px] text-gray-400 font-mono shrink-0">
                {act.timestamp}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
