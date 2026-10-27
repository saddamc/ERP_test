"use client";

import React, { useState, useEffect } from "react";
import { AccountsFinanceDesk } from "@/components/accounts/AccountsFinanceDesk";
import { VoucherDesk } from "@/components/vouchers/VoucherDesk";
import { MemberDesk } from "@/components/members/MemberDesk";
import { ReportDesk } from "@/components/reports/ReportDesk";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";
import { DataMigrationDesk } from "@/components/importer/DataMigrationDesk";
import { BillingDesk } from "@/components/billing/BillingDesk";
import { AuditDesk } from "@/components/audit/AuditDesk";
import { DiningPosDesk } from "@/components/pos/DiningPosDesk";
import { PaymentCollectionDesk } from "@/components/collection/PaymentCollectionDesk";
import { CardRoomDesk } from "@/components/cardroom/CardRoomDesk";
import { LoginModal } from "@/components/auth/LoginModal";
import { getCurrentUserAction, logoutAction } from "@/server/actions/auth.actions";
import { UserSession } from "@/server/auth/auth.service";
import {
  Building2,
  FileText,
  Users,
  BarChart3,
  ShieldCheck,
  Calendar,
  Layers,
  LogOut,
  UserCheck,
  KeyRound,
  UploadCloud,
  CalendarDays,
  Lock,
  Utensils,
  Banknote,
  Dices,
  Landmark,
} from "lucide-react";

const NAV_TABS = [
  { id: "dashboard", label: "Dashboard", icon: Layers },
  { id: "accounts", label: "Accounts & Finance", icon: Landmark },
  { id: "members", label: "Member Directory", icon: Users },
  { id: "billing", label: "Monthly Billing", icon: CalendarDays },
  { id: "collection", label: "Payment Collections", icon: Banknote },
  { id: "pos", label: "Dining POS", icon: Utensils },
  { id: "cardroom", label: "Card Room & Sports", icon: Dices },
  { id: "audit", label: "Audit Trail", icon: Lock },
  { id: "migration", label: "Data Migration", icon: UploadCloud },
] as const;

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "accounts"
    | "members"
    | "billing"
    | "collection"
    | "pos"
    | "cardroom"
    | "audit"
    | "migration"
    | "vouchers"
    | "reports"
  >("dashboard");
  const [activeRole, setActiveRole] = useState<"FINANCE" | "SECRETARY" | "PRESIDENT">("FINANCE");
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Mark as mounted to avoid SSR/client hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check initial session
  useEffect(() => {
    async function checkAuth() {
      const user = await getCurrentUserAction();
      if (user) {
        setCurrentUser(user);
        if (user.role === "PRESIDENT" || user.role === "SECRETARY" || user.role === "FINANCE") {
          setActiveRole(user.role as any);
        }
      } else {
        // No session: every server action now requires a signed-in user, so ask for login.
        setIsLoginModalOpen(true);
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  const handleLoginSuccess = (user: UserSession) => {
    setCurrentUser(user);
    if (user.role === "PRESIDENT" || user.role === "SECRETARY" || user.role === "FINANCE") {
      setActiveRole(user.role as any);
    }
    setIsLoginModalOpen(false);
  };

  const handleLogout = async () => {
    await logoutAction();
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "PRESIDENT":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "SECRETARY":
        return "bg-sky-500/20 text-sky-300 border-sky-500/40";
      case "FINANCE":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
  };

  // Prevent SSR/client hydration mismatch — render nothing until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Loading Club ERP…</div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Application Header */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Organization Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center font-black text-slate-950 shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">
                  UTTARA RECREATION CLUB LTD.
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-500/30">
                  v1.0 Production
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Club Management & Double-Entry Accounting ERP
              </p>
            </div>
          </div>

          {/* User Session, Quick Date & Persona Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Session: <strong>06-Oct-2026</strong></span>
            </div>

            {/* Authenticated User Status Pill */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white uppercase">
                  {currentUser.username.substring(0, 2)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[11px] font-bold text-slate-200 leading-tight">
                    {currentUser.fullName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(
                        currentUser.role
                      )}`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-1 border-l border-slate-800 pl-2">
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    title="Switch User / Persona"
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors text-[10px] flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span className="hidden md:inline">Switch</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-lg transition-colors text-[10px] flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-md"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Sign In Portal</span>
              </button>
            )}

            {/* Role Simulator Switcher */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400 text-[11px]">Role View:</span>
              <select
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as any)}
                className="bg-transparent text-white font-semibold text-xs outline-none cursor-pointer"
              >
                <option value="FINANCE" className="bg-slate-900 text-white">
                  Finance
                </option>
                <option value="SECRETARY" className="bg-slate-900 text-white">
                  Secretary
                </option>
                <option value="PRESIDENT" className="bg-slate-900 text-white">
                  President
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Bar Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 border-t border-slate-800/80 text-xs font-semibold overflow-x-auto scrollbar-none">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              tab.id === "accounts"
                ? activeTab === "accounts" || activeTab === "vouchers" || activeTab === "reports"
                : activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap shrink-0 text-xs font-semibold transition-all ${
                  isActive
                    ? "border-emerald-400 text-emerald-300 bg-slate-900/80 shadow-sm"
                    : "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/40 hover:border-slate-700"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? "text-emerald-400" : "text-slate-400"
                  }`}
                />
                <span className="leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main App Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {!currentUser ? (
          <div className="py-24 text-center text-sm text-slate-500">
            {authChecked ? "Please sign in to use Club ERP." : "Checking your session…"}
          </div>
        ) : (<>
        {activeTab === "dashboard" && (
          <ExecutiveDashboard
            activeRole={activeRole}
            onNavigateToTab={(t) => {
              if (t === "vouchers" || t === "reports") {
                setActiveTab("accounts");
              } else {
                setActiveTab(t as any);
              }
            }}
          />
        )}

        {activeTab === "accounts" && (
          <AccountsFinanceDesk initialSection="accounts" />
        )}
        {activeTab === "vouchers" && (
          <AccountsFinanceDesk initialSection="vouchers" />
        )}
        {activeTab === "reports" && (
          <AccountsFinanceDesk initialSection="reports" />
        )}
        {activeTab === "members" && <MemberDesk />}
        {activeTab === "migration" && <DataMigrationDesk />}
        {activeTab === "billing" && <BillingDesk />}
        {activeTab === "audit" && <AuditDesk />}
        {activeTab === "pos" && <DiningPosDesk />}
        {activeTab === "collection" && <PaymentCollectionDesk />}
        {activeTab === "cardroom" && <CardRoomDesk />}
        </>)}
      </main>

      {/* Persistent Status Footer */}
      <footer className="bg-white border-t border-gray-200 py-3 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              PostgreSQL 18 & Double-Entry Ledger Engine: ACTIVE
            </span>
            <span>•</span>
            <span>Authenticated User: <strong>{currentUser ? currentUser.fullName : "Guest"}</strong> ({currentUser ? currentUser.role : "None"})</span>
          </div>
          <div>
            <span>Strict Immutability Enabled (No Hard Deletes)</span>
          </div>
        </div>
      </footer>

      {/* Login Portal Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
      />
    </div>
  );
}
