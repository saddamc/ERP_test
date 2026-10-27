"use client";

import React, { useState, useEffect } from "react";
import {
  FinancialAccountDTO,
  directMoneyOutAction,
} from "@/server/actions/finance.actions";
import { getAvailableAccounts } from "@/server/actions/voucher.actions";
import { AccountHeadItem } from "@/types/accounting";
import {
  ArrowUpRight,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Wallet,
  Smartphone,
} from "lucide-react";

interface DirectMoneyOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccountDTO[];
  onPaymentSuccess: () => void;
}

export function DirectMoneyOutModal({
  isOpen,
  onClose,
  accounts,
  onPaymentSuccess,
}: DirectMoneyOutModalProps) {
  const [financialAccountId, setFinancialAccountId] = useState(
    accounts.length > 0 ? accounts[0].id : ""
  );
  const [expenseHeadId, setExpenseHeadId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidTo, setPaidTo] = useState("");
  const [reference, setReference] = useState("");
  const [narration, setNarration] = useState("");
  const [expenseHeads, setExpenseHeads] = useState<AccountHeadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHeads() {
      const all = await getAvailableAccounts();
      const filtered = all.filter(
        (a) => a.category === "EXPENSE" || a.code.startsWith("5")
      );
      setExpenseHeads(filtered);
      if (filtered.length > 0) setExpenseHeadId(filtered[0].id);
    }
    if (isOpen) {
      loadHeads();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetAccount = accounts.find((a) => a.id === financialAccountId);
  const isCash = targetAccount?.type === "CASH";
  const voucherTypeLabel = isCash ? "Cash Payment (P1)" : "Bank Payment (P2)";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setError("Please specify a valid payment amount.");
      return;
    }
    if (!expenseHeadId) {
      setError("Please select an Expense Category / Head.");
      return;
    }
    if (targetAccount && targetAccount.currentBalance < val) {
      setError(
        `Insufficient balance in ${targetAccount.name}. Available: ৳${targetAccount.currentBalance.toLocaleString()}`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await directMoneyOutAction({
        financialAccountId,
        expenseAccountHeadId: expenseHeadId,
        amount: val,
        date,
        paidTo: paidTo.trim() || undefined,
        reference: reference.trim() || undefined,
        narration: narration.trim() || undefined,
      });

      if (res.success) {
        onPaymentSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to post expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Direct Money Out (Quick Expense)</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                  {voucherTypeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pay staff wages, utilities, office stationery, or general maintenance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Paying Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Pay From Account *
            </label>
            <select
              value={financialAccountId}
              onChange={(e) => setFinancialAccountId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type}) — Avail: ৳{a.currentBalance.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Expense Head / Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Expense Head / Classification *
            </label>
            <select
              value={expenseHeadId}
              onChange={(e) => setExpenseHeadId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
            >
              {expenseHeads.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.code} - {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Amount (৳ BDT) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2 text-slate-400 font-semibold text-xs">
                  ৳
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500 font-mono font-bold text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
              />
            </div>
          </div>

          {/* Paid To & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Paid To / Payee / Vendor
              </label>
              <input
                type="text"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="e.g. DESCO / Staff Name / Stationer"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cheque No / Bill Ref / Voucher Ref
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. Chq #092100 or Bill #771"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          {/* Narration */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Narration / Memo
            </label>
            <input
              type="text"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="e.g. Monthly electricity bill payment for URCL Main Clubhouse"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-rose-500"
            />
          </div>

          {/* Double-Entry Preview */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Double-entry preview:</span>
            </div>
            <span className="font-mono text-rose-300 font-semibold text-[11px]">
              Dr. Expense Head (Exp +) / Cr. {targetAccount?.name.substring(0, 15)} (Asset -)
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Posting Payment...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Post Payment ({isCash ? "P1" : "P2"})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
