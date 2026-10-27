"use client";

import React, { useState, useEffect } from "react";
import { MemberProfile, SubLedgerType } from "@/types/member";
import {
  getMembersList,
  saveMemberAction,
  addMemberChargeAction,
  recordMemberPaymentAction,
  getMemberStatement,
  getMemberSmsLogs,
  MemberStatementRow,
  SmsNotificationItem,
} from "@/server/actions/member.actions";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Users,
  Search,
  Plus,
  Save,
  RotateCcw,
  DollarSign,
  Receipt,
  MessageSquare,
  FileText,
  CreditCard,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Phone,
  Mail,
  MapPin,
  Heart,
  Briefcase,
  UserPlus,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  Send,
  Printer,
} from "lucide-react";
import { PrintModal, PrintSlipType } from "@/components/print/PrintModal";

export function MemberDesk() {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);

  // Search filters (matching legacy right panel)
  const [searchPrefix, setSearchPrefix] = useState("PM");
  const [searchQuery, setSearchQuery] = useState("");

  // Tab switcher (matching legacy left panel)
  const [activeTab, setActiveTab] = useState<
    | "BASIC"
    | "CONTACT"
    | "DATE_CREDIT"
    | "PROFESSION"
    | "REFERENCE"
    | "SPOUSE"
    | "CHILDREN"
    | "NOMINEE"
  >("BASIC");

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);

  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "BANK">("CASH");
  const [allocSub, setAllocSub] = useState(0);
  const [allocDin, setAllocDin] = useState(0);
  const [allocCard, setAllocCard] = useState(0);
  const [allocAdvance, setAllocAdvance] = useState(0);
  const [paymentNarration, setPaymentNarration] = useState("");

  // Charge Form States
  const [chargeLedger, setChargeLedger] = useState<SubLedgerType>("DINING");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDescription, setChargeDescription] = useState("");

  // Statement & SMS Data
  const [statementRows, setStatementRows] = useState<MemberStatementRow[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsNotificationItem[]>([]);

  // Print Slips States
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<PrintSlipType>("STATEMENT");
  const [thermalChitData, setThermalChitData] = useState<any>(null);

  // Feedback banner
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    smsText?: string;
  } | null>(null);

  // Load initial members
  useEffect(() => {
    async function loadMembers() {
      const list = await getMembersList(searchPrefix, searchQuery);
      setMembers(list);
      if (list.length > 0 && !selectedMember) {
        setSelectedMember(list[0]);
      }
    }
    loadMembers();
  }, [searchPrefix, searchQuery]);

  // Load statements & SMS when selected member changes
  useEffect(() => {
    if (selectedMember) {
      getMemberStatement(selectedMember.id).then(setStatementRows);
      getMemberSmsLogs(selectedMember.id).then(setSmsLogs);
    }
  }, [selectedMember?.id]);

  // Handle member field changes
  const handleFieldChange = (field: keyof MemberProfile, value: any) => {
    if (!selectedMember) return;
    setSelectedMember((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Auto-allocate payment button (FIFO across 3 ledgers)
  const handleAutoAllocate = (totalPaid: number) => {
    if (!selectedMember) return;
    let remaining = totalPaid;

    // 1. Subscription first
    const subToPay = Math.min(remaining, selectedMember.subscriptionBalance);
    setAllocSub(subToPay);
    remaining -= subToPay;

    // 2. Dining second
    const dinToPay = Math.min(remaining, selectedMember.diningBalance);
    setAllocDin(dinToPay);
    remaining -= dinToPay;

    // 3. Card Room third
    const cardToPay = Math.min(remaining, selectedMember.cardRoomBalance);
    setAllocCard(cardToPay);
    remaining -= cardToPay;

    // 4. Any leftover is advance
    setAllocAdvance(remaining);
  };

  // Open Payment Modal
  const openPaymentModal = () => {
    if (!selectedMember) return;
    const defaultDue = selectedMember.totalOutstanding;
    setPaymentAmount(defaultDue > 0 ? defaultDue.toString() : "1000");
    handleAutoAllocate(defaultDue > 0 ? defaultDue : 1000);
    setPaymentNarration("Member dues settlement");
    setPaymentModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPayment = async () => {
    if (!selectedMember) return;
    const paid = parseFloat(paymentAmount);
    if (isNaN(paid) || paid <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid payment amount." });
      return;
    }

    try {
      const res = await recordMemberPaymentAction({
        memberId: selectedMember.id,
        totalPaid: paid,
        paymentMode,
        allocations: {
          subscriptionAmount: allocSub,
          diningAmount: allocDin,
          cardRoomAmount: allocCard,
          advanceAmount: allocAdvance,
        },
        narration: paymentNarration,
      });
      if (!res.success || !res.member) {
        setFeedback({ type: "error", message: res.message });
        return;
      }
      const updatedMember = res.member;

      setSelectedMember(updatedMember);
      setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
      setPaymentModalOpen(false);
      setFeedback({
        type: "success",
        message: res.message,
        smsText: res.smsMessage,
      });

      // Refresh statement & SMS
      getMemberStatement(selectedMember.id).then(setStatementRows);
      getMemberSmsLogs(selectedMember.id).then(setSmsLogs);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to record payment." });
    }
  };

  // Submit Charge
  const handleSubmitCharge = async () => {
    if (!selectedMember) return;
    const amt = parseFloat(chargeAmount);
    if (isNaN(amt) || amt <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid charge amount." });
      return;
    }

    try {
      const res = await addMemberChargeAction({
        memberId: selectedMember.id,
        ledgerType: chargeLedger,
        amount: amt,
        description: chargeDescription || `${chargeLedger.replace("_", " ")} bill`,
      });
      if (!res.success || !res.member) {
        setFeedback({ type: "error", message: res.message });
        return;
      }
      const updatedMember = res.member;

      setSelectedMember(updatedMember);
      setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
      setChargeModalOpen(false);
      setChargeAmount("");
      setChargeDescription("");
      setFeedback({
        type: "success",
        message: res.message,
        smsText: res.smsMessage,
      });

      // Refresh statement & SMS
      getMemberStatement(selectedMember.id).then(setStatementRows);
      getMemberSmsLogs(selectedMember.id).then(setSmsLogs);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to add charge." });
    }
  };

  // Save Member Master Info
  const handleSaveMember = async () => {
    if (!selectedMember) return;
    const draftId = selectedMember.id; // a new member's temporary id is replaced by the database id
    const res = await saveMemberAction(selectedMember);
    if (res.success) {
      setMembers((prev) => prev.map((m) => (m.id === draftId ? res.member : m)));
      setSelectedMember(res.member);
      setFeedback({ type: "success", message: res.message });
    } else {
      setFeedback({ type: "error", message: res.message });
    }
  };

  // Add New Member
  const handleAddNewMember = () => {
    const nextNum = members.length + 30;
    const newAc = `PM-0${nextNum}`;
    const newMem: MemberProfile = {
      id: `mem-${Date.now()}`,
      accountNo: newAc,
      prefix: "PM",
      title: "Mr.",
      firstName: "",
      middleName: "",
      lastName: "",
      fullName: "",
      address: "",
      city: "Dhaka",
      phone: "",
      email: "",
      bloodGroup: "B+",
      profession: "",
      creditLimit: 50000.0,
      status: "ACTIVE",
      subscriptionBalance: 0,
      diningBalance: 0,
      cardRoomBalance: 0,
      totalOutstanding: 0,
      spouses: [],
      children: [],
      references: [],
      nominees: [],
    };
    setSelectedMember(newMem);
    setActiveTab("BASIC");
    setFeedback({ type: "success", message: `New Member form initialized (${newAc}).` });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 font-sans text-sm pb-12">
      {/* Alert / Feedback Notification */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl flex flex-col gap-2 shadow-sm transition-all border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold text-sm">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Automated SMS Message Preview */}
          {feedback.smsText && (
            <div className="bg-white/90 border border-emerald-300 p-2.5 rounded-lg text-xs font-mono text-slate-800 flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-800 uppercase text-[10px] block">
                  Simulated Automated SMS Sent to Member:
                </span>
                <span>{feedback.smsText}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ============================================================== */}
        {/* LEFT / CENTER: Member Profile Master & Tabs (8 Cols)          */}
        {/* ============================================================== */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header Form Controls */}
            <div className="bg-slate-900 px-4 py-3 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h2 className="font-bold text-base tracking-wide">
                  Member Details Information
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700 font-mono">
                  {selectedMember ? selectedMember.accountNo : "No Member Selected"}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    selectedMember?.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  }`}
                >
                  {selectedMember?.status || "ACTIVE"}
                </span>
              </div>
            </div>

            {/* Member Names Top Form Row */}
            <div className="p-4 bg-slate-50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-6 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Title
                </label>
                <select
                  value={selectedMember?.title || "Mr."}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  className="w-full bg-white border border-gray-300 px-2 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Maj. Gen.">Maj. Gen.</option>
                  <option value="Brig. Gen.">Brig. Gen.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Engr.">Engr.</option>
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Member A/C No
                </label>
                <input
                  type="text"
                  value={selectedMember?.accountNo || ""}
                  onChange={(e) => handleFieldChange("accountNo", e.target.value)}
                  className="w-full bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={selectedMember?.firstName || ""}
                  onChange={(e) => handleFieldChange("firstName", e.target.value)}
                  className="w-full bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={selectedMember?.lastName || ""}
                  onChange={(e) => handleFieldChange("lastName", e.target.value)}
                  className="w-full bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Full Display Name
                </label>
                <input
                  type="text"
                  value={selectedMember?.fullName || ""}
                  onChange={(e) => handleFieldChange("fullName", e.target.value)}
                  className="w-full bg-white border border-gray-300 px-3 py-1.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Profile Tab Navigation (Matching Legacy Desktop Tabs) */}
            <div className="bg-slate-100 border-b border-gray-200 px-2 flex flex-wrap items-center gap-1 text-xs font-semibold overflow-x-auto">
              {[
                { id: "BASIC", label: "Basic Info." },
                { id: "CONTACT", label: "Add. & Contact" },
                { id: "DATE_CREDIT", label: "Date & Cr. Lim." },
                { id: "PROFESSION", label: "Profession" },
                { id: "REFERENCE", label: "Reference" },
                { id: "SPOUSE", label: "Spouse-1, 2" },
                { id: "CHILDREN", label: "Children (1-4)" },
                { id: "NOMINEE", label: "Nomin. Credit" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-3 border-b-2 text-xs transition-colors ${
                    activeTab === tab.id
                      ? "border-emerald-600 text-emerald-700 bg-white font-bold"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content Body */}
            <div className="p-4 bg-white min-h-[220px]">
              {/* TAB 1: BASIC INFO */}
              {activeTab === "BASIC" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Mobile Phone (for SMS Alerts)
                    </label>
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2.5 py-1.5">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <input
                        type="text"
                        value={selectedMember?.phone || ""}
                        onChange={(e) => handleFieldChange("phone", e.target.value)}
                        placeholder="017XX-XXXXXX"
                        className="w-full text-xs outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-2.5 py-1.5">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <input
                        type="email"
                        value={selectedMember?.email || ""}
                        onChange={(e) => handleFieldChange("email", e.target.value)}
                        placeholder="member@domain.com"
                        className="w-full text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={selectedMember?.bloodGroup || "B+"}
                      onChange={(e) => handleFieldChange("bloodGroup", e.target.value)}
                      className="w-full border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                    >
                      {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 2: ADDRESS & CONTACT */}
              {activeTab === "CONTACT" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Primary Residential Address
                    </label>
                    <textarea
                      rows={2}
                      value={selectedMember?.address || ""}
                      onChange={(e) => handleFieldChange("address", e.target.value)}
                      placeholder="House, Road, Block, Area..."
                      className="w-full border border-gray-300 p-2.5 rounded-lg text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                    <input
                      type="text"
                      value={selectedMember?.city || "Dhaka"}
                      onChange={(e) => handleFieldChange("city", e.target.value)}
                      className="w-full border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: DATE & CREDIT LIMIT */}
              {activeTab === "DATE_CREDIT" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Credit Limit (BDT ৳)
                    </label>
                    <input
                      type="number"
                      value={selectedMember?.creditLimit || 50000}
                      onChange={(e) => handleFieldChange("creditLimit", parseFloat(e.target.value))}
                      className="w-full border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold text-emerald-800 outline-none"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      Max dining/card chit allowance
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                    <select
                      value={selectedMember?.status || "ACTIVE"}
                      onChange={(e) => handleFieldChange("status", e.target.value)}
                      className="w-full border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs outline-none font-bold"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="EXPIRED">EXPIRED</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 4: PROFESSION */}
              {activeTab === "PROFESSION" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Profession & Designation
                    </label>
                    <input
                      type="text"
                      value={selectedMember?.profession || ""}
                      onChange={(e) => handleFieldChange("profession", e.target.value)}
                      placeholder="e.g. Managing Director, Mostuk Group"
                      className="w-full border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: REFERENCE */}
              {activeTab === "REFERENCE" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">
                    Proposer and Seconder Club Member References:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-gray-200 rounded-lg">
                      <span className="font-bold text-xs text-slate-800 block mb-1">
                        1. Proposed By
                      </span>
                      <p className="text-xs">
                        <strong>Member:</strong> {selectedMember?.references?.[0]?.refMemberNo || "N/A"}
                      </p>
                      <p className="text-xs">
                        <strong>Name:</strong> {selectedMember?.references?.[0]?.refName || "None"}
                      </p>
                      <p className="text-xs text-gray-500">
                        <strong>Phone:</strong> {selectedMember?.references?.[0]?.phone || "None"}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-gray-200 rounded-lg">
                      <span className="font-bold text-xs text-slate-800 block mb-1">
                        2. Seconded By
                      </span>
                      <p className="text-xs">
                        <strong>Member:</strong> {selectedMember?.references?.[1]?.refMemberNo || "N/A"}
                      </p>
                      <p className="text-xs">
                        <strong>Name:</strong> {selectedMember?.references?.[1]?.refName || "None"}
                      </p>
                      <p className="text-xs text-gray-500">
                        <strong>Phone:</strong> {selectedMember?.references?.[1]?.phone || "None"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: SPOUSE 1 & 2 */}
              {activeTab === "SPOUSE" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Spouse 1 */}
                    <div className="p-3 bg-slate-50 border border-gray-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500" /> Spouse 1 Details
                        </span>
                        <span className="text-[10px] text-gray-500">Spouse ID.-1</span>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block">Name</label>
                        <input
                          type="text"
                          value={selectedMember?.spouses?.[0]?.name || ""}
                          placeholder="Spouse Name"
                          className="w-full bg-white border border-gray-200 px-2 py-1 rounded text-xs"
                          readOnly
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 block">DOB</label>
                          <span className="font-medium text-gray-800">
                            {selectedMember?.spouses?.[0]?.dob || "Jan-01-1980"}
                          </span>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 block">Blood Group</label>
                          <span className="font-medium text-gray-800">
                            {selectedMember?.spouses?.[0]?.bloodGroup || "A+"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 block">Anniversary</label>
                        <span className="font-medium text-gray-800">
                          {selectedMember?.spouses?.[0]?.anniversary || "Nov-20-2002"}
                        </span>
                      </div>
                    </div>

                    {/* Spouse 2 */}
                    <div className="p-3 bg-slate-50 border border-gray-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500" /> Spouse 2 Details
                        </span>
                        <span className="text-[10px] text-gray-500">Spouse ID.-2</span>
                      </div>
                      <p className="text-xs text-gray-400 italic py-4 text-center">
                        No Spouse-2 Record on file.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: CHILDREN */}
              {activeTab === "CHILDREN" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMember?.children && selectedMember.children.length > 0 ? (
                      selectedMember.children.map((ch, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-slate-50 border border-gray-200 rounded-lg text-xs"
                        >
                          <span className="font-bold text-slate-800 block mb-1">
                            Child {ch.childIndex}: {ch.name}
                          </span>
                          <p className="text-gray-600">Gender: {ch.gender || "N/A"}</p>
                          <p className="text-gray-500">DOB: {ch.dob || "N/A"}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic col-span-2 text-center py-4">
                        No children registered.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 8: NOMINEE */}
              {activeTab === "NOMINEE" && (
                <div className="p-3 bg-slate-50 border border-gray-200 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-slate-800 block mb-1">Nominee Information</span>
                  <p>
                    <strong>Name:</strong> {selectedMember?.nominees?.[0]?.name || "N/A"}
                  </p>
                  <p>
                    <strong>Relation:</strong> {selectedMember?.nominees?.[0]?.relation || "N/A"}
                  </p>
                  <p>
                    <strong>Share:</strong> {selectedMember?.nominees?.[0]?.sharePercent || 100}%
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-3 bg-slate-100 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddNewMember}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Add Member
                </button>
                <button
                  type="button"
                  onClick={handleSaveMember}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>

              <div className="text-xs text-gray-500 font-medium">
                Active Member A/C: <strong>{selectedMember?.accountNo}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT: Live 3-Ledgers Desk & Directory Table (4 Cols)          */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 space-y-4">
          {/* THE 3 INDEPENDENT MEMBER SUB-LEDGERS FINANCIAL CARD */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Member 3-Ledgers Balance
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                {selectedMember?.accountNo}
              </span>
            </div>

            {/* The 3 Running Ledgers Metric Boxes */}
            <div className="space-y-2">
              {/* Ledger 1: Subscription */}
              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">
                    1. Subscription Ledger
                  </span>
                  <span className="text-xs text-gray-500">Monthly / Annual Fees</span>
                </div>
                <span className="font-mono font-bold text-sm text-amber-900">
                  {formatCurrency(selectedMember?.subscriptionBalance)}
                </span>
              </div>

              {/* Ledger 2: Dining Room */}
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-800 block">
                    2. Dining Ledger
                  </span>
                  <span className="text-xs text-gray-500">Restaurant & Food Bills</span>
                </div>
                <span className="font-mono font-bold text-sm text-blue-900">
                  {formatCurrency(selectedMember?.diningBalance)}
                </span>
              </div>

              {/* Ledger 3: Card Room */}
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                    3. Card Room Ledger
                  </span>
                  <span className="text-xs text-gray-500">Gaming & Table Charges</span>
                </div>
                <span className="font-mono font-bold text-sm text-emerald-900">
                  {formatCurrency(selectedMember?.cardRoomBalance)}
                </span>
              </div>

              {/* NET TOTAL OUTSTANDING */}
              <div className="p-3 rounded-lg bg-slate-900 text-white flex items-center justify-between shadow-inner">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Total Net Outstanding
                  </span>
                  <span className="text-[11px] text-slate-400">Sum of All 3 Ledgers</span>
                </div>
                <span className="font-mono font-extrabold text-base text-white">
                  {formatCurrency(selectedMember?.totalOutstanding)}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setChargeModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2 px-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors border border-gray-200"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" /> Add Charge
              </button>

              <button
                type="button"
                onClick={openPaymentModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <DollarSign className="w-3.5 h-3.5" /> Collect Payment
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatementModalOpen(true)}
                className="bg-slate-50 hover:bg-slate-100 text-gray-700 font-medium py-1.5 px-2 rounded-lg text-xs flex items-center justify-center gap-1 border border-gray-200"
              >
                <Receipt className="w-3.5 h-3.5 text-gray-500" /> View Statement
              </button>

              <button
                type="button"
                onClick={() => setSmsModalOpen(true)}
                className="bg-slate-50 hover:bg-slate-100 text-gray-700 font-medium py-1.5 px-2 rounded-lg text-xs flex items-center justify-center gap-1 border border-gray-200"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> SMS Logs ({smsLogs.length})
              </button>
            </div>
          </div>

          {/* MEMBER SEARCH & DIRECTORY TABLE (MATCHING LEGACY RIGHT PANEL) */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-3 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-xs uppercase text-gray-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600" /> Member Directory
              </span>
              <span className="text-[11px] text-gray-500">
                Total: <strong>{members.length}</strong>
              </span>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">
                  ID Prefix
                </label>
                <input
                  type="text"
                  value={searchPrefix}
                  onChange={(e) => setSearchPrefix(e.target.value)}
                  placeholder="PM"
                  className="w-full bg-slate-50 border border-gray-300 px-2 py-1 rounded text-xs font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">
                  Search ID / Name
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter members..."
                  className="w-full bg-slate-50 border border-gray-300 px-2 py-1 rounded text-xs"
                />
              </div>
            </div>

            {/* Members List Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-semibold text-gray-600 sticky top-0">
                  <tr className="border-b">
                    <th className="p-2 border-r">A/C No</th>
                    <th className="p-2 border-r">Name</th>
                    <th className="p-2 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className={`cursor-pointer transition-colors ${
                        selectedMember?.id === m.id
                          ? "bg-emerald-50 text-emerald-950 font-bold"
                          : "hover:bg-slate-50 text-gray-700"
                      }`}
                    >
                      <td className="p-2 font-mono border-r text-emerald-700">{m.accountNo}</td>
                      <td className="p-2 border-r truncate max-w-[120px]">{m.fullName}</td>
                      <td className="p-2 text-right font-mono font-medium">
                        {formatCurrency(m.totalOutstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: INTELLIGENT PAYMENT ALLOCATION & AUTO-SMS MODAL       */}
      {/* ============================================================== */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Record Member Payment &
                  Allocation
                </h3>
                <p className="text-gray-500 text-[11px]">
                  Member: <strong>{selectedMember?.accountNo}</strong> - {selectedMember?.fullName}
                </p>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Paid & Mode */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-gray-200">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Total Paid Amount (BDT ৳)
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                    const val = parseFloat(e.target.value) || 0;
                    handleAutoAllocate(val);
                  }}
                  className="w-full bg-white border border-gray-300 font-mono font-bold text-emerald-700 px-2.5 py-1.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                >
                  <option value="CASH">Cash in Hand (Desk Receipt R1)</option>
                  <option value="BANK">Bank Deposit (Sonali Bank R2)</option>
                </select>
              </div>
            </div>

            {/* The 3 Ledgers Allocation Controls */}
            <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-gray-800">Allocate Payment Across 3 Ledgers:</span>
                <button
                  type="button"
                  onClick={() => handleAutoAllocate(parseFloat(paymentAmount) || 0)}
                  className="text-emerald-700 hover:text-emerald-800 text-[11px] font-semibold underline"
                >
                  Auto-Allocate (Oldest First)
                </button>
              </div>

              {/* Subscription Allocation */}
              <div className="flex items-center justify-between p-2 rounded bg-amber-50/70 border border-amber-200">
                <div>
                  <span className="font-bold text-amber-900 block">Subscription Ledger</span>
                  <span className="text-[10px] text-gray-500">
                    Due: {formatCurrency(selectedMember?.subscriptionBalance)}
                  </span>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    value={allocSub}
                    onChange={(e) => setAllocSub(parseFloat(e.target.value) || 0)}
                    className="w-full text-right bg-white border border-gray-300 px-2 py-1 rounded text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Dining Allocation */}
              <div className="flex items-center justify-between p-2 rounded bg-blue-50/70 border border-blue-200">
                <div>
                  <span className="font-bold text-blue-900 block">Dining Ledger</span>
                  <span className="text-[10px] text-gray-500">
                    Due: {formatCurrency(selectedMember?.diningBalance)}
                  </span>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    value={allocDin}
                    onChange={(e) => setAllocDin(parseFloat(e.target.value) || 0)}
                    className="w-full text-right bg-white border border-gray-300 px-2 py-1 rounded text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Card Room Allocation */}
              <div className="flex items-center justify-between p-2 rounded bg-emerald-50/70 border border-emerald-200">
                <div>
                  <span className="font-bold text-emerald-900 block">Card Room Ledger</span>
                  <span className="text-[10px] text-gray-500">
                    Due: {formatCurrency(selectedMember?.cardRoomBalance)}
                  </span>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    value={allocCard}
                    onChange={(e) => setAllocCard(parseFloat(e.target.value) || 0)}
                    className="w-full text-right bg-white border border-gray-300 px-2 py-1 rounded text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Advance Surplus */}
              <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-gray-200">
                <div>
                  <span className="font-bold text-gray-700 block">Member Advance (Surplus)</span>
                  <span className="text-[10px] text-gray-500">Credits towards future bills</span>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    value={allocAdvance}
                    onChange={(e) => setAllocAdvance(parseFloat(e.target.value) || 0)}
                    className="w-full text-right bg-white border border-gray-300 px-2 py-1 rounded text-xs font-mono font-bold text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* Narration Memo */}
            <div>
              <label className="block font-semibold text-gray-600 mb-1">Payment Narration</label>
              <input
                type="text"
                value={paymentNarration}
                onChange={(e) => setPaymentNarration(e.target.value)}
                placeholder="e.g. October 2026 dues cleared at counter"
                className="w-full bg-slate-50 border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs outline-none"
              />
            </div>

            {/* Automated SMS Notice */}
            <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-lg text-[11px] text-emerald-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                An automated SMS confirmation detailing the reduced balances will be dispatched
                instantly to <strong>{selectedMember?.phone || "member mobile"}</strong> upon
                posting.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitPayment}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm & Send SMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADD CHARGE MODAL                                      */}
      {/* ============================================================== */}
      {chargeModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" /> Post Charge to Member Sub-Ledger
              </h3>
              <button
                onClick={() => setChargeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Target Sub-Ledger</label>
                <select
                  value={chargeLedger}
                  onChange={(e) => setChargeLedger(e.target.value as SubLedgerType)}
                  className="w-full border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none"
                >
                  <option value="DINING">Dining Room (Restaurant & Food Bill)</option>
                  <option value="CARD_ROOM">Card Room (Table Fee / Game Chit)</option>
                  <option value="SUBSCRIPTION">Subscription (Monthly Club Dues)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Charge Amount (BDT ৳)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  className="w-full border border-gray-300 font-mono font-bold text-slate-900 px-2.5 py-1.5 rounded-lg text-sm outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Chit / Bill Description</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner Guest Chit #D-903 / Snooker Table Fee"
                  value={chargeDescription}
                  onChange={(e) => setChargeDescription(e.target.value)}
                  className="w-full border border-gray-300 px-2.5 py-1.5 rounded-lg text-xs outline-none"
                />
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-lg text-[11px] text-blue-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Automated SMS will notify member of the new charge and their updated outstanding
                balance immediately.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setChargeModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCharge}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Post Charge & Send SMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: MEMBER STATEMENT MODAL                                */}
      {/* ============================================================== */}
      {statementModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base uppercase">
                  Member Account Statement
                </h3>
                <p className="text-gray-500 text-[11px]">
                  Account: <strong>{selectedMember?.accountNo}</strong> | {selectedMember?.fullName}
                </p>
              </div>
              <button
                onClick={() => setStatementModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <table className="w-full border-collapse border border-gray-200 text-xs">
              <thead className="bg-slate-100 font-bold text-gray-700">
                <tr className="border-b">
                  <th className="p-2 border-r">Date</th>
                  <th className="p-2 border-r">Voucher #</th>
                  <th className="p-2 border-r">Sub-Ledger</th>
                  <th className="p-2 border-r">Description</th>
                  <th className="p-2 text-right border-r text-emerald-800">Debit (Due)</th>
                  <th className="p-2 text-right border-r text-blue-800">Credit (Paid)</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statementRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-400 italic">
                      No transactions recorded for this member yet.
                    </td>
                  </tr>
                ) : (
                  statementRows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 border-r text-gray-500">{r.date}</td>
                      <td className="p-2 font-mono border-r font-semibold">{r.voucherNo}</td>
                      <td className="p-2 border-r">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 font-semibold text-gray-700">
                          {r.ledgerType}
                        </span>
                      </td>
                      <td className="p-2 border-r">{r.description}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-700 border-r">
                        {r.debit > 0 ? formatCurrency(r.debit) : "-"}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-blue-700 border-r">
                        {r.credit > 0 ? formatCurrency(r.credit) : "-"}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(r.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setThermalChitData({
                    chitNo: `CHIT-${Math.floor(1000 + Math.random() * 9000)}`,
                    facilityName: "DINING ROOM & RESTAURANT",
                    tableNo: "Table #12",
                    memberNo: selectedMember?.accountNo || "",
                    memberName: selectedMember?.fullName || "",
                    ledgerType: "DINING",
                    totalAmount: selectedMember?.diningBalance || 1250,
                  });
                  setPrintDocType("THERMAL");
                  setPrintModalOpen(true);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>Print 80mm POS Chit</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPrintDocType("STATEMENT");
                  setPrintModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official A4 Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: SMS NOTIFICATION AUDIT LOGS MODAL                     */}
      {/* ============================================================== */}
      {smsModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" /> Automated SMS Delivery Logs
              </h3>
              <button
                onClick={() => setSmsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {smsLogs.length === 0 ? (
                <p className="text-center text-gray-400 italic py-6">
                  No automated SMS alerts logged for this member yet.
                </p>
              ) : (
                smsLogs.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg border bg-slate-50 border-gray-200 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">
                        {s.type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-gray-400">{s.timestamp}</span>
                    </div>
                    <p className="font-mono text-gray-800 text-[11px] leading-relaxed">
                      "{s.message}"
                    </p>
                    <span className="text-[10px] text-gray-500 block">
                      Recipient: <strong>{s.phone}</strong> (Delivered via SMS Queue)
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Slip Engine Modal (Official A4 Statement & 80mm POS Chit) */}
      <PrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        documentType={printDocType}
        member={selectedMember}
        statementRows={statementRows}
        chitData={thermalChitData}
      />
    </div>
  );
}
