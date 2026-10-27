"use client";

import React from "react";
import { VoucherFormData } from "@/types/accounting";
import { numberToTakaWords } from "@/lib/number-to-words";
import { Building2 } from "lucide-react";

interface VoucherPrintSlipProps {
  voucher: VoucherFormData;
  organizationName?: string;
}

export function VoucherPrintSlip({
  voucher,
  organizationName = "UTTARA RECREATION CLUB LTD.",
}: VoucherPrintSlipProps) {
  const getVoucherTitle = () => {
    switch (voucher.voucherType) {
      case "JOURNAL":
        return "JOURNAL VOUCHER (J3)";
      case "CASH_PAYMENT":
        return "CASH PAYMENT VOUCHER (P1)";
      case "CASH_RECEIVE":
        return "CASH RECEIVE VOUCHER (R1)";
      case "BANK_PAYMENT":
        return "BANK PAYMENT VOUCHER (P2)";
      case "BANK_RECEIVE":
        return "BANK RECEIVE VOUCHER (R2)";
      case "CONTRA":
        return "CONTRA VOUCHER (C3)";
      default:
        return "ACCOUNTING VOUCHER";
    }
  };

  const amountInWords = numberToTakaWords(voucher.totalDebit);

  return (
    <div className="bg-white text-slate-900 p-8 max-w-4xl mx-auto border border-slate-300 print:border-none print:p-0 print:m-0 font-serif text-xs">
      {/* Club Letterhead */}
      <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Building2 className="w-6 h-6 text-slate-800" />
          <h1 className="text-2xl font-black tracking-wider uppercase text-slate-950 font-sans">
            {organizationName}
          </h1>
        </div>
        <p className="text-[11px] text-slate-600 font-sans">
          House 1, Road 7, Sector 3, Uttara Model Town, Dhaka-1230, Bangladesh
        </p>
        <p className="text-[10px] text-slate-500 font-sans">
          Tel: +880-2-8950000 | Email: accounts@urclbd.com | Uttara Recreation Club Ltd.
        </p>
        <div className="mt-2 inline-block px-4 py-1 bg-slate-900 text-white font-sans font-bold text-xs tracking-widest uppercase rounded">
          {getVoucherTitle()}
        </div>
      </div>

      {/* Voucher Meta Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 border border-slate-300 p-3 bg-slate-50/50 print:bg-transparent font-sans">
        <div className="space-y-1">
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Voucher No:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">{voucher.voucherNo}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Voucher Date:</span>
            <span className="font-semibold text-slate-800">{voucher.voucherDate}</span>
          </div>
          {voucher.paymentTo && (
            <div className="flex">
              <span className="w-28 text-slate-500 font-semibold">Pay To / Recv From:</span>
              <span className="font-semibold text-slate-800">{voucher.paymentTo}</span>
            </div>
          )}
        </div>

        <div className="space-y-1 text-right sm:text-left">
          {voucher.bankName && (
            <div className="flex">
              <span className="w-28 text-slate-500 font-semibold">Bank / Cash Desk:</span>
              <span className="font-semibold text-slate-800">
                {voucher.bankCode} - {voucher.bankName}
              </span>
            </div>
          )}
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Posting Status:</span>
            <span className="font-bold text-emerald-700 uppercase">{voucher.status}</span>
          </div>
          <div className="flex">
            <span className="w-28 text-slate-500 font-semibold">Audit Reference:</span>
            <span className="font-mono text-slate-600">GL-AUD-{voucher.voucherNo}</span>
          </div>
        </div>
      </div>

      {/* Tabular Double-Entry Ledger Lines */}
      <table className="w-full border-collapse border border-slate-900 mb-4 text-[11px] font-sans">
        <thead>
          <tr className="bg-slate-200/80 text-slate-900 border-b border-slate-900 font-bold uppercase text-[10px]">
            <th className="border border-slate-900 px-2 py-1.5 text-center w-10">SL#</th>
            <th className="border border-slate-900 px-2 py-1.5 text-left w-24">A/C Code</th>
            <th className="border border-slate-900 px-2 py-1.5 text-left">Head of Account / Ledger</th>
            <th className="border border-slate-900 px-2 py-1.5 text-left">Line Description / Particulars</th>
            <th className="border border-slate-900 px-2 py-1.5 text-right w-28">Debit (৳)</th>
            <th className="border border-slate-900 px-2 py-1.5 text-right w-28">Credit (৳)</th>
          </tr>
        </thead>
        <tbody>
          {voucher.lines.map((line, idx) => (
            <tr key={idx} className="border-b border-slate-300">
              <td className="border border-slate-400 px-2 py-1 text-center font-mono text-[10px]">
                {idx + 1}
              </td>
              <td className="border border-slate-400 px-2 py-1 font-mono font-bold text-slate-700">
                {line.accountCode}
              </td>
              <td className="border border-slate-400 px-2 py-1 font-semibold text-slate-900">
                {line.accountName}
              </td>
              <td className="border border-slate-400 px-2 py-1 text-slate-700 text-[10px]">
                {line.description || "-"}
              </td>
              <td className="border border-slate-400 px-2 py-1 text-right font-mono font-semibold text-slate-900">
                {line.debit > 0
                  ? line.debit.toLocaleString("en-BD", { minimumFractionDigits: 2 })
                  : "-"}
              </td>
              <td className="border border-slate-400 px-2 py-1 text-right font-mono font-semibold text-slate-900">
                {line.credit > 0
                  ? line.credit.toLocaleString("en-BD", { minimumFractionDigits: 2 })
                  : "-"}
              </td>
            </tr>
          ))}

          {/* Balanced Totals Row */}
          <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-xs">
            <td colSpan={4} className="border border-slate-900 px-3 py-1.5 text-right uppercase">
              Total Balanced Amount (BDT):
            </td>
            <td className="border border-slate-900 px-2 py-1.5 text-right font-mono text-emerald-800">
              ৳{voucher.totalDebit.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </td>
            <td className="border border-slate-900 px-2 py-1.5 text-right font-mono text-emerald-800">
              ৳{voucher.totalCredit.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Amount In Words */}
      <div className="border border-slate-300 p-2.5 mb-3 bg-slate-50/50 print:bg-transparent font-sans">
        <span className="font-bold text-slate-700">Amount in Words: </span>
        <span className="font-serif italic font-bold text-slate-900">{amountInWords}</span>
      </div>

      {/* Narration Memo */}
      <div className="border border-slate-300 p-2.5 mb-8 bg-slate-50/50 print:bg-transparent font-sans">
        <span className="font-bold text-slate-700">Voucher Narration / Memo: </span>
        <span className="text-slate-800">{voucher.narration}</span>
      </div>

      {/* Official 3-Box Signature Approvals */}
      <div className="grid grid-cols-3 gap-6 pt-10 text-center font-sans text-xs">
        <div className="border-t border-slate-800 pt-2">
          <div className="font-bold text-slate-900">Prepared By</div>
          <div className="text-[10px] text-slate-500">Accounts Assistant / Cashier</div>
        </div>

        <div className="border-t border-slate-800 pt-2">
          <div className="font-bold text-slate-900">Checked & Verified</div>
          <div className="text-[10px] text-slate-500">Finance Officer / Auditor</div>
        </div>

        <div className="border-t border-slate-800 pt-2">
          <div className="font-bold text-slate-900">Approved By</div>
          <div className="text-[10px] text-slate-500">Honorary Secretary / President</div>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-8 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400 font-sans">
        Generated electronically by Uttara Recreation Club Ltd. ERP System on {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString("en-US")} | Page 1 of 1
      </div>
    </div>
  );
}
