"use client";

import React from "react";
import { Building2 } from "lucide-react";

export interface ThermalChitItem {
  name: string;
  qty: number;
  rate: number;
  amount: number;
}

interface ThermalChitSlipProps {
  chitNo?: string;
  facilityName?: string;
  tableNo?: string;
  memberNo: string;
  memberName: string;
  ledgerType: "DINING" | "CARD_ROOM";
  items?: ThermalChitItem[];
  totalAmount: number;
  serverName?: string;
  date?: string;
}

export function ThermalChitSlip({
  chitNo = `CHIT-${Math.floor(1000 + Math.random() * 9000)}`,
  facilityName = "RESTAURANT & CATERING ROOM",
  tableNo = "T-14",
  memberNo,
  memberName,
  ledgerType,
  items,
  totalAmount,
  serverName = "Rahim (Steward #08)",
  date = new Date().toLocaleDateString("en-GB") + " " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
}: ThermalChitSlipProps) {
  const defaultItems: ThermalChitItem[] =
    items && items.length > 0
      ? items
      : ledgerType === "DINING"
      ? [
          { name: "Special Club Beef Kacchi Biryani", qty: 2, rate: 450, amount: 900 },
          { name: "Chicken Reshmi Kebab (4 Pcs)", qty: 1, rate: 250, amount: 250 },
          { name: "Fresh Lime Soda (Sweet)", qty: 2, rate: 50, amount: 100 },
        ]
      : [
          { name: "Card Room Table Hourly Fee (Bridge)", qty: 3, rate: 200, amount: 600 },
          { name: "Premium Plastic Decks (2 Packets)", qty: 2, rate: 150, amount: 300 },
        ];

  const subtotal = defaultItems.reduce((s, i) => s + i.amount, 0);
  const serviceCharge = Math.round(subtotal * 0.05); // 5% service charge
  const grandTotal = totalAmount || subtotal + serviceCharge;

  return (
    <div className="w-[300px] bg-white text-black p-4 font-mono text-[11px] leading-tight mx-auto border border-dashed border-gray-400 print:border-none print:w-[80mm] print:p-2 print:m-0">
      {/* Header */}
      <div className="text-center pb-2 border-b border-black">
        <div className="font-bold text-sm uppercase tracking-wider">UTTARA RECREATION CLUB LTD.</div>
        <div className="text-[10px] font-semibold">{facilityName}</div>
        <div className="text-[9px] text-gray-600">Sector-03, Uttara Model Town, Dhaka</div>
        <div className="font-bold text-xs mt-1 uppercase tracking-widest border border-black inline-block px-2 py-0.5">
          {ledgerType === "DINING" ? "DINING CHIT SLIP" : "CARD ROOM CHIT"}
        </div>
      </div>

      {/* Meta Info */}
      <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
        <div className="flex justify-between">
          <span>Chit No:</span>
          <span className="font-bold">{chitNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Date/Time:</span>
          <span>{date}</span>
        </div>
        <div className="flex justify-between">
          <span>Table/Room:</span>
          <span className="font-bold">{tableNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Steward/Attendant:</span>
          <span>{serverName}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-dotted border-gray-400">
          <span className="font-bold">Member No:</span>
          <span className="font-bold text-xs">{memberNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Member Name:</span>
          <span className="font-bold truncate max-w-[170px]">{memberName}</span>
        </div>
      </div>

      {/* Items Table */}
      <div className="py-2 border-b border-black">
        <div className="flex justify-between font-bold text-[10px] uppercase border-b border-dotted border-black pb-1 mb-1">
          <span className="w-36">Item</span>
          <span className="w-8 text-center">Qty</span>
          <span className="w-12 text-right">Rate</span>
          <span className="w-14 text-right">Amt</span>
        </div>

        {defaultItems.map((item, idx) => (
          <div key={idx} className="flex justify-between py-0.5 text-[10px]">
            <span className="w-36 truncate">{item.name}</span>
            <span className="w-8 text-center">{item.qty}</span>
            <span className="w-12 text-right">{item.rate}</span>
            <span className="w-14 text-right font-bold">{item.amount}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="py-2 space-y-1 text-[11px] border-b border-black">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>৳{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-700">
          <span>Service Charge (5%):</span>
          <span>৳{serviceCharge.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-black">
          <span>Total Charged to {ledgerType}:</span>
          <span>৳{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Signature & Acknowledgment */}
      <div className="pt-4 text-center">
        <div className="text-[9px] italic text-gray-700 mb-6 leading-tight">
          "I certify that I have received the above items and authorize debit of BDT {grandTotal.toFixed(2)} to my Club {ledgerType.replace("_", " ")} Account."
        </div>

        <div className="border-t border-black pt-1 w-44 mx-auto font-bold text-[10px]">
          Member Signature
        </div>
        <div className="text-[9px] text-gray-500 mt-0.5">{memberNo} - {memberName}</div>
      </div>

      {/* Footer */}
      <div className="pt-3 text-center text-[8px] text-gray-500 border-t border-dotted border-gray-400 mt-3">
        *** Thank You For Visiting The Club ***
      </div>
    </div>
  );
}
