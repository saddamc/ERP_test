"use client";

import React from "react";
import { MemberProfile } from "@/types/member";
import { MemberStatementRow } from "@/server/actions/member.actions";
import { numberToTakaWords } from "@/lib/number-to-words";
import { Building2, QrCode } from "lucide-react";

interface MemberStatementPrintSlipProps {
  member: MemberProfile;
  statementRows: MemberStatementRow[];
  billingMonth?: string;
  organizationName?: string;
}

export function MemberStatementPrintSlip({
  member,
  statementRows,
  billingMonth = "October 2026",
  organizationName = "UTTARA RECREATION CLUB LTD.",
}: MemberStatementPrintSlipProps) {
  const amountInWords = numberToTakaWords(member.totalOutstanding);

  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto border border-slate-300 print:border-none print:p-0 print:m-0 font-sans text-xs">
      {/* Club Letterhead */}
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
          Tel: +880-2-8950000 | Email: billing@urclbd.com | Uttara Recreation Club Ltd.
        </p>
        <div className="mt-2 inline-block px-5 py-1 bg-slate-900 text-white font-bold text-xs tracking-widest uppercase rounded">
          MEMBER MONTHLY BILLING STATEMENT & SUB-LEDGERS
        </div>
      </div>

      {/* Member Details & Billing Period */}
      <div className="grid grid-cols-2 gap-4 mb-4 border border-slate-300 p-3 bg-slate-50/50 print:bg-transparent">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Account No:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{member.accountNo}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Member Name:</span>
            <span className="font-bold text-slate-900">
              {member.title} {member.fullName}
            </span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Contact / Phone:</span>
            <span className="text-slate-800">{member.phone || "N/A"}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Address:</span>
            <span className="text-slate-800 text-[11px]">{member.address || "Dhaka, Bangladesh"}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex">
            <span className="w-32 text-slate-500 font-semibold">Billing Period:</span>
            <span className="font-bold text-slate-900">{billingMonth}</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-500 font-semibold">Statement Date:</span>
            <span className="text-slate-800">
              {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-500 font-semibold">Payment Due Date:</span>
            <span className="font-bold text-rose-700">25-Nov-2026</span>
          </div>
          <div className="flex">
            <span className="w-32 text-slate-500 font-semibold">Credit Limit:</span>
            <span className="font-mono text-slate-800">
              ৳{member.creditLimit.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Isolated Sub-Ledgers Summary KPI Card */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="border border-slate-300 p-2 text-center rounded bg-amber-50/40">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">1. Subscription Dues</div>
          <div className="text-sm font-bold font-mono text-amber-900 mt-0.5">
            ৳{member.subscriptionBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="border border-slate-300 p-2 text-center rounded bg-sky-50/40">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">2. Dining Room Dues</div>
          <div className="text-sm font-bold font-mono text-sky-900 mt-0.5">
            ৳{member.diningBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="border border-slate-300 p-2 text-center rounded bg-emerald-50/40">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">3. Card Room Dues</div>
          <div className="text-sm font-bold font-mono text-emerald-900 mt-0.5">
            ৳{member.cardRoomBalance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="border-2 border-slate-900 p-2 text-center rounded bg-slate-900 text-white">
          <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
            Total Net Payable
          </div>
          <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
            ৳{member.totalOutstanding.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Itemized Chronological Ledger Statement Table */}
      <table className="w-full border-collapse border border-slate-900 mb-4 text-[11px]">
        <thead>
          <tr className="bg-slate-200 text-slate-900 border-b border-slate-900 font-bold uppercase text-[10px]">
            <th className="border border-slate-900 px-2 py-1 text-center w-24">Date</th>
            <th className="border border-slate-900 px-2 py-1 text-left w-24">Ref / Vouch</th>
            <th className="border border-slate-900 px-2 py-1 text-left w-28">Sub-Ledger</th>
            <th className="border border-slate-900 px-2 py-1 text-left">Transaction Details</th>
            <th className="border border-slate-900 px-2 py-1 text-right w-24">Debit (৳)</th>
            <th className="border border-slate-900 px-2 py-1 text-right w-24">Credit (৳)</th>
            <th className="border border-slate-900 px-2 py-1 text-right w-28">Balance (৳)</th>
          </tr>
        </thead>
        <tbody>
          {statementRows.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-6 text-slate-400 italic">
                No statement transactions found for this member period.
              </td>
            </tr>
          ) : (
            statementRows.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-300">
                <td className="border border-slate-400 px-2 py-1 text-center font-mono text-[10px]">
                  {row.date}
                </td>
                <td className="border border-slate-400 px-2 py-1 font-mono font-bold text-slate-700">
                  {row.voucherNo}
                </td>
                <td className="border border-slate-400 px-2 py-1 font-semibold text-slate-800 text-[10px]">
                  {row.ledgerType}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-slate-800">
                  {row.description}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right font-mono font-semibold">
                  {row.debit > 0
                    ? row.debit.toLocaleString("en-BD", { minimumFractionDigits: 2 })
                    : "-"}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right font-mono font-semibold text-emerald-700">
                  {row.credit > 0
                    ? row.credit.toLocaleString("en-BD", { minimumFractionDigits: 2 })
                    : "-"}
                </td>
                <td className="border border-slate-400 px-2 py-1 text-right font-mono font-bold text-slate-900">
                  ৳{row.balance.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))
          )}

          {/* Balance Total Row */}
          <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
            <td colSpan={6} className="border border-slate-900 px-3 py-1.5 text-right uppercase">
              Current Outstanding Balance:
            </td>
            <td className="border border-slate-900 px-2 py-1.5 text-right font-mono text-sm text-slate-950">
              ৳{member.totalOutstanding.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Amount in words */}
      <div className="border border-slate-300 p-2.5 mb-4 bg-slate-50/50 print:bg-transparent">
        <span className="font-bold text-slate-700">Total Payable in Words: </span>
        <span className="font-serif italic font-bold text-slate-900">{amountInWords}</span>
      </div>

      {/* Payment Instructions & Bank Details */}
      <div className="border border-slate-300 p-3 mb-6 bg-slate-50/50 print:bg-transparent grid grid-cols-3 gap-4 text-[10px]">
        <div>
          <div className="font-bold text-slate-800 uppercase mb-1">Bank Payment Methods:</div>
          <div>1. Sonali Bank, Uttara Branch</div>
          <div className="font-mono">A/C: 1101-00294819</div>
          <div>2. Dhaka Bank, Banani Branch</div>
          <div className="font-mono">A/C: 1102-00847291</div>
        </div>

        <div>
          <div className="font-bold text-slate-800 uppercase mb-1">Online & Mobile Banking:</div>
          <div>bKash Merchant: 01700-000000</div>
          <div>Nagad Merchant: 01800-000000</div>
          <div className="text-slate-500 mt-1">* Please use Member No {member.accountNo} as reference.</div>
        </div>

        <div className="text-center flex flex-col items-center justify-center border-l border-slate-300 pl-4">
          <QrCode className="w-10 h-10 text-slate-800 mb-1" />
          <div className="text-[9px] text-slate-500">Scan to Pay via Club App</div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-10 pt-4 text-center text-xs">
        <div className="border-t border-slate-800 pt-1">
          <div className="font-bold text-slate-900">Finance & Accounts Department</div>
          <div className="text-[10px] text-slate-500">Uttara Recreation Club Ltd.</div>
        </div>

        <div className="border-t border-slate-800 pt-1">
          <div className="font-bold text-slate-900">Honorary Secretary</div>
          <div className="text-[10px] text-slate-500">For and on behalf of Executive Committee</div>
        </div>
      </div>

      {/* Tear-off Bank Counterfoil */}
      <div className="mt-8 pt-4 border-t-2 border-dashed border-slate-400">
        <div className="text-[9px] text-center text-slate-400 uppercase tracking-widest mb-2">
          ✂ --- Tear Here & Submit with Bank Deposit Slip or Cash Counterfoil --- ✂
        </div>
        <div className="border border-slate-300 p-2.5 flex items-center justify-between text-[11px] bg-slate-50 print:bg-transparent">
          <div>
            <span className="font-bold">Member: </span>
            <span>{member.accountNo} - {member.fullName}</span>
          </div>
          <div>
            <span className="font-bold">Billing Month: </span>
            <span>{billingMonth}</span>
          </div>
          <div>
            <span className="font-bold">Amount Payable: </span>
            <span className="font-mono font-bold text-slate-950">
              ৳{member.totalOutstanding.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Depositor Signature: ____________</span>
          </div>
        </div>
      </div>
    </div>
  );
}
