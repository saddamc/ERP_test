"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Banknote,
  Search,
  CheckCircle2,
  AlertCircle,
  Printer,
  Smartphone,
  CreditCard,
  Building,
  RefreshCw,
  Receipt,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Calendar,
  Sparkles,
} from "lucide-react";
import { getMembersList } from "@/server/actions/member.actions";
import { MemberProfile } from "@/types/member";
import {
  processCollectionAction,
  getRecentReceipts,
  CollectionResult,
  RecentReceiptItem,
} from "@/server/actions/payment.actions";
import { PrintModal } from "@/components/print/PrintModal";
import { MoneyReceiptData } from "@/components/print/MoneyReceiptSlip";

export function PaymentCollectionDesk() {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState<string>("");

  const [paymentMode, setPaymentMode] = useState<"CASH" | "BKASH" | "NAGAD" | "BANK_CARD" | "CHEQUE">("CASH");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");

  const [totalPaid, setTotalPaid] = useState<string>("");
  const [allocSub, setAllocSub] = useState<number>(0);
  const [allocDin, setAllocDin] = useState<number>(0);
  const [allocCard, setAllocCard] = useState<number>(0);
  const [allocAdvance, setAllocAdvance] = useState<number>(0);

  const [collectionResult, setCollectionResult] = useState<CollectionResult | null>(null);
  const [recentReceipts, setRecentReceipts] = useState<RecentReceiptItem[]>([]);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [activeReceiptData, setActiveReceiptData] = useState<MoneyReceiptData | null>(null);

  const [isPending, startTransition] = useTransition();

  // Load members and recent receipts on mount
  const refreshMembers = async () => {
    const list = await getMembersList();
    setMembers(list);
    if (list.length > 0 && !selectedMemberId) {
      setSelectedMemberId(list[0].id);
    }
  };

  const refreshRecent = async () => {
    const receipts = await getRecentReceipts();
    setRecentReceipts(receipts);
  };

  useEffect(() => {
    refreshMembers();
    refreshRecent();
  }, []);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Auto-allocation helper
  const handleAutoAllocate = (amountNum: number) => {
    if (!selectedMember) return;
    let remaining = amountNum;

    // 1. Subscription
    const subToPay = Math.min(remaining, selectedMember.subscriptionBalance);
    setAllocSub(subToPay);
    remaining -= subToPay;

    // 2. Dining
    const dinToPay = Math.min(remaining, selectedMember.diningBalance);
    setAllocDin(dinToPay);
    remaining -= dinToPay;

    // 3. Card Room
    const cardToPay = Math.min(remaining, selectedMember.cardRoomBalance);
    setAllocCard(cardToPay);
    remaining -= cardToPay;

    // 4. Advance
    setAllocAdvance(remaining > 0 ? remaining : 0);
  };

  // Quick 1-click presets
  const handlePayFullDues = () => {
    if (!selectedMember) return;
    const full = selectedMember.totalOutstanding;
    setTotalPaid(full.toString());
    setAllocSub(selectedMember.subscriptionBalance);
    setAllocDin(selectedMember.diningBalance);
    setAllocCard(selectedMember.cardRoomBalance);
    setAllocAdvance(0);
  };

  const handlePaySubOnly = () => {
    if (!selectedMember) return;
    const amt = selectedMember.subscriptionBalance;
    setTotalPaid(amt.toString());
    setAllocSub(amt);
    setAllocDin(0);
    setAllocCard(0);
    setAllocAdvance(0);
  };

  const handlePayDinOnly = () => {
    if (!selectedMember) return;
    const amt = selectedMember.diningBalance;
    setTotalPaid(amt.toString());
    setAllocSub(0);
    setAllocDin(amt);
    setAllocCard(0);
    setAllocAdvance(0);
  };

  // Process payment
  const handleProcessPayment = () => {
    const paidNum = parseFloat(totalPaid) || 0;
    if (!selectedMember || paidNum <= 0) return;

    startTransition(async () => {
      const res = await processCollectionAction({
        memberId: selectedMember.id,
        totalPaid: paidNum,
        paymentMode,
        bankName: bankName.trim() || undefined,
        referenceNo: referenceNo.trim() || undefined,
        allocSubscription: allocSub,
        allocDining: allocDin,
        allocCardRoom: allocCard,
        allocAdvance,
      });

      setCollectionResult(res);

      if (res.success && res.receiptData) {
        setActiveReceiptData(res.receiptData);
        setPrintModalOpen(true);
        // Refresh member list to update dues
        await refreshMembers();
        await refreshRecent();
        setTotalPaid("");
        setAllocSub(0);
        setAllocDin(0);
        setAllocCard(0);
        setAllocAdvance(0);
        setReferenceNo("");
      }
    });
  };

  const totalAllocated = allocSub + allocDin + allocCard + allocAdvance;
  const currentTotalPaidNum = parseFloat(totalPaid) || 0;
  const isAllocationBalanced = Math.abs(totalAllocated - currentTotalPaidNum) < 0.01 && currentTotalPaidNum > 0;

  // Filter members for selector
  const filteredMembers = members.filter(
    (m) =>
      m.accountNo.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.phone && m.phone.includes(memberSearch))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Member Payment Collection & Money Receipt Desk
                </h1>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  Receive Vouchers (R1 / R2)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cash counter, bKash, Nagad, POS card & cheque collections with instant Money Receipts and double-entry General Ledger posting
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Organization</span>
              <strong className="text-slate-900 font-bold">Uttara Recreation Club Ltd.</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual-Panel Collection View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Member Lookup & 3 Sub-Ledger Balances (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Select Club Member</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              {members.length} members loaded
            </span>
          </div>

          {/* Member Search & Selector */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search member by ID, name, or mobile..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <select
              value={selectedMemberId}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                setTotalPaid("");
                setAllocSub(0);
                setAllocDin(0);
                setAllocCard(0);
                setAllocAdvance(0);
              }}
              size={5}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id} className="py-1">
                  {m.accountNo} - {m.fullName} (Dues: ৳{m.totalOutstanding.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* Member Outstanding Balances Breakdown */}
          {selectedMember && (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">
                      {selectedMember.fullName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {selectedMember.accountNo} • {selectedMember.phone || "No Mobile"}
                    </span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                    {selectedMember.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>1. Subscription Sub-Ledger:</span>
                    <strong className="font-mono text-slate-800">
                      ৳{selectedMember.subscriptionBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>2. Dining Sub-Ledger:</span>
                    <strong className="font-mono text-slate-800">
                      ৳{selectedMember.diningBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>3. Card Room Sub-Ledger:</span>
                    <strong className="font-mono text-slate-800">
                      ৳{selectedMember.cardRoomBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-900">Total Outstanding Dues:</span>
                    <strong className="font-mono text-rose-700 font-black text-sm">
                      ৳{selectedMember.totalOutstanding.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handlePayFullDues}
                  className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-200 transition-colors text-center"
                >
                  Pay All (৳{selectedMember.totalOutstanding.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={handlePaySubOnly}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors text-center"
                >
                  Subscription Only
                </button>
                <button
                  type="button"
                  onClick={handlePayDinOnly}
                  className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors text-center"
                >
                  Dining Only
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Payment Mode & Sub-Ledger Allocation Form (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Payment Details & Sub-Ledger Allocation</span>
            </h2>
            <span className="text-[11px] font-mono font-bold text-indigo-700">
              Voucher: {paymentMode === "CASH" ? "R1 (Cash Receive)" : "R2 (Bank Receive)"}
            </span>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 block">
              Payment Gateway / Channel
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: "CASH", label: "Cash Desk", icon: Banknote },
                { id: "BKASH", label: "bKash MFS", icon: Smartphone },
                { id: "NAGAD", label: "Nagad MFS", icon: Smartphone },
                { id: "BANK_CARD", label: "POS Card", icon: CreditCard },
                { id: "CHEQUE", label: "Bank Cheque", icon: Building },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMode(m.id as any)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all text-xs font-bold ${
                      paymentMode === m.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px]">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference and Amount Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Total Amount Received (৳)
              </label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={totalPaid}
                onChange={(e) => {
                  setTotalPaid(e.target.value);
                  const amt = parseFloat(e.target.value) || 0;
                  handleAutoAllocate(amt);
                }}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Transaction / Cheque Ref No.
              </label>
              <input
                type="text"
                placeholder={paymentMode === "CASH" ? "Counter Receipt" : "e.g. TrxID 9A8B7C"}
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Bank / Channel Account
              </label>
              <input
                type="text"
                placeholder={paymentMode === "CASH" ? "Cash Counter" : "e.g. City Bank / Sonali"}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Sub-Ledger Allocation Breakdown */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Lumpsum Allocation Across 3 Sub-Ledgers
              </span>
              <button
                type="button"
                onClick={() => handleAutoAllocate(parseFloat(totalPaid) || 0)}
                className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Auto-Distribute
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  Subscription (1121)
                </label>
                <input
                  type="number"
                  value={allocSub}
                  onChange={(e) => setAllocSub(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 font-mono font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  Dining (1122)
                </label>
                <input
                  type="number"
                  value={allocDin}
                  onChange={(e) => setAllocDin(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 font-mono font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  Card Room (1123)
                </label>
                <input
                  type="number"
                  value={allocCard}
                  onChange={(e) => setAllocCard(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 font-mono font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">
                  Advance Deposit (2001)
                </label>
                <input
                  type="number"
                  value={allocAdvance}
                  onChange={(e) => setAllocAdvance(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 font-mono font-semibold text-emerald-700"
                />
              </div>
            </div>

            {/* Balancing Verification */}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500">
                Sum of Allocations: <strong>৳{totalAllocated.toFixed(2)}</strong> /{" "}
                <strong>৳{currentTotalPaidNum.toFixed(2)}</strong>
              </span>

              {isAllocationBalanced ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
                </span>
              ) : (
                <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" /> Mismatch (৳{(currentTotalPaidNum - totalAllocated).toFixed(2)})
                </span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={!isAllocationBalanced || isPending || !selectedMember}
            onClick={handleProcessPayment}
            className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
              !isAllocationBalanced || isPending || !selectedMember
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 active:scale-98"
            }`}
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Posting Receive Voucher & Generating Money Receipt...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Receive Payment & Issue Official Money Receipt</span>
              </>
            )}
          </button>

          {/* Success Banner */}
          {collectionResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                collectionResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              {collectionResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <strong>{collectionResult.success ? "Payment Received!" : "Payment Failed"}</strong>
                <p className="mt-0.5">{collectionResult.message}</p>
                {collectionResult.success && (
                  <button
                    onClick={() => setPrintModalOpen(true)}
                    className="mt-1 text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Re-print Money Receipt ({collectionResult.receiptNo})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Collections Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">
            Recent Money Receipts & Cashier Registry ({recentReceipts.length} collections)
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            PostgreSQL Double-Entry Registry
          </span>
        </div>

        {recentReceipts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No recent payment collections found. Collect a member dues payment using the form above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3">Receipt No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Member No</th>
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  <th className="py-2.5 px-3">GL Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                      {r.receiptNo}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                      {new Date(r.date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                      {r.memberNo}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{r.memberName}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {r.paymentMode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                      ৳{r.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {r.voucherNo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Money Receipt Modal */}
      <PrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        documentType="MONEY_RECEIPT"
        receiptData={activeReceiptData}
      />
    </div>
  );
}
