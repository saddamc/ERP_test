"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Utensils,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  UserCheck,
  Coffee,
  Flame,
  Soup,
  Cake,
  RefreshCw,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { CLUB_DINING_MENU, MenuItem } from "@/server/data/diningMenu";
import {
  createDiningOrderAction,
  DiningOrderItem,
  DiningOrderResult,
} from "@/server/actions/dining.actions";
import { getMembersList } from "@/server/actions/member.actions";
import { MemberProfile } from "@/types/member";
import { PrintModal } from "@/components/print/PrintModal";

interface CartLine extends DiningOrderItem {}

export function DiningPosDesk() {
  const [menuItems] = useState<MenuItem[]>(CLUB_DINING_MENU);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [menuSearch, setMenuSearch] = useState<string>("");

  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [tableNo, setTableNo] = useState<string>("Table #04 (Main Hall)");
  const [stewardName, setStewardName] = useState<string>("Rahim (Steward #08)");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderResult, setOrderResult] = useState<DiningOrderResult | null>(null);
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
  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.itemId === item.id
            ? { ...i, qty: i.qty + 1, amount: (i.qty + 1) * i.rate }
            : i
        );
      } else {
        return [
          ...prev,
          {
            itemId: item.id,
            name: item.name,
            qty: 1,
            rate: item.rate,
            amount: item.rate,
          },
        ];
      }
    });
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.itemId === itemId) {
            const newQty = i.qty + delta;
            return newQty > 0 ? { ...i, qty: newQty, amount: newQty * i.rate } : null;
          }
          return i;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleClearCart = () => {
    setCart([]);
    setOrderResult(null);
  };

  // Calculations
  const subtotal = cart.reduce((sum, i) => sum + i.amount, 0);
  const serviceCharge = Math.round(subtotal * 0.05); // 5% service charge
  const grandTotal = subtotal + serviceCharge;

  const currentDiningBalance = selectedMember ? selectedMember.diningBalance : 0;
  const creditLimit = selectedMember ? selectedMember.creditLimit : 50000;
  const isOverLimit = selectedMember && currentDiningBalance + grandTotal > creditLimit;

  // Filter Menu
  const filteredMenu = menuItems.filter((i) => {
    const matchCat = selectedCategory === "ALL" || i.category === selectedCategory;
    const matchSearch =
      !menuSearch.trim() ||
      i.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      i.code.toLowerCase().includes(menuSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // Execute Order
  const handlePlaceOrder = () => {
    if (!selectedMember || cart.length === 0) return;

    startTransition(async () => {
      const res = await createDiningOrderAction({
        memberId: selectedMember.id,
        tableNo,
        serverName: stewardName,
        items: cart,
        subtotal,
        serviceCharge,
        totalAmount: grandTotal,
        paymentMethod: "MEMBER_ACCOUNT",
      });

      setOrderResult(res);

      if (res.success && res.thermalData) {
        setThermalData(res.thermalData);
        setPrintModalOpen(true);
        // Refresh member balance locally
        setMembers((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id
              ? {
                  ...m,
                  diningBalance: (res.newDiningBalance ?? m.diningBalance),
                  totalOutstanding:
                    m.subscriptionBalance +
                    (res.newDiningBalance ?? m.diningBalance) +
                    m.cardRoomBalance,
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
            <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Utensils className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Dining Room POS & Kitchen Order Desk
                </h1>
                <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded border border-amber-200">
                  Thermal POS Chit 80mm
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Steward dining order entry with live member dining credit verification, sub-ledger debit, and automated GL posting
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
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Dining Dues</span>
                <span className="font-bold text-amber-700 font-mono">
                  ৳{selectedMember.diningBalance.toLocaleString("en-BD")}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Dual-Panel POS Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Food Catalog (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          {/* Category Tabs & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {[
                { id: "ALL", label: "All Items", icon: Sparkles },
                { id: "GRILL_KEBAB", label: "Grill & Kebab", icon: Flame },
                { id: "MAIN_COURSE", label: "Mains & Biryani", icon: Utensils },
                { id: "APPETIZER", label: "Soups & Snacks", icon: Soup },
                { id: "BEVERAGE", label: "Beverages", icon: Coffee },
                { id: "DESSERT", label: "Dessert & Bakery", icon: Cake },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs ${
                      selectedCategory === c.id
                        ? "bg-slate-900 text-white shadow-xs font-bold"
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
                placeholder="Search food item..."
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredMenu.map((item) => {
              const inCart = cart.find((i) => i.itemId === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => handleAddToCart(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                    inCart
                      ? "border-amber-400 bg-amber-50/40 shadow-xs"
                      : "border-slate-200 hover:border-amber-300 hover:shadow-xs bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900">{item.name}</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.code}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="text-sm font-black text-amber-800 font-mono">
                      ৳{item.rate.toLocaleString("en-BD")}
                    </span>

                    <button
                      type="button"
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
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
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Current Table Order Chit
              </h2>
            </div>
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
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.accountNo} - {m.fullName} (Due: ৳{m.diningBalance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Table / Hall</label>
                <select
                  value={tableNo}
                  onChange={(e) => setTableNo(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Table #01 (Main Hall)">Table #01 (Main Hall)</option>
                  <option value="Table #02 (Main Hall)">Table #02 (Main Hall)</option>
                  <option value="Table #04 (Main Hall)">Table #04 (Main Hall)</option>
                  <option value="Table #10 (VIP Lounge)">Table #10 (VIP Lounge)</option>
                  <option value="Table #15 (Rooftop Terrace)">Table #15 (Rooftop Terrace)</option>
                  <option value="Table #20 (Poolside Gazebo)">Table #20 (Poolside Gazebo)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Steward / Attendant</label>
                <input
                  type="text"
                  value={stewardName}
                  onChange={(e) => setStewardName(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Credit Limit Alert if exceeded */}
          {isOverLimit && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Credit Limit Exceeded:</strong> Member limit is ৳{creditLimit.toLocaleString("en-BD")}, but new dining balance would be ৳{(currentDiningBalance + grandTotal).toLocaleString("en-BD")}.
              </div>
            </div>
          )}

          {/* Cart Items List */}
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No items added. Click on any food item from the menu catalog on the left.
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.itemId}
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
                      onClick={() => handleUpdateQty(item.itemId, -1)}
                      className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs">{item.qty}</span>
                    <button
                      onClick={() => handleUpdateQty(item.itemId, 1)}
                      className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.itemId)}
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
            <div className="flex justify-between text-slate-600">
              <span>Food & Beverage Subtotal:</span>
              <span className="font-mono font-semibold">৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Club Service Charge (5%):</span>
              <span className="font-mono font-semibold">৳{serviceCharge.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-900 text-sm">Grand Total (Net):</span>
              <span className="font-black text-amber-700 font-mono text-base">
                ৳{grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Order Action Button */}
          <button
            disabled={cart.length === 0 || isOverLimit || isPending}
            onClick={handlePlaceOrder}
            className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 ${
              cart.length === 0 || isOverLimit || isPending
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700 active:scale-98"
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
                <span>Charge Member Account & Print 80mm Chit</span>
              </>
            )}
          </button>

          {/* Order Result Banner */}
          {orderResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                orderResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              {orderResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <strong>{orderResult.success ? "Chit Posted!" : "Failed"}</strong>
                <p className="mt-0.5">{orderResult.message}</p>
                {orderResult.success && (
                  <button
                    onClick={() => setPrintModalOpen(true)}
                    className="mt-1 text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-1"
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
