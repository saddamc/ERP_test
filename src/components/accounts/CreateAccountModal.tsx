"use client";

import React, { useState } from "react";
import {
  createFinancialAccountAction,
  FinancialAccountDTO,
} from "@/server/actions/finance.actions";
import {
  Building2,
  Wallet,
  Smartphone,
  CheckCircle2,
  X,
  CreditCard,
  AlertCircle,
} from "lucide-react";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: (acc: FinancialAccountDTO) => void;
}

export function CreateAccountModal({
  isOpen,
  onClose,
  onAccountCreated,
}: CreateAccountModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"BANK" | "CASH" | "MOBILE_WALLET">("BANK");
  const [provider, setProvider] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchName, setBranchName] = useState("");
  const [bankIdentifierCode, setBankIdentifierCode] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide an account name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createFinancialAccountAction({
        name: name.trim(),
        type,
        provider: provider.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        branchName: branchName.trim() || undefined,
        bankIdentifierCode: bankIdentifierCode.trim() || undefined,
        openingBalance: parseFloat(openingBalance) || 0,
        notes: notes.trim() || undefined,
        isPrimary,
      });

      if (res.success && res.account) {
        onAccountCreated(res.account);
        onClose();
      } else {
        setError(res.message || "Failed to create account");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
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
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Add Financial Account</h3>
              <p className="text-xs text-slate-400">
                Register Cash Drawer, Bank Account, or Mobile Financial Service
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

          {/* Account Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Account Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType("BANK");
                  if (type !== "BANK") setProvider("Sonali Bank PLC");
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  type === "BANK"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-xs"
                    : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Bank Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("CASH");
                  setProvider("Club Reception Vault");
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  type === "CASH"
                    ? "bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-xs"
                    : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Cash Drawer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType("MOBILE_WALLET");
                  setProvider("bKash Limited");
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  type === "MOBILE_WALLET"
                    ? "bg-pink-600/20 border-pink-500 text-pink-300 shadow-xs"
                    : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>MFS (bKash/Nagad)</span>
              </button>
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Account Display Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "BANK"
                  ? "e.g. Dutch Bangla Bank - Operations A/C"
                  : type === "CASH"
                  ? "e.g. Dining Room Counter Cash"
                  : "e.g. bKash Merchant POS Wallet"
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Provider & Account Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {type === "BANK"
                  ? "Bank Institution"
                  : type === "CASH"
                  ? "Custodian / Vault"
                  : "MFS Gateway Provider"}
              </label>
              <input
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder={
                  type === "BANK"
                    ? "e.g. Sonali Bank PLC"
                    : type === "CASH"
                    ? "e.g. Main Cash Office"
                    : "e.g. bKash / Nagad / Rocket"
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Account / Wallet Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 0201402001923"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Branch & Routing Code (for Banks) */}
          {type === "BANK" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Branch Location
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Uttara Model Town Branch"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Routing / Swift Code
                </label>
                <input
                  type="text"
                  value={bankIdentifierCode}
                  onChange={(e) => setBankIdentifierCode(e.target.value)}
                  placeholder="e.g. 195260192"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Opening Balance */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Opening Balance (৳ BDT)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-slate-400 font-semibold text-xs">
                ৳
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Will automatically establish opening balance and credit General Capital Fund (3001).
            </p>
          </div>

          {/* Primary checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="isPrimary" className="text-xs text-slate-300 cursor-pointer">
              Set as primary {type.toLowerCase().replace("_", " ")} account
            </label>
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
