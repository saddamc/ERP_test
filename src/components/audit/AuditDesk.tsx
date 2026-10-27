"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  UserCheck,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Database,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { getAuditLogsAction, AuditRecord } from "@/server/actions/audit.actions";

export function AuditDesk() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchLogs = (action?: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const data = await getAuditLogsAction(action);
        setLogs(data);
      } catch (err: any) {
        console.error("Failed to fetch audit logs:", err);
        setError(err.message || "Failed to load audit logs");
        setLogs([]);
      }
    });
  };

  useEffect(() => {
    fetchLogs(selectedFilter);
  }, [selectedFilter]);

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.entityId.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      l.userRole.toLowerCase().includes(q)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "VOUCHER_POSTED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "VOUCHER_REVERSED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "MONTHLY_BILLING_RUN":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "BULK_MEMBER_MIGRATION":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "MEMBER_SAVED":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-amber-400 shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  System Audit Trail & Security Activity Desk
                </h1>
                <span className="bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded border border-amber-200">
                  Immutable Log
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Executive & Internal Auditor compliance registry recording all journal entries, reversals, member updates, and migrations
              </p>
            </div>
          </div>

          <button
            disabled={isPending}
            onClick={() => fetchLogs(selectedFilter)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors border border-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>Refresh Audit Logs</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-5 border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All Activity" },
              { id: "MONTHLY_BILLING_RUN", label: "Billing Runs" },
              { id: "BULK_MEMBER_MIGRATION", label: "Data Migrations" },
              { id: "VOUCHER_POSTED", label: "Vouchers Posted" },
              { id: "VOUCHER_REVERSED", label: "Reversals" },
              { id: "MEMBER_SAVED", label: "Member Profile Edits" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                  selectedFilter === f.id
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by action, user, or ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Error Feedback Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-3 text-xs shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <div className="font-bold text-rose-900">Access Restricted / Error Loading Audit Trail</div>
            <div className="text-rose-700 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-0">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-800">
              System Audit Event Records ({filteredLogs.length} events)
            </h3>
            <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
              Read-Only Security Log
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            Recorded in PostgreSQL <code>AuditLog</code> table
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No audit records match the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action Event</th>
                  <th className="py-2.5 px-3">Entity Type</th>
                  <th className="py-2.5 px-3">Entity / Voucher ID</th>
                  <th className="py-2.5 px-3">Executed By</th>
                  <th className="py-2.5 px-3">Event Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("en-GB")}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${getActionBadge(
                          l.action
                        )}`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{l.entityType}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-700 font-bold">{l.entityId}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800">{l.userName}</div>
                      <div className="text-[10px] text-slate-400">{l.userRole}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 max-w-xs truncate">
                      {l.newValues ? JSON.stringify(l.newValues) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
