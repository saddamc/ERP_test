"use client";

import React, { useState } from "react";
import {
  FinancialAccountDTO,
  transferFundsAction,
} from "@/server/actions/finance.actions";
import {
  ArrowRightLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Wallet,
  Smartphone,
  ArrowRight,
} from "lucide-react";

interface QuickTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccountDTO[];
  onTransferSuccess: () => void;
}

export function QuickTransferModal({
  isOpen,
  onClose,
  accounts,
  onTransferSuccess,
}: QuickTransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState(
    accounts.length > 0 ? accounts[0].id : ""
  );
  const [toAccountId, setToAccountId] = useState(
    accounts.length > 1 ? accounts[1].id : ""
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [narration, setNarration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const fromAcc = accounts.find((a) => a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === toAccountId);

  const getIcon = (type: string) => {
    switch (type) {
      case "CASH":
        return <Wallet className="w-3.5 h-3.5 text-emerald-400" />;
      case "BANK":
        return <Building2 className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <Smartphone className="w-3.5 h-3.5 text-pink-400" />;
    }
  };

  const handleSwap = () => {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      setError("Please specify a valid transfer amount.");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("Source and Destination accounts cannot be the same.");
      return;
    }
    if (fromAcc && fromAcc.currentBalance < val) {
      setError(
        `Insufficient balance in ${fromAcc.name}. Available: ৳${fromAcc.currentBalance.toLocaleString()}`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await transferFundsAction({
        fromAccountId,
        toAccountId,
        amount: val,
        date,
        reference: reference.trim() || undefined,
        narration: narration.trim() || undefined,
      });

      if (res.success) {
        onTransferSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "Failed to transfer funds.");
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
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Transfer Funds</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                  Contra C3
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Move liquidity between cash desk, bank account, and mobile wallet
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

          {/* Transfer Route Selector Cards */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            {/* From Account */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                From Account (Credit)
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (৳{a.currentBalance.toLocaleString()})
                  </option>
                ))}
              </select>
              {fromAcc && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    {getIcon(fromAcc.type)} {fromAcc.type}
                  </span>
                  <span>
                    Avail: <strong className="text-white">৳{fromAcc.currentBalance.toLocaleString()}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="hidden sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button
                type="button"
                onClick={handleSwap}
                className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                title="Swap source and destination"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* To Account */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                To Account (Debit)
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (৳{a.currentBalance.toLocaleString()})
                  </option>
                ))}
              </select>
              {toAcc && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    {getIcon(toAcc.type)} {toAcc.type}
                  </span>
                  <span>
                    Current: <strong className="text-white">৳{toAcc.currentBalance.toLocaleString()}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Transfer Amount (৳ BDT) *
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500 font-mono font-bold text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Effective Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          {/* Cheque / Deposit Slip Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Reference / Cheque No / Slip Ref (Optional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Cheque #492019 / Deposit Slip #8812"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            />
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
              placeholder={`Transfer from ${fromAcc?.name || "Source"} to ${toAcc?.name || "Destination"}`}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-purple-500"
            />
          </div>

          {/* Preview banner */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              <span>Double-entry impact:</span>
            </div>
            <span className="font-mono text-purple-300 font-semibold text-[11px]">
              Dr. {toAcc?.accountCode || "Dest"} (Asset +) / Cr. {fromAcc?.accountCode || "Source"} (Asset -)
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Posting Contra C3...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Execute Transfer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
