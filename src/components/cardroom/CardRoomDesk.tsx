"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Trophy,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  CircleDot,
  Dices,
} from "lucide-react";
import { CARD_ROOM_SERVICES, CardRoomServiceItem } from "@/server/data/cardRoomServices";
import {
  createCardRoomChitAction,
  CardRoomOrderItem,
  CardRoomChitResult,
} from "@/server/actions/cardRoom.actions";
import { getMembersList } from "@/server/actions/member.actions";
import { MemberProfile } from "@/types/member";
import { PrintModal } from "@/components/print/PrintModal";

interface CartLine extends CardRoomOrderItem {}

export function CardRoomDesk() {
  const [services] = useState<CardRoomServiceItem[]>(CARD_ROOM_SERVICES);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [tableNo, setTableNo] = useState<string>("Bridge Table #01");
  const [attendantName, setAttendantName] = useState<string>("Bashir (Card Marker #03)");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [chitResult, setChitResult] = useState<CardRoomChitResult | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [thermalData, setThermalData] = useState<any>(null);

  const [isPending, startTransition] = useTransition();

  // Load members on mount
  useEffect(() => {
    async function loadMembers() {
      const list = await getMembersList();
      setMembers(list);
      if (list.length > 0) {
        setSelectedMemberId(list[0].id);
      }
    }
    loadMembers();
  }, []);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  // Cart Management
  const handleAddToCart = (item: CardRoomServiceItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.serviceId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.serviceId === item.id
            ? { ...i, qty: i.qty + 1, amount: (i.qty + 1) * i.rate }
            : i
        );
      } else {
        return [
          ...prev,
          {
            serviceId: item.id,
            name: item.name,
            qty: 1,
            rate: item.rate,
            amount: item.rate,
          },
        ];
      }
    });
  };

  const handleUpdateQty = (serviceId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.serviceId === serviceId) {
            const newQty = i.qty + delta;
            return newQty > 0 ? { ...i, qty: newQty, amount: newQty * i.rate } : null;
          }
          return i;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const handleRemoveItem = (serviceId: string) => {
    setCart((prev) => prev.filter((i) => i.serviceId !== serviceId));
  };

  const handleClearCart = () => {
    setCart([]);
    setChitResult(null);
  };

  // Calculations
  const grandTotal = cart.reduce((sum, i) => sum + i.amount, 0);

  const currentCardBalance = selectedMember ? selectedMember.cardRoomBalance : 0;
  const creditLimit = selectedMember ? selectedMember.creditLimit : 50000;
  const isOverLimit = selectedMember && currentCardBalance + grandTotal > creditLimit;

  // Filter Services
  const filteredServices = services.filter((s) => {
    const matchCat = selectedCategory === "ALL" || s.category === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Execute Chit
  const handlePlaceChit = () => {
    if (!selectedMember || cart.length === 0) return;

    startTransition(async () => {
      const res = await createCardRoomChitAction({
        memberId: selectedMember.id,
        tableNo,
        attendantName,
        items: cart,
        totalAmount: grandTotal,
      });

      setChitResult(res);

      if (res.success && res.thermalData) {
        setThermalData(res.thermalData);
        setPrintModalOpen(true);
        // Refresh local member balance
        setMembers((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id
              ? {
                  ...m,
                  cardRoomBalance: (res.newCardRoomBalance ?? m.cardRoomBalance),
                  totalOutstanding:
                    m.subscriptionBalance +
                    m.diningBalance +
                    (res.newCardRoomBalance ?? m.cardRoomBalance),
                }
              : m
          )
        );
        setCart([]);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-purple-700 rounded-xl flex items-center justify-center text-white shadow-md">
              <Dices className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Card Room, Billiards & Sports Desk
                </h1>
                <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded border border-purple-200">
                  Sub-Ledger Head 1123
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Table hourly session billing, playing card decks & snooker marker chits with member sub-ledger debits and thermal receipts
              </p>
            </div>
          </div>

          {selectedMember && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Selected Member</span>
                <span className="font-bold text-slate-900">
                  {selectedMember.accountNo} - {selectedMember.fullName}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Card Room Dues</span>
                <span className="font-bold text-purple-800 font-mono">
                  ৳{selectedMember.cardRoomBalance.toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Dual-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Services & Tables Catalog (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          {/* Category Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {[
                { id: "ALL", label: "All Services", icon: Sparkles },
                { id: "CARD_TABLE", label: "Card Tables", icon: Dices },
                { id: "BILLIARDS", label: "Snooker / Pool", icon: CircleDot },
                { id: "CONSUMABLE", label: "Decks & Items", icon: Layers },
                { id: "TOURNAMENT", label: "Tournaments", icon: Trophy },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs ${
                      selectedCategory === c.id
                        ? "bg-purple-900 text-white shadow-xs font-bold"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredServices.map((srv) => {
              const inCart = cart.find((i) => i.serviceId === srv.id);
              return (
                <div
                  key={srv.id}
                  onClick={() => handleAddToCart(srv)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                    inCart
                      ? "border-purple-400 bg-purple-50/40 shadow-xs"
                      : "border-slate-200 hover:border-purple-300 hover:shadow-xs bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900">{srv.name}</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {srv.code}
                      </span>
                    </div>
                    {srv.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {srv.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-sm font-black text-purple-900 font-mono">
                      ৳{srv.rate.toLocaleString("en-BD")}{" "}
                      <span className="text-[10px] text-slate-400 font-normal">/ {srv.unit.toLowerCase()}</span>
                    </span>

                    <button
                      type="button"
                      className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{inCart ? `Add (${inCart.qty})` : "Add"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Order Cart & Member Selector (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Dices className="w-4 h-4 text-purple-700" />
              <span>Card Room Chit Ticket</span>
            </h2>
            {cart.length > 0 && (
              <button
                onClick={handleClearCart}
                className="text-[11px] text-rose-600 hover:underline flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Member & Table Form */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Charge to Member
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.accountNo} - {m.fullName} (Card Dues: ৳{m.cardRoomBalance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Table / Facility</label>
                <select
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Bridge Table #01">Bridge Table #01</option>
                  <option value="Bridge Table #02">Bridge Table #02</option>
                  <option value="Rummy Table #03">Rummy Table #03</option>
                  <option value="VIP Card Room #01">VIP Card Room #01</option>
                  <option value="Snooker Championship Table">Snooker Championship Table</option>
                  <option value="9-Ball Pool Board">9-Ball Pool Board</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Attendant / Marker</label>
                <input
                  type="text"
                  value={attendantName}
                  onChange={(e) => setAttendantName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Credit Limit Alert if exceeded */}
          {isOverLimit && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Credit Limit Exceeded:</strong> Member limit is ৳{creditLimit.toLocaleString("en-BD")}, but new card balance would be ৳{(currentCardBalance + grandTotal).toLocaleString("en-BD")}.
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No sessions or items added. Click on any service from the catalog on the left.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.serviceId}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="flex-1 pr-2">
                    <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      ৳{item.rate} × {item.qty} = <strong>৳{item.amount}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleUpdateQty(item.serviceId, -1)}
                      className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs">{item.qty}</span>
                    <button
                      onClick={() => handleUpdateQty(item.serviceId, 1)}
                      className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.serviceId)}
                      className="w-6 h-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-900 text-sm">Total Chit Amount:</span>
              <span className="font-black text-purple-900 font-mono text-base">
                ৳{grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Debited to Member Card Room Sub-Ledger (Head 1123)
            </div>
          </div>

          {/* Order Action Button */}
          <button
            disabled={cart.length === 0 || isOverLimit || isPending}
            onClick={handlePlaceChit}
            className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
              cart.length === 0 || isOverLimit || isPending
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-purple-700 hover:bg-purple-800 active:scale-98"
            }`}
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Posting Chit & Debit Entry...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Charge Card Room Ledger & Print 80mm Chit</span>
              </>
            )}
          </button>

          {/* Result Banner */}
          {chitResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                chitResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              {chitResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <strong>{chitResult.success ? "Card Room Chit Posted!" : "Failed"}</strong>
                <p className="mt-0.5">{chitResult.message}</p>
                {chitResult.success && (
                  <button
                    onClick={() => setPrintModalOpen(true)}
                    className="mt-1 text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Re-print 80mm Thermal Receipt</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Thermal Modal */}
      <PrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        documentType="THERMAL"
        chitData={thermalData}
      />
    </div>
  );
}
