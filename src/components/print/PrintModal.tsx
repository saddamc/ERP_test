"use client";

import React, { useRef } from "react";
import { Printer, Download, X, FileText, CheckCircle2 } from "lucide-react";
import { VoucherFormData } from "@/types/accounting";
import { MemberProfile } from "@/types/member";
import { MemberStatementRow } from "@/server/actions/member.actions";
import { VoucherPrintSlip } from "./VoucherPrintSlip";
import { MemberStatementPrintSlip } from "./MemberStatementPrintSlip";
import { ThermalChitSlip, ThermalChitItem } from "./ThermalChitSlip";
import { MoneyReceiptSlip, MoneyReceiptData } from "./MoneyReceiptSlip";

export type PrintSlipType = "VOUCHER" | "STATEMENT" | "THERMAL" | "MONEY_RECEIPT";

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: PrintSlipType;
  voucher?: VoucherFormData | null;
  member?: MemberProfile | null;
  statementRows?: MemberStatementRow[];
  chitData?: {
    chitNo?: string;
    facilityName?: string;
    tableNo?: string;
    memberNo: string;
    memberName: string;
    ledgerType: "DINING" | "CARD_ROOM";
    items?: ThermalChitItem[];
    totalAmount: number;
    serverName?: string;
  } | null;
  receiptData?: MoneyReceiptData | null;
}

export function PrintModal({
  isOpen,
  onClose,
  documentType,
  voucher,
  member,
  statementRows = [],
  chitData,
  receiptData,
}: PrintModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const getTitle = () => {
    switch (documentType) {
      case "VOUCHER":
        return `Official Voucher Slip - ${voucher?.voucherNo || ""}`;
      case "STATEMENT":
        return `Member Monthly Statement - ${member?.accountNo || ""}`;
      case "THERMAL":
        return `80mm POS Thermal Chit - ${chitData?.memberNo || ""}`;
      case "MONEY_RECEIPT":
        return `Official Money Receipt - ${receiptData?.receiptNo || ""}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">{getTitle()}</h3>
              <p className="text-[10px] text-slate-400">
                Ready to Print (A4 / 80mm Thermal Printer Supported)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document (Ctrl+P)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document View */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto p-6 bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible"
        >
          {documentType === "VOUCHER" && voucher && (
            <VoucherPrintSlip voucher={voucher} />
          )}

          {documentType === "STATEMENT" && member && (
            <MemberStatementPrintSlip
              member={member}
              statementRows={statementRows}
            />
          )}

          {documentType === "THERMAL" && chitData && (
            <ThermalChitSlip
              chitNo={chitData.chitNo}
              facilityName={chitData.facilityName}
              tableNo={chitData.tableNo}
              memberNo={chitData.memberNo}
              memberName={chitData.memberName}
              ledgerType={chitData.ledgerType}
              items={chitData.items}
              totalAmount={chitData.totalAmount}
              serverName={chitData.serverName}
            />
          )}

          {documentType === "MONEY_RECEIPT" && receiptData && (
            <MoneyReceiptSlip receipt={receiptData} />
          )}
        </div>

        {/* Print Instruction Bar (Hidden on print) */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-2.5 text-[11px] text-slate-500 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Tip: Set printer margins to <strong>None / Minimum</strong> for best A4 alignment.
            </span>
          </div>
          <div>
            <span>Uttara Recreation Club Ltd. Print Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
