"use client";

import React, { useState, useEffect } from "react";
import {
  getFinancialAccountsSummaryAction,
  getAccountRegisterAction,
  toggleReconcileEntryAction,
  FinancialAccountDTO,
  FinancialSummaryKPI,
  RegisterTransactionRow,
} from "@/server/actions/finance.actions";
import { CreateAccountModal } from "./CreateAccountModal";
import { QuickTransferModal } from "./QuickTransferModal";
import { DirectMoneyInModal } from "./DirectMoneyInModal";
import { DirectMoneyOutModal } from "./DirectMoneyOutModal";
import {
  Building2,
  Wallet,
  Smartphone,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Scale,
  Sparkles,
} from "lucide-react";

export function CashBankRegisterDesk() {
  const [accounts, setAccounts] = useState<FinancialAccountDTO[]>([]);
  const [kpis, setKpis] = useState<FinancialSummaryKPI | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccountDTO | null>(null);
  const [transactions, setTransactions] = useState<RegisterTransactionRow[]>([]);
  const [filterType, setFilterType] = useState<"ALL" | "BANK" | "CASH" | "MOBILE_WALLET">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Modals
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isMoneyInOpen, setIsMoneyInOpen] = useState(false);
  const [isMoneyOutOpen, setIsMoneyOutOpen] = useState(false);

  // Load summary and all accounts
  const loadSummary = async () => {
    setLoading(true);
    const data = await getFinancialAccountsSummaryAction();
    setAccounts(data.accounts);
    setKpis(data.kpis);

    if (data.accounts.length > 0) {
      const activeId = selectedAccountId || data.accounts[0].id;
      setSelectedAccountId(activeId);
      await loadRegister(activeId);
    }
    setLoading(false);
  };

  // Load transactions for the selected account
  const loadRegister = async (accId: string) => {
    setRegisterLoading(true);
    const reg = await getAccountRegisterAction(accId);
    setSelectedAccount(reg.account);
    setTransactions(reg.transactions);
    setRegisterLoading(false);
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleSelectAccount = (acc: FinancialAccountDTO) => {
    setSelectedAccountId(acc.id);
    loadRegister(acc.id);
  };

  const handleToggleReconcile = async (entryId: string) => {
    if (entryId.startsWith("ob-")) return;
    const res = await toggleReconcileEntryAction(entryId);
    if (res.success) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === entryId
            ? { ...t, isReconciled: res.isReconciled, reconciledAt: res.isReconciled ? new Date().toISOString() : null }
            : t
        )
      );
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "CASH":
        return <Wallet className="w-4 h-4 text-emerald-400" />;
      case "BANK":
        return <Building2 className="w-4 h-4 text-blue-400" />;
      default:
        return <Smartphone className="w-4 h-4 text-pink-400" />;
    }
  };

  const filteredAccounts = accounts.filter((a) => {
    if (filterType !== "ALL" && a.type !== filterType) return false;
    return true;
  });

  const filteredTransactions = transactions.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.voucherNo.toLowerCase().includes(term) ||
      t.narration.toLowerCase().includes(term) ||
      t.voucherType.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4 font-sans text-sm">
      {/* Top Liquid Funds KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Liquid Funds */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Liquid Funds</span>
              <Scale className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-2">
              <span className="text-lg font-black text-white font-mono">
                ৳{kpis.totalLiquidFunds.toLocaleString()}
              </span>
              <p className="text-[10px] text-blue-400 mt-0.5 font-semibold">
                {kpis.activeAccountsCount} Active Registers
              </p>
            </div>
          </div>

          {/* Card 2: In Banks */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Bank Balances</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2">
              <span className="text-lg font-black text-sky-300 font-mono">
                ৳{kpis.totalInBanks.toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Commercial & Govt</p>
            </div>
          </div>

          {/* Card 3: In Cash */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Cash in Hand</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="text-lg font-black text-emerald-300 font-mono">
                ৳{kpis.totalInCash.toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Reception & Petty Cash</p>
            </div>
          </div>

          {/* Card 4: Mobile Wallets */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>MFS (bKash/Nagad)</span>
              <Smartphone className="w-4 h-4 text-pink-400" />
            </div>
            <div className="mt-2">
              <span className="text-lg font-black text-pink-300 font-mono">
                ৳{kpis.totalInMfs.toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Merchant POS Wallets</p>
            </div>
          </div>

          {/* Card 5: Net Cash Flow MTD */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Net Cash Flow (MTD)</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2">
              <span
                className={`text-lg font-black font-mono ${
                  kpis.netMonthlyCashFlow >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                ৳{kpis.netMonthlyCashFlow.toLocaleString()}
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Inflow - Outflow</p>
            </div>
          </div>

          {/* Card 6: Reconciled */}
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Reconciled</span>
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="mt-2">
              <span className="text-lg font-black text-teal-300 font-mono">
                {kpis.reconciledRate}%
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">Statement Match</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white border border-gray-200 p-3 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-xs flex items-center gap-1.5 transition-all"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Funds (C3)</span>
          </button>

          <button
            onClick={() => setIsMoneyInOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 transition-all"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Quick Receipt (R1/R2)</span>
          </button>

          <button
            onClick={() => setIsMoneyOutOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs flex items-center gap-1.5 transition-all"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Quick Expense (P1/P2)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateAccountOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>

          <button
            onClick={loadSummary}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
            title="Refresh All Balances"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Account Selection Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Account Filter Pills */}
          <div className="bg-white border border-gray-200 p-1 rounded-xl flex items-center justify-between text-xs font-semibold">
            {(["ALL", "BANK", "CASH", "MOBILE_WALLET"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`flex-1 py-1 px-2 rounded-lg text-center transition-all ${
                  filterType === tab
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {tab === "MOBILE_WALLET" ? "MFS" : tab}
              </button>
            ))}
          </div>

          {/* Account Cards List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredAccounts.map((acc) => {
              const isSelected = acc.id === selectedAccountId;
              return (
                <div
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-900 text-white border-blue-500 shadow-md ring-2 ring-blue-500/20"
                      : "bg-white text-gray-900 border-gray-200 hover:border-blue-400 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-slate-800"
                            : "bg-gray-100"
                        }`}
                      >
                        {getAccountIcon(acc.type)}
                      </div>
                      <div>
                        <h4
                          className={`font-bold text-xs leading-tight ${
                            isSelected ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {acc.name}
                        </h4>
                        <p
                          className={`text-[11px] mt-0.5 ${
                            isSelected ? "text-slate-400" : "text-gray-500"
                          }`}
                        >
                          {acc.provider || acc.type} {acc.accountNumber ? `• ${acc.accountNumber}` : ""}
                        </p>
                      </div>
                    </div>

                    {acc.isPrimary && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        Primary
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-dashed flex items-center justify-between border-gray-200/40">
                    <span
                      className={`text-[10px] font-semibold ${
                        isSelected ? "text-slate-400" : "text-gray-400"
                      }`}
                    >
                      Current Balance
                    </span>
                    <span
                      className={`text-sm font-black font-mono ${
                        isSelected ? "text-emerald-400" : "text-emerald-700"
                      }`}
                    >
                      ৳{acc.currentBalance.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Register / Passbook (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[640px]">
          {/* Register Header */}
          {selectedAccount && (
            <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  {getAccountIcon(selectedAccount.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">
                      {selectedAccount.name}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedAccount.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {selectedAccount.branchName ? `${selectedAccount.branchName} • ` : ""}
                    Acc #{selectedAccount.accountNumber || "N/A"} • GL Code:{" "}
                    <strong>{selectedAccount.accountCode}</strong>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  Live Available Balance
                </div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  ৳{selectedAccount.currentBalance.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search voucher, memo, cheque #..."
                className="w-full bg-white border border-gray-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-gray-500" />
                <span>Print Register</span>
              </button>
            </div>
          </div>

          {/* Register Transactions Table */}
          <div className="flex-1 overflow-x-auto">
            {registerLoading ? (
              <div className="p-12 text-center text-gray-400 text-xs">
                Loading transaction passbook...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs">
                No transactions recorded for this account.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Narration / Particulars</th>
                    <th className="py-2.5 px-3 text-right text-emerald-700">Money In (Dr)</th>
                    <th className="py-2.5 px-3 text-right text-rose-700">Money Out (Cr)</th>
                    <th className="py-2.5 px-3 text-right text-gray-900">Balance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap font-medium">
                        {tx.date}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {tx.voucherNo}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                          {tx.voucherType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-800 max-w-xs truncate" title={tx.narration}>
                        {tx.narration}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {tx.moneyIn > 0 ? `৳${tx.moneyIn.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {tx.moneyOut > 0 ? `৳${tx.moneyOut.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                        ৳{tx.runningBalance.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleReconcile(tx.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            tx.isReconciled
                              ? "bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100"
                              : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-teal-50 hover:text-teal-700"
                          }`}
                          title={
                            tx.isReconciled
                              ? `Reconciled: ${tx.reconciledAt ? new Date(tx.reconciledAt).toLocaleDateString() : "Yes"}`
                              : "Click to mark as Reconciled"
                          }
                        >
                          {tx.isReconciled ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-teal-600" />
                              <span>Cleared</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>Pending</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateAccountModal
        isOpen={isCreateAccountOpen}
        onClose={() => setIsCreateAccountOpen(false)}
        onAccountCreated={(acc) => {
          loadSummary();
          setSelectedAccountId(acc.id);
        }}
      />

      <QuickTransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={accounts}
        onTransferSuccess={loadSummary}
      />

      <DirectMoneyInModal
        isOpen={isMoneyInOpen}
        onClose={() => setIsMoneyInOpen(false)}
        accounts={accounts}
        onReceiptSuccess={loadSummary}
      />

      <DirectMoneyOutModal
        isOpen={isMoneyOutOpen}
        onClose={() => setIsMoneyOutOpen(false)}
        accounts={accounts}
        onPaymentSuccess={loadSummary}
      />
    </div>
  );
}
