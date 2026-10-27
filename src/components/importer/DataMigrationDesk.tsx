"use client";

import React, { useState, useTransition } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Play,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  RefreshCw,
  Info,
  ShieldCheck,
  Check,
  X,
  FileText,
  UserCheck,
} from "lucide-react";
import {
  importMembersBulkAction,
  importAccountsBulkAction,
  ImportMemberRow,
  ImportAccountRow,
  MigrationResult,
} from "@/server/actions/migration.actions";

// Default 15 legacy club member sample rows
const DEMO_MEMBERS_CSV = `accountNo,title,firstName,middleName,lastName,phone,email,address,city,bloodGroup,profession,creditLimit,subscriptionBalance,diningBalance,cardRoomBalance,spouseName,spouseMobile,child1Name,child2Name,nomineeName,nomineeRelation
PM-0050,Mr.,Kamal,Uddin,Ahmed,01711122233,kamal.ahmed@example.com,House 12 Rd 5 Dhanmondi,Dhaka,B+,Industrialist,100000,12000,4500,1500,Nasreen Kamal,01711122234,Tahmid Kamal,Nafisa Kamal,Nasreen Kamal,Spouse
PM-0051,Dr.,Tariqul,,Islam,01819234567,dr.tariq@hospital.org,Flat 4B Gulshan 1,Dhaka,O+,Consultant Surgeon,150000,15000,8200,0,Farzana Tariq,01819234568,Zayan Tariq,,Farzana Tariq,Spouse
PM-0052,Barrister,Mizanur,,Rahman,01912345678,mizanur.law@chambers.bd,Banani DOHS Rd 3,Dhaka,A+,Senior Advocate,200000,18000,12500,3200,Shireen Rahman,01912345679,Ahsan Rahman,Areeba Rahman,Ahsan Rahman,Son
PM-0053,Engr.,M. A.,,Sayed,01715987654,sayed.engr@techcorp.com,Uttara Sector 7,Dhaka,AB+,Civil Engineer,80000,9000,3100,0,Salma Sayed,01715987655,Sami Sayed,,Salma Sayed,Spouse
PM-0054,Begum,Rasheda,,Khan,01713456789,rasheda.khan@foundation.org,Baridhara Diplomatic Zone,Dhaka,O+,Philanthropist,250000,24000,16800,4500,Anwar Khan,01713456780,Raiyan Khan,Rushda Khan,Raiyan Khan,Son
PM-0055,Mr.,Zahirul,,Haque,01811234890,zahirul.h@investbd.com,Bashundhara R/A Block C,Dhaka,B+,Investment Banker,120000,10500,6400,2100,Samia Haque,01811234891,Zaid Haque,,Samia Haque,Spouse
PM-0056,Prof.,Mustafizur,,Chowdhury,01712098765,mustafiz.c@univ.edu,Lalmatia Block D,Dhaka,A+,Professor & Economist,75000,6000,1800,0,Suraiya Chowdhury,01712098766,Tanvir Chowdhury,Tina Chowdhury,Suraiya Chowdhury,Spouse
PM-0057,Mr.,Syed,Nayeem,Hasan,01914567890,nayeem.hasan@maritime.com,Shantinagar Heights,Dhaka,O+,Shipping Executive,100000,12000,5200,1800,Rehana Hasan,01914567891,Nabil Hasan,,Rehana Hasan,Spouse
PM-0058,Dr.,Nusrat,,Jahan,01718765432,nusrat.cardio@health.bd,Mirpur DOHS Rd 10,Dhaka,B+,Cardiologist,150000,15000,9400,0,Dr. Mahbubul Alam,01718765433,Maisha Mahbub,Mayan Mahbub,Dr. Mahbubul Alam,Husband
PM-0059,Maj. Gen. (Retd),Iqbal,,Karim,01817654321,gen.karim@defence.bd,Mohakhali DOHS,Dhaka,A+,Director & Consultant,200000,18000,11200,2800,Farida Karim,01817654322,Imran Karim,Iffat Karim,Farida Karim,Spouse
PM-0060,Mr.,Asif,,Mahmood,01714321098,asif.mahmood@garmentsbd.com,Gulshan 2 Lake Drive,Dhaka,O+,Managing Director,250000,21000,14300,5600,Shaila Mahmood,01714321099,Arham Mahmood,Alina Mahmood,Shaila Mahmood,Spouse
PM-0061,Mr.,Shahriar,,Kabir,01911987654,shahriar@tradingbd.com,Dhanmondi Rd 27,Dhaka,AB+,Commodity Trader,90000,9000,4100,1200,Afroza Kabir,01911987655,Shayan Kabir,,Afroza Kabir,Spouse
PM-0062,Dr.,Rezaul,,Karim,01716543210,dr.reza@clinic.org,Khilgaon Chowdhury Para,Dhaka,B+,Pediatrician,100000,12000,3800,0,Shamim Reza,01716543211,Rifat Reza,Rania Reza,Shamim Reza,Spouse
PM-0063,Mr.,Tanvir,,Ahmed,01812340987,tanvir@software.io,Uttara Sector 3,Dhaka,O+,Tech Founder & CEO,180000,15000,8900,2400,Sumaiya Ahmed,01812340988,Tashfeen Ahmed,,Sumaiya Ahmed,Spouse
PM-0064,Begum,Ferdousi,,Begum,01715432109,ferdousi.b@heritage.bd,Old DOHS Banani,Dhaka,A+,Tea Estate Owner,220000,24000,15600,3100,Late Qamrul Huda,,Kazi Fahim Huda,Kazi Farhan Huda,Kazi Fahim Huda,Son`;

const DEMO_ACCOUNTS_CSV = `code,name,category,controlHead
1110,Main Cash in Hand,ASSET,1100
1120,Prime Bank Current A/C 102938,ASSET,1100
1130,City Bank Member Collection A/C,ASSET,1100
1140,Security Deposits with Utility Authorities,ASSET,1100
1210,Main Clubhouse Freehold Land,ASSET,1200
1220,Clubhouse Main Infrastructure & Building,ASSET,1200
2110,Staff Gratuity & Provident Fund Payable,LIABILITY,2000
2120,Advance Subscription Received from Members,LIABILITY,2000
4110,Annual General Meeting & Gala Dinner Income,INCOME,4000
5410,Swimming Pool Filtration & Water Treatment,EXPENSE,5000`;

export function DataMigrationDesk() {
  const [migrationChannel, setMigrationChannel] = useState<"members" | "accounts">("members");
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [csvContent, setCsvContent] = useState<string>("");
  const [parsedMemberRows, setParsedMemberRows] = useState<ImportMemberRow[]>([]);
  const [parsedAccountRows, setParsedAccountRows] = useState<ImportAccountRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  // Helper to parse CSV string into objects
  const parseCSV = (content: string, type: "members" | "accounts") => {
    setParseError(null);
    setMigrationResult(null);
    if (!content.trim()) {
      if (type === "members") setParsedMemberRows([]);
      else setParsedAccountRows([]);
      return;
    }

    try {
      const lines = content.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setParseError("CSV must contain at least a header row and one data row.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));

      if (type === "members") {
        const rows: ImportMemberRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] !== undefined ? cols[idx] : "";
          });

          if (rowObj.accountNo && (rowObj.firstName || rowObj.lastName)) {
            rows.push({
              accountNo: rowObj.accountNo,
              prefix: rowObj.prefix || rowObj.accountNo.split("-")[0] || "PM",
              title: rowObj.title || "Mr.",
              firstName: rowObj.firstName || "",
              middleName: rowObj.middleName || "",
              lastName: rowObj.lastName || "",
              phone: rowObj.phone || "",
              email: rowObj.email || "",
              address: rowObj.address || "",
              city: rowObj.city || "Dhaka",
              bloodGroup: rowObj.bloodGroup || "",
              profession: rowObj.profession || "",
              creditLimit: parseFloat(rowObj.creditLimit) || 50000,
              subscriptionBalance: parseFloat(rowObj.subscriptionBalance) || 0,
              diningBalance: parseFloat(rowObj.diningBalance) || 0,
              cardRoomBalance: parseFloat(rowObj.cardRoomBalance) || 0,
              spouseName: rowObj.spouseName || "",
              spouseMobile: rowObj.spouseMobile || "",
              child1Name: rowObj.child1Name || "",
              child2Name: rowObj.child2Name || "",
              nomineeName: rowObj.nomineeName || "",
              nomineeRelation: rowObj.nomineeRelation || "",
            });
          }
        }
        setParsedMemberRows(rows);
      } else {
        const rows: ImportAccountRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] !== undefined ? cols[idx] : "";
          });

          if (rowObj.code && rowObj.name) {
            rows.push({
              code: rowObj.code,
              name: rowObj.name,
              category: (rowObj.category as any) || "EXPENSE",
              controlHead: rowObj.controlHead || "",
            });
          }
        }
        setParsedAccountRows(rows);
      }
    } catch (err: any) {
      setParseError(`CSV Parsing Error: ${err.message}`);
    }
  };

  // Load sample demo data
  const handleLoadDemoData = () => {
    if (migrationChannel === "members") {
      setCsvContent(DEMO_MEMBERS_CSV);
      parseCSV(DEMO_MEMBERS_CSV, "members");
    } else {
      setCsvContent(DEMO_ACCOUNTS_CSV);
      parseCSV(DEMO_ACCOUNTS_CSV, "accounts");
    }
  };

  // Download template CSV file
  const handleDownloadTemplate = () => {
    const templateContent =
      migrationChannel === "members"
        ? "accountNo,title,firstName,middleName,lastName,phone,email,address,city,bloodGroup,profession,creditLimit,subscriptionBalance,diningBalance,cardRoomBalance,spouseName,spouseMobile,child1Name,child2Name,nomineeName,nomineeRelation\nPM-9901,Mr.,Example,Ali,Khan,01700000000,example@club.org,Road 1 House 1,Dhaka,B+,Businessman,50000,5000,2000,0,Mrs. Khan,01700000001,Son Name,Daughter Name,Mrs. Khan,Spouse"
        : "code,name,category,controlHead\n1199,New Bank Branch A/C,ASSET,1100\n5499,Special Maintenance Head,EXPENSE,5000";

    const blob = new Blob([templateContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      migrationChannel === "members"
        ? "club_legacy_members_template.csv"
        : "club_chart_of_accounts_template.csv"
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle file input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      parseCSV(text, migrationChannel);
    };
    reader.readAsText(file);
  };

  // Execute migration transaction
  const handleCommitMigration = () => {
    startTransition(async () => {
      if (migrationChannel === "members") {
        if (parsedMemberRows.length === 0) return;
        const res = await importMembersBulkAction(parsedMemberRows);
        setMigrationResult(res);
      } else {
        if (parsedAccountRows.length === 0) return;
        const res = await importAccountsBulkAction(parsedAccountRows);
        setMigrationResult(res);
      }
    });
  };

  // Calculate member stats
  const totalSub = parsedMemberRows.reduce((acc, r) => acc + (r.subscriptionBalance || 0), 0);
  const totalDin = parsedMemberRows.reduce((acc, r) => acc + (r.diningBalance || 0), 0);
  const totalCrd = parsedMemberRows.reduce((acc, r) => acc + (r.cardRoomBalance || 0), 0);
  const grandTotalDues = totalSub + totalDin + totalCrd;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Legacy Desktop ERP Data Migration Desk
                </h1>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded border border-indigo-200">
                  Batch Ingestion
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Import legacy FoxPro/Access/VB6 desktop records into PostgreSQL 18 with automatic General Ledger balancing
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-300"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Template</span>
            </button>

            <button
              onClick={handleLoadDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors border border-indigo-200 shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Load 15 Demo Records</span>
            </button>
          </div>
        </div>

        {/* Migration Channel Selector Tabs */}
        <div className="mt-5 border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setMigrationChannel("members");
                setCsvContent("");
                setParsedMemberRows([]);
                setMigrationResult(null);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                migrationChannel === "members"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>1. Member Master & 3-SubLedgers (Subscription, Dining, Card Room)</span>
            </button>

            <button
              onClick={() => {
                setMigrationChannel("accounts");
                setCsvContent("");
                setParsedAccountRows([]);
                setMigrationResult(null);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                migrationChannel === "accounts"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>2. Chart of Accounts & Head Hierarchy</span>
            </button>
          </div>

          {/* Input Method Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              onClick={() => setInputMode("paste")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                inputMode === "paste"
                  ? "bg-white text-slate-800 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Direct CSV Paste
            </button>
            <button
              onClick={() => setInputMode("upload")}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                inputMode === "upload"
                  ? "bg-white text-slate-800 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Upload .CSV File
            </button>
          </div>
        </div>
      </div>

      {/* Migration Rule Notification Box */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">PostgreSQL Double-Entry Invariant Rule:</span> When you migrate legacy members with opening balances, our engine automatically creates an opening balanced Journal Voucher (<code>J3-MIG-...</code>) in PostgreSQL.
          It debits the 3 Member Receivables (<code>1121</code>, <code>1122</code>, <code>1123</code>) and credits Retained Surplus (<code>3002</code>), ensuring your Balance Sheet and Trial Balance maintain zero discrepancy (Total Debit = Total Credit).
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            {inputMode === "paste" ? "Paste CSV Content Below" : "Select CSV File from Computer"}
          </label>
          <span className="text-[11px] text-slate-400">
            Comma-delimited format • First row must be header names
          </span>
        </div>

        {inputMode === "paste" ? (
          <div>
            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => {
                setCsvContent(e.target.value);
                parseCSV(e.target.value, migrationChannel);
              }}
              placeholder={`Paste legacy CSV here or click "Load 15 Demo Records" above...`}
              className="w-full font-mono text-xs bg-slate-900 text-emerald-400 p-3.5 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Choose a CSV file to upload</p>
            <p className="text-[11px] text-slate-400 mt-1 mb-3">
              Standard .csv exports from legacy FoxPro, dBase, or Excel
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>
        )}

        {/* Parse Error Display */}
        {parseError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {/* Member Pre-Validation & Aggregate Metrics Banner */}
      {migrationChannel === "members" && parsedMemberRows.length > 0 && (
        <div className="space-y-4">
          {/* Aggregate Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Members Identified
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {parsedMemberRows.length}
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                  Ready to Ingest
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Subscription Dues
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold text-slate-800">
                  ৳{totalSub.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Head 1121</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Dining Dues
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold text-slate-800">
                  ৳{totalDin.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Head 1122</span>
              </div>
            </div>

            <div className="bg-white border border-indigo-200 bg-indigo-50/30 rounded-xl p-3.5 shadow-sm">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                Total Opening Sub-Ledger
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-black text-indigo-900">
                  ৳{grandTotalDues.toLocaleString("en-BD", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Auto-Balanced
                </span>
              </div>
            </div>
          </div>

          {/* Pre-validation Records Grid */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800">
                  Parsed Member Records Pre-Validation Grid ({parsedMemberRows.length} rows)
                </h3>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                  PostgreSQL Staging
                </span>
              </div>

              {/* Commit Action Button */}
              <button
                disabled={isPending}
                onClick={handleCommitMigration}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-md ${
                  isPending
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
                }`}
              >
                {isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing DB Transaction...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Commit {parsedMemberRows.length} Members to PostgreSQL 18</span>
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Account No</th>
                    <th className="py-2.5 px-3">Member Name</th>
                    <th className="py-2.5 px-3">Phone & Email</th>
                    <th className="py-2.5 px-3 text-right">Subscription</th>
                    <th className="py-2.5 px-3 text-right">Dining</th>
                    <th className="py-2.5 px-3 text-right">Card Room</th>
                    <th className="py-2.5 px-3 text-right">Total Dues</th>
                    <th className="py-2.5 px-3">Family / Nominee</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedMemberRows.map((m, idx) => {
                    const rowTotal =
                      (m.subscriptionBalance || 0) +
                      (m.diningBalance || 0) +
                      (m.cardRoomBalance || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">
                          {m.accountNo}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">
                            {m.title} {m.firstName} {m.lastName}
                          </div>
                          <div className="text-[10px] text-slate-500">{m.profession || m.city}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          <div>{m.phone || "—"}</div>
                          <div className="text-[10px] text-slate-400">{m.email || "—"}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          ৳{(m.subscriptionBalance || 0).toLocaleString("en-BD")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          ৳{(m.diningBalance || 0).toLocaleString("en-BD")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          ৳{(m.cardRoomBalance || 0).toLocaleString("en-BD")}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ৳{rowTotal.toLocaleString("en-BD")}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600">
                          {m.spouseName ? (
                            <div>Spouse: {m.spouseName}</div>
                          ) : m.nomineeName ? (
                            <div>Nominee: {m.nomineeName}</div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Valid
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Account Pre-Validation Grid */}
      {migrationChannel === "accounts" && parsedAccountRows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-0">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">
              Parsed Chart of Accounts Structure ({parsedAccountRows.length} heads)
            </h3>

            <button
              disabled={isPending}
              onClick={handleCommitMigration}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-md ${
                isPending
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-95"
              }`}
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to DB...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Commit {parsedAccountRows.length} Accounts to PostgreSQL</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Account Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Parent / Control Head</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedAccountRows.map((a, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-700">{a.code}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{a.name}</td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {a.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500">{a.controlHead || "—"}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Valid
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Migration Transaction Feedback Banner */}
      {migrationResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs shadow-sm ${
            migrationResult.success
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : "bg-rose-50/90 border-rose-200 text-rose-900"
          }`}
        >
          {migrationResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 space-y-1">
            <h4 className="font-bold text-sm">
              {migrationResult.success
                ? "PostgreSQL 18 Migration Transaction Successful"
                : "Migration Transaction Failed"}
            </h4>
            <p className="text-xs leading-relaxed">{migrationResult.message}</p>

            {migrationResult.details && (
              <div className="mt-2 pt-2 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">Subscription Balances:</span>{" "}
                  <strong>
                    ৳{migrationResult.details.subscriptionTotal.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Dining Balances:</span>{" "}
                  <strong>
                    ৳{migrationResult.details.diningTotal.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Card Room Balances:</span>{" "}
                  <strong>
                    ৳{migrationResult.details.cardRoomTotal.toLocaleString("en-BD", {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
