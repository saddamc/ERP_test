"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  VoucherFormData,
  VoucherLineItem,
  VoucherTypeCode,
  AccountHeadItem,
} from "@/types/accounting";
import {
  getNextVoucherNo,
  getAvailableAccounts,
  getBankAccounts,
  getCashAccounts,
  saveVoucherToQueue,
  postVoucherAction,
  getQueuedVouchers,
  cancelVoucherAction,
} from "@/server/actions/voucher.actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PrintModal } from "@/components/print/PrintModal";
import {
  FileText,
  DollarSign,
  Building2,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Trash2,
  Plus,
  Search,
  RotateCcw,
  Send,
  Eye,
  ListFilter,
  X,
} from "lucide-react";

export function VoucherDesk() {
  const [voucherType, setVoucherType] = useState<VoucherTypeCode>("JOURNAL");
  const [voucherNo, setVoucherNo] = useState("J3-7");
  const [voucherDate, setVoucherDate] = useState("2026-10-05");
  const [status, setStatus] = useState<"DRAFT" | "QUEUED" | "POSTED" | "CANCELLED">("DRAFT");

  // Bank & Cash selections
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [cashCode, setCashCode] = useState("1001");
  const [paymentTo, setPaymentTo] = useState("");
  const [mainNarration, setMainNarration] = useState("");

  // Line item staging inputs
  const [inputAcCode, setInputAcCode] = useState("");
  const [inputAcName, setInputAcName] = useState("");
  const [inputControlHead, setInputControlHead] = useState("");
  const [inputAmount, setInputAmount] = useState("");
  const [inputVType, setInputVType] = useState<"DEBIT" | "CREDIT">("DEBIT");
  const [inputLineNarration, setInputLineNarration] = useState("");
  const [sameCodeCheckbox, setSameCodeCheckbox] = useState(false);
  const [adjustmentCheckbox, setAdjustmentCheckbox] = useState(false);

  // Vouchers lines
  const [lines, setLines] = useState<VoucherLineItem[]>([]);

  // Accounts catalog
  const [availableAccounts, setAvailableAccounts] = useState<AccountHeadItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ code: string; name: string }[]>([]);
  const [cashAccounts, setCashAccounts] = useState<{ code: string; name: string }[]>([]);

  // Modals & Feedback
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [queuedList, setQueuedList] = useState<VoucherFormData[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const acCodeInputRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    async function loadData() {
      const [accs, banks, cash] = await Promise.all([
        getAvailableAccounts(),
        getBankAccounts(),
        getCashAccounts(),
      ]);
      setAvailableAccounts(accs);
      setBankAccounts(banks);
      setCashAccounts(cash);
      if (banks.length > 0) {
        setBankCode(banks[0].code);
        setBankName(banks[0].name);
      }
    }
    loadData();
  }, []);

  // Update voucher number and default Dr/Cr when voucher type changes
  useEffect(() => {
    async function updateVoucherNo() {
      const num = await getNextVoucherNo(voucherType);
      setVoucherNo(num);
      setStatus("DRAFT");
      setLines([]);

      // Intelligent defaults based on voucher type
      if (voucherType === "CASH_PAYMENT" || voucherType === "BANK_PAYMENT") {
        setInputVType("DEBIT");
      } else if (voucherType === "CASH_RECEIVE" || voucherType === "BANK_RECEIVE") {
        setInputVType("CREDIT");
      } else {
        setInputVType("DEBIT");
      }
    }
    updateVoucherNo();
  }, [voucherType]);

  // Handle Account Code lookup
  const handleAcCodeChange = (code: string) => {
    setInputAcCode(code);
    const matched = availableAccounts.find((a) => a.code === code);
    if (matched) {
      setInputAcName(matched.name);
      setInputControlHead(matched.category);
    } else {
      setInputAcName("");
      setInputControlHead("");
    }
  };

  const selectAccountFromSearch = (acc: AccountHeadItem) => {
    setInputAcCode(acc.code);
    setInputAcName(acc.name);
    setInputControlHead(acc.category);
    setSearchModalOpen(false);
    setTimeout(() => amountInputRef.current?.focus(), 100);
  };

  // Add line to grid
  const handleAddLine = () => {
    const amt = parseFloat(inputAmount);
    if (!inputAcCode || !inputAcName) {
      setFeedback({ type: "error", message: "Please enter a valid Account Code." });
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid Amount greater than 0." });
      return;
    }

    const newLine: VoucherLineItem = {
      id: `line-${Date.now()}`,
      accountId: `acc-${inputAcCode}`,
      accountCode: inputAcCode,
      accountName: inputAcName,
      description: inputLineNarration || mainNarration || "Line entry",
      debit: inputVType === "DEBIT" ? amt : 0,
      credit: inputVType === "CREDIT" ? amt : 0,
    };

    setLines((prev) => [...prev, newLine]);
    setFeedback(null);

    // Reset inputs
    setInputAmount("");
    setInputLineNarration("");
    if (!sameCodeCheckbox) {
      setInputAcCode("");
      setInputAcName("");
      setInputControlHead("");
    }

    // Toggle Dr/Cr intelligently if entering two balancing lines in Journal
    if (voucherType === "JOURNAL" && lines.length === 0) {
      setInputVType(inputVType === "DEBIT" ? "CREDIT" : "DEBIT");
    }

    acCodeInputRef.current?.focus();
  };

  const handleDeleteLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = lines.length > 0 && difference < 0.01;

  // Save to Queue
  const handleQueue = async () => {
    if (lines.length === 0) {
      setFeedback({ type: "error", message: "Cannot queue empty voucher." });
      return;
    }

    const payload: VoucherFormData = {
      voucherNo,
      voucherType,
      voucherDate,
      bankCode: bankCode || undefined,
      bankName: bankName || undefined,
      paymentTo: paymentTo || undefined,
      narration: mainNarration,
      status: "QUEUED",
      lines,
      totalDebit,
      totalCredit,
      difference,
    };

    const res = await saveVoucherToQueue(payload);
    if (res.success) {
      setStatus("QUEUED");
      setFeedback({ type: "success", message: res.message });
    }
  };

  // Call Queue
  const handleCallQueue = async () => {
    const list = await getQueuedVouchers();
    setQueuedList(list);
    setQueueModalOpen(true);
  };

  const handleResumeQueued = (item: VoucherFormData) => {
    setVoucherType(item.voucherType);
    setVoucherNo(item.voucherNo);
    setVoucherDate(item.voucherDate);
    setBankCode(item.bankCode || "");
    setBankName(item.bankName || "");
    setPaymentTo(item.paymentTo || "");
    setMainNarration(item.narration);
    setLines(item.lines);
    setStatus(item.status);
    setQueueModalOpen(false);
    setFeedback({ type: "success", message: `Resumed queued voucher ${item.voucherNo}` });
  };

  // Post Voucher
  const handlePost = async () => {
    if (!isBalanced) {
      setFeedback({
        type: "error",
        message: `Voucher is unbalanced! Total Debit (৳${totalDebit.toFixed(2)}) must equal Total Credit (৳${totalCredit.toFixed(2)}).`,
      });
      return;
    }
    if (!mainNarration.trim()) {
      setFeedback({ type: "error", message: "Please provide a Voucher Narration before posting." });
      return;
    }

    const payload: VoucherFormData = {
      voucherNo,
      voucherType,
      voucherDate,
      bankCode: bankCode || undefined,
      bankName: bankName || undefined,
      paymentTo: paymentTo || undefined,
      narration: mainNarration,
      status: "POSTED",
      lines,
      totalDebit,
      totalCredit,
      difference: 0,
    };

    const res = await postVoucherAction(payload);
    if (res.success) {
      setStatus("POSTED");
      setFeedback({ type: "success", message: res.message });
    } else {
      setFeedback({ type: "error", message: res.errors?.join(" ") || res.message });
    }
  };

  // Cancel / Reversal Voucher
  const handleCancelVoucher = async () => {
    if (!cancelReason.trim()) {
      setFeedback({ type: "error", message: "Cancellation reason is required." });
      return;
    }
    const res = await cancelVoucherAction(voucherNo, cancelReason);
    if (res.success) {
      setStatus("CANCELLED");
      setCancelModalOpen(false);
      setFeedback({ type: "success", message: res.message });
    }
  };

  // Reset / New Voucher
  const handleNewVoucher = async () => {
    const num = await getNextVoucherNo(voucherType);
    setVoucherNo(num);
    setLines([]);
    setMainNarration("");
    setPaymentTo("");
    setStatus("DRAFT");
    setFeedback(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 font-sans text-sm pb-12">
      {/* Feedback Alert Toast */}
      {feedback && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between shadow-sm transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Card Container */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Top Voucher Switcher Tabs */}
        <div className="bg-slate-900 px-4 py-2.5 flex flex-wrap items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base tracking-wide flex items-center gap-1.5 text-emerald-400">
              <FileText className="w-5 h-5" /> Voucher Entry Desk
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Double-Entry GL Core
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { type: "JOURNAL", label: "Journal (J3)", icon: ArrowRightLeft },
              { type: "CASH_PAYMENT", label: "Cash Payment (P1)", icon: DollarSign },
              { type: "CASH_RECEIVE", label: "Cash Receive (R1)", icon: DollarSign },
              { type: "BANK_PAYMENT", label: "Bank Payment (P2)", icon: Building2 },
              { type: "BANK_RECEIVE", label: "Bank Receive (R2)", icon: Building2 },
              { type: "CONTRA", label: "Contra (C3)", icon: ArrowRightLeft },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = voucherType === tab.type;
              return (
                <button
                  key={tab.type}
                  onClick={() => setVoucherType(tab.type as VoucherTypeCode)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "bg-slate-800/80 hover:bg-slate-800 text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Voucher Main Metadata Header */}
        <div className="p-4 bg-slate-50 border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Voucher No & Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Voucher No
            </label>
            <div className="flex items-center gap-2">
              <div className="bg-white border border-gray-300 font-mono font-bold text-gray-900 px-3 py-1.5 rounded-lg shadow-inner w-full text-sm">
                {voucherNo}
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                  status === "POSTED"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : status === "QUEUED"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : status === "CANCELLED"
                    ? "bg-rose-100 text-rose-800 border-rose-300"
                    : "bg-blue-100 text-blue-800 border-blue-300"
                }`}
              >
                {status}
              </span>
            </div>
          </div>

          {/* Voucher Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Voucher Date
            </label>
            <input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              disabled={status === "POSTED" || status === "CANCELLED"}
              className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Conditional Bank Selector */}
          {(voucherType === "BANK_PAYMENT" ||
            voucherType === "BANK_RECEIVE" ||
            voucherType === "CONTRA") && (
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Bank Head Selection
              </label>
              <select
                value={bankCode}
                onChange={(e) => {
                  setBankCode(e.target.value);
                  const b = bankAccounts.find((x) => x.code === e.target.value);
                  if (b) setBankName(b.name);
                }}
                disabled={status === "POSTED" || status === "CANCELLED"}
                className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              >
                {bankAccounts.map((b) => (
                  <option key={b.code} value={b.code}>
                    [{b.code}] {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conditional Cash Selector */}
          {(voucherType === "CASH_PAYMENT" || voucherType === "CASH_RECEIVE") && (
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Cash Desk Selection
              </label>
              <select
                value={cashCode}
                onChange={(e) => setCashCode(e.target.value)}
                disabled={status === "POSTED" || status === "CANCELLED"}
                className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              >
                {cashAccounts.map((c) => (
                  <option key={c.code} value={c.code}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment To Field */}
          {(voucherType === "CASH_PAYMENT" || voucherType === "BANK_PAYMENT") && (
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                Payment To (Payee / Supplier Name)
              </label>
              <input
                type="text"
                placeholder="e.g. Navana Gas & Kitchen Supplies / Advance to Manager"
                value={paymentTo}
                onChange={(e) => setPaymentTo(e.target.value)}
                disabled={status === "POSTED" || status === "CANCELLED"}
                className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* Rapid Keyboard Line Input Box (Replicating Desktop Top Input Controls) */}
        {status !== "POSTED" && status !== "CANCELLED" && (
          <div className="p-4 bg-amber-50/50 border-b border-amber-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Fast Line Entry (Keyboard-Driven)
              </span>
              <div className="flex items-center gap-4 text-xs font-medium text-gray-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameCodeCheckbox}
                    onChange={(e) => setSameCodeCheckbox(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Same Code For Rest of Entry</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adjustmentCheckbox}
                    onChange={(e) => setAdjustmentCheckbox(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Adjustment (Chq. Bounce / Other)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
              {/* Account Code Input */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  A/C Code
                </label>
                <div className="flex gap-1">
                  <input
                    ref={acCodeInputRef}
                    type="text"
                    placeholder="e.g. 5201"
                    value={inputAcCode}
                    onChange={(e) => handleAcCodeChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") amountInputRef.current?.focus();
                    }}
                    className="w-full bg-white border border-gray-300 font-mono text-gray-900 px-2.5 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSearchModalOpen(true)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 rounded-lg text-xs"
                    title="Search Chart of Accounts"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Account Name & Control Head */}
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  A/C Name & Control Head
                </label>
                <input
                  type="text"
                  readOnly
                  placeholder="Select account code..."
                  value={
                    inputAcName
                      ? `${inputAcName} [${inputControlHead}]`
                      : ""
                  }
                  className="w-full bg-gray-100 border border-gray-300 text-gray-800 px-2.5 py-1.5 rounded-lg text-sm font-medium cursor-default"
                />
              </div>

              {/* Amount */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Amount (৳)
                </label>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLine();
                  }}
                  className="w-full bg-white border border-gray-300 font-mono text-gray-900 px-2.5 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-right"
                />
              </div>

              {/* Debit / Credit Selection */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  V' Type
                </label>
                <div className="flex items-center gap-3 bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg text-sm">
                  <label className="flex items-center gap-1 cursor-pointer font-semibold text-emerald-800">
                    <input
                      type="radio"
                      name="vtype"
                      checked={inputVType === "DEBIT"}
                      onChange={() => setInputVType("DEBIT")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Dr</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer font-semibold text-blue-800">
                    <input
                      type="radio"
                      name="vtype"
                      checked={inputVType === "CREDIT"}
                      onChange={() => setInputVType("CREDIT")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>Cr</span>
                  </label>
                </div>
              </div>

              {/* Line Narration */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Line Description
                </label>
                <input
                  type="text"
                  placeholder="Remarks..."
                  value={inputLineNarration}
                  onChange={(e) => setInputLineNarration(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddLine();
                  }}
                  className="w-full bg-white border border-gray-300 text-gray-900 px-2.5 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Add Button */}
              <div className="md:col-span-1">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Voucher Main Narration */}
        <div className="px-4 py-2.5 bg-slate-50/50 border-b border-gray-200">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
            Voucher Narration (Memo)
          </label>
          <input
            type="text"
            placeholder="Enter general voucher explanation (e.g. October 2026 Dining provision for members)..."
            value={mainNarration}
            onChange={(e) => setMainNarration(e.target.value)}
            disabled={status === "POSTED" || status === "CANCELLED"}
            className="w-full bg-white border border-gray-300 text-gray-900 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Line Items Table Grid */}
        <div className="p-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-inner">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800 text-slate-200 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3 border-r border-slate-700 w-28">A/C Code</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">Account Name</th>
                  <th className="py-2.5 px-3 border-r border-slate-700">Description</th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-right w-36 text-emerald-400">
                    Debit (৳)
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-700 text-right w-36 text-blue-400">
                    Credit (৳)
                  </th>
                  {status !== "POSTED" && status !== "CANCELLED" && (
                    <th className="py-2.5 px-2 text-center w-12">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-gray-400 italic text-sm"
                    >
                      No line entries added. Use the input box above to add debit and credit entries.
                    </td>
                  </tr>
                ) : (
                  lines.map((line, idx) => (
                    <tr
                      key={line.id || idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-2 px-3 font-mono font-bold text-gray-800 border-r border-gray-100">
                        {line.accountCode}
                      </td>
                      <td className="py-2 px-3 font-medium text-gray-900 border-r border-gray-100">
                        {line.accountName}
                      </td>
                      <td className="py-2 px-3 text-gray-600 border-r border-gray-100">
                        {line.description}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 border-r border-gray-100">
                        {line.debit > 0 ? formatCurrency(line.debit) : "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-700 border-r border-gray-100">
                        {line.credit > 0 ? formatCurrency(line.credit) : "-"}
                      </td>
                      {status !== "POSTED" && status !== "CANCELLED" && (
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteLine(idx)}
                            className="text-gray-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove Line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Totals & Balancing Badge Bar */}
        <div className="bg-slate-100 p-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
          {/* Live Invariant Balancing Badge */}
          <div className="flex items-center gap-3">
            {isBalanced ? (
              <div className="flex items-center gap-2 bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>VOUCHER BALANCED (READY TO POST)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-amber-500 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  {lines.length === 0
                    ? "EMPTY VOUCHER"
                    : `UNBALANCED (DIFF: ${formatCurrency(difference)})`}
                </span>
              </div>
            )}
            <span className="text-xs text-gray-500">
              Total Lines: <strong className="text-gray-800">{lines.length}</strong>
            </span>
          </div>

          {/* Totals Summary Boxes */}
          <div className="flex items-center gap-3">
            <div className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-right shadow-inner min-w-[140px]">
              <span className="block text-[10px] uppercase font-bold text-gray-500">
                Total Debit Amount
              </span>
              <span className="text-sm font-mono font-bold text-emerald-700">
                {formatCurrency(totalDebit)}
              </span>
            </div>

            <div className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-right shadow-inner min-w-[140px]">
              <span className="block text-[10px] uppercase font-bold text-gray-500">
                Total Credit Amount
              </span>
              <span className="text-sm font-mono font-bold text-blue-700">
                {formatCurrency(totalCredit)}
              </span>
            </div>

            <div
              className={`border rounded-lg px-3 py-1.5 text-right shadow-inner min-w-[120px] ${
                difference > 0
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : "bg-white border-gray-300 text-gray-800"
              }`}
            >
              <span className="block text-[10px] uppercase font-bold text-gray-500">
                Difference
              </span>
              <span className="text-sm font-mono font-bold">
                {formatCurrency(difference)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls Bar (Matching Legacy Right-Side Action Suite) */}
        <div className="bg-slate-900 p-3 flex flex-wrap items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" /> V' Status
            </button>
            <button
              type="button"
              onClick={handleNewVoucher}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Voucher
            </button>
            {status === "POSTED" && (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="bg-rose-700 hover:bg-rose-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> V' Cancel (Reversal)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> V' Preview
            </button>
            <button
              type="button"
              onClick={handleQueue}
              disabled={status === "POSTED" || status === "CANCELLED"}
              className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
            >
              <ListFilter className="w-3.5 h-3.5" /> Queue
            </button>
            <button
              type="button"
              onClick={handleCallQueue}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" /> Call Queue
            </button>

            {/* PRIMARY POSTING BUTTON */}
            <button
              type="button"
              onClick={handlePost}
              disabled={!isBalanced || status === "POSTED" || status === "CANCELLED"}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" /> V' Posting (GL)
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Account Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-800 text-base">Select Account Head</h3>
              <button
                onClick={() => setSearchModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search by code or account name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              autoFocus
            />
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 text-xs">
              {availableAccounts
                .filter(
                  (a) =>
                    a.code.includes(searchQuery) ||
                    a.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((a) => (
                  <div
                    key={a.code}
                    onClick={() => selectAccountFromSearch(a)}
                    className="p-2.5 hover:bg-emerald-50 cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <strong className="font-mono text-emerald-700 mr-2">[{a.code}]</strong>
                      <span className="font-medium text-gray-900">{a.name}</span>
                    </div>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {a.category}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Call Queue Modal */}
      {queueModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" /> Queued / Draft Vouchers
              </h3>
              <button
                onClick={() => setQueueModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 text-xs">
              {queuedList.length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic">
                  No vouchers currently held in Queue.
                </div>
              ) : (
                queuedList.map((item) => (
                  <div
                    key={item.voucherNo}
                    onClick={() => handleResumeQueued(item)}
                    className="p-3 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <strong className="font-mono text-gray-900 text-sm">{item.voucherNo}</strong>
                      <span className="ml-2 text-xs text-gray-500">[{item.voucherType}]</span>
                      <p className="text-gray-600 text-[11px] mt-0.5">{item.narration || "No memo"}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-700">
                        {formatCurrency(item.totalDebit)}
                      </span>
                      <span className="block text-[10px] text-gray-400">{item.voucherDate}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Voucher Print Engine (Official A4 Voucher Slip with 3-Box Signatures) */}
      <PrintModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        documentType="VOUCHER"
        voucher={{
          voucherNo,
          voucherType,
          voucherDate,
          bankCode: bankCode || undefined,
          bankName: bankName || undefined,
          paymentTo: paymentTo || undefined,
          narration: mainNarration,
          status,
          lines,
          totalDebit,
          totalCredit,
          difference,
        }}
      />

      {/* MODAL 4: Voucher Cancel Reason Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 space-y-4">
            <h3 className="font-bold text-gray-900 text-base text-rose-700 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" /> Cancel / Reverse Voucher {voucherNo}
            </h3>
            <p className="text-xs text-gray-600">
              In accordance with financial accounting standards, posted vouchers are never deleted.
              This will create an equal-and-opposite offsetting reversal entry in the General Ledger.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Cancellation
              </label>
              <textarea
                rows={3}
                placeholder="State the audit explanation (e.g. Inadvertent duplicate entry / Cheque dishonored)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-50 border border-gray-300 p-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border text-gray-700 text-xs"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelVoucher}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Voucher Status Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900 text-base">Voucher Status Details</h3>
              <button
                onClick={() => setStatusModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-gray-700">
              <p>
                <strong>Voucher Number:</strong> {voucherNo}
              </p>
              <p>
                <strong>Type:</strong> {voucherType}
              </p>
              <p>
                <strong>Current State:</strong>{" "}
                <span className="font-bold text-emerald-700">{status}</span>
              </p>
              <p>
                <strong>Balanced Check:</strong>{" "}
                {isBalanced ? "✓ Yes (Difference = 0)" : "⚠ No"}
              </p>
              <p>
                <strong>Total Debit:</strong> {formatCurrency(totalDebit)}
              </p>
              <p>
                <strong>Total Credit:</strong> {formatCurrency(totalCredit)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
