"use client";

import React from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { numberToTakaWords } from "@/lib/number-to-words";

export interface MoneyReceiptData {
  receiptNo: string;
  date: string;
  memberNo: string;
  memberName: string;
  memberPhone?: string;
  amount: number;
  paymentMode: "CASH" | "BKASH" | "NAGAD" | "BANK_CARD" | "CHEQUE";
  referenceNo?: string;
  bankName?: string;
  allocations: {
    subscription: number;
    dining: number;
    cardRoom: number;
    advance: number;
  };
  previousBalance: number;
  remainingBalance: number;
  receivedBy: string;
}

interface MoneyReceiptSlipProps {
  receipt: MoneyReceiptData;
  organizationName?: string;
}

export function MoneyReceiptSlip({
  receipt,
  organizationName = "UTTARA RECREATION CLUB LTD.",
}: MoneyReceiptSlipProps) {
  const amountInWords = numberToTakaWords(receipt.amount);

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "BKASH":
        return "bKash Mobile Banking";
      case "NAGAD":
        return "Nagad Mobile Banking";
      case "BANK_CARD":
        return "POS Credit / Debit Card";
      case "CHEQUE":
        return "Bank Cheque / Pay Order";
      default:
        return "Cash Counter";
    }
  };

  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto border border-slate-300 print:border-none print:p-0 print:m-0 font-sans text-xs">
      {/* Official Header */}
      <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Building2 className="w-6 h-6 text-slate-800" />
          <h1 className="text-2xl font-black tracking-wider uppercase text-slate-950">
            {organizationName}
          </h1>
        </div>
        <p className="text-[11px] text-slate-600">
          House 1, Road 7, Sector 3, Uttara Model Town, Dhaka-1230, Bangladesh
        </p>
        <p className="text-[10px] text-slate-500">
          Tel: +880-2-8950000 | Email: accounts@urclbd.com | Uttara Recreation Club Ltd.
        </p>
        <div className="mt-2 inline-block px-5 py-1 bg-slate-900 text-white font-bold text-xs tracking-widest uppercase rounded">
          OFFICIAL MONEY RECEIPT (CASH / DIGITAL RECEIPT)
        </div>
      </div>

      {/* Meta Bar */}
      <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-lg mb-4 text-xs font-semibold">
        <div>
          <span className="text-slate-500">Receipt No: </span>
          <strong className="text-indigo-700 font-mono text-sm">{receipt.receiptNo}</strong>
        </div>
        <div>
          <span className="text-slate-500">Date & Time: </span>
          <strong className="text-slate-900">{receipt.date}</strong>
        </div>
        <div>
          <span className="text-slate-500">Payment Mode: </span>
          <strong className="text-emerald-700">{getModeLabel(receipt.paymentMode)}</strong>
        </div>
      </div>

      {/* Member Details */}
      <div className="border border-slate-200 rounded-lg p-3.5 mb-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <div>
            <span className="text-slate-500">Received with thanks from: </span>
            <strong className="text-sm font-bold text-slate-900">{receipt.memberName}</strong>
          </div>
          <div>
            <span className="text-slate-500">Member ID: </span>
            <strong className="font-mono text-slate-900 font-bold">{receipt.memberNo}</strong>
          </div>
        </div>

        {receipt.referenceNo && (
          <div className="text-[11px] text-slate-600 font-mono">
            Transaction / Cheque Ref: <strong>{receipt.referenceNo}</strong>
            {receipt.bankName ? ` (${receipt.bankName})` : ""}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
          <div>
            <span className="text-slate-500">Amount Received: </span>
            <strong className="text-base font-black text-slate-950 font-mono">
              ৳{receipt.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> PAID & CREDITED
          </span>
        </div>

        <div className="text-[11px] text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-100">
          In Words: <strong>{amountInWords}</strong>
        </div>
      </div>

      {/* Sub-Ledger Allocation Table */}
      <div className="mb-4">
        <h4 className="font-bold text-slate-800 text-xs mb-1 uppercase tracking-wide">
          Payment Sub-Ledger Allocation Breakdown
        </h4>
        <table className="w-full text-left border-collapse border border-slate-200 text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <th className="py-2 px-3 border-r border-slate-200">Sub-Ledger Account</th>
              <th className="py-2 px-3 border-r border-slate-200">Account Code</th>
              <th className="py-2 px-3 text-right">Allocated Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipt.allocations.subscription > 0 && (
              <tr>
                <td className="py-1.5 px-3 border-r border-slate-200 font-medium">
                  Monthly Member Subscription Dues
                </td>
                <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-500">
                  Head 1121
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                  ৳{receipt.allocations.subscription.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )}
            {receipt.allocations.dining > 0 && (
              <tr>
                <td className="py-1.5 px-3 border-r border-slate-200 font-medium">
                  Dining Room & Catering Charges
                </td>
                <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-500">
                  Head 1122
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                  ৳{receipt.allocations.dining.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )}
            {receipt.allocations.cardRoom > 0 && (
              <tr>
                <td className="py-1.5 px-3 border-r border-slate-200 font-medium">
                  Card Room Daily Table & Sports Fees
                </td>
                <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-500">
                  Head 1123
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                  ৳{receipt.allocations.cardRoom.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )}
            {receipt.allocations.advance > 0 && (
              <tr>
                <td className="py-1.5 px-3 border-r border-slate-200 font-medium">
                  Member Advance Deposit / Credit Balance
                </td>
                <td className="py-1.5 px-3 border-r border-slate-200 font-mono text-slate-500">
                  Head 2001
                </td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                  ৳{receipt.allocations.advance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold border-t border-slate-300">
              <td colSpan={2} className="py-2 px-3 text-right border-r border-slate-200">
                Total Payment Credited:
              </td>
              <td className="py-2 px-3 text-right font-mono text-sm text-indigo-900">
                ৳{receipt.amount.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Balance Summary Box */}
      <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-8">
        <div>
          <span className="text-slate-500">Previous Total Outstanding: </span>
          <strong className="font-mono text-slate-800">
            ৳{receipt.previousBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </strong>
        </div>
        <div className="text-right">
          <span className="text-slate-500">Net Remaining Outstanding Dues: </span>
          <strong className="font-mono text-base font-black text-rose-700">
            ৳{receipt.remainingBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* Signature Blocks */}
      <div className="grid grid-cols-2 gap-16 text-center text-xs pt-8">
        <div className="border-t border-slate-800 pt-1.5">
          <div className="font-bold text-slate-900">{receipt.receivedBy}</div>
          <div className="text-[10px] text-slate-500">Cashier / Receiving Officer</div>
        </div>

        <div className="border-t border-slate-800 pt-1.5">
          <div className="font-bold text-slate-900">Finance & Accounts Department</div>
          <div className="text-[10px] text-slate-500">Uttara Recreation Club Ltd.</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400">
        This is a computer-generated official money receipt issued by Uttara Recreation Club Ltd. ERP • Retain for your records.
      </div>
    </div>
  );
}
