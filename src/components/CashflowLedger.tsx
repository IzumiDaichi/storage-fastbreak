"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from "lucide-react";
import { CategoryBadge, TagPill } from "@/components/ui";
import { fmt, fmtSigned } from "@/lib/calc";

interface CashflowLedgerProps {
  paginatedLedgerRows: any[];
  totalPages: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  sortOrder: "desc" | "asc";
  toggleSortOrder: () => void;
}

export function CashflowLedger({
  paginatedLedgerRows,
  totalPages,
  currentPage,
  setCurrentPage,
  sortOrder,
  toggleSortOrder,
}: CashflowLedgerProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Cashflow Ledger From Capital
        </h2>
        
        <div className="flex flex-wrap items-center gap-4 self-end sm:self-auto">
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/20 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
            <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800/80">
              <tr>
                <th onClick={toggleSortOrder} className="p-3.5 cursor-pointer select-none hover:bg-slate-800 hover:text-white transition-colors group/header">
                  <div className="flex items-center gap-2">
                    <span>Execution Date</span>
                    {sortOrder === "desc" ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                  </div>
                </th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Classification</th>
                <th className="p-3.5">Allocated Tags</th>
                <th className="p-3.5">Context Narrative</th>
                <th className="p-3.5 text-right">Bags</th>
                <th className="p-3.5 text-right">Inflow (₱)</th>
                <th className="p-3.5 text-right">Outflow (₱)</th>
                <th className="p-3.5 text-right">Logistics &amp; Fees (₱)</th>
                <th className="p-3.5 text-right">Running Position (₱)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300 font-medium">
              {paginatedLedgerRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-500 font-medium italic">
                    No matching records detected within active timeline scope windows.
                  </td>
                </tr>
              ) : (
                paginatedLedgerRows.map((row) => {
                  const tags = (row.tags || "").split(",").map((s: string) => s.trim()).filter(Boolean);
                  return (
                    <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 font-mono text-slate-400">{row.date}</td>
                      <td className="p-3.5"><CategoryBadge cat={row.category} /></td>
                      <td className="p-3.5 text-slate-400 font-semibold">{row.classification || "—"}</td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag: string) => <TagPill key={tag} tag={tag} />)}
                        </div>
                      </td>
                      <td className="p-3.5 truncate max-w-[200px]" title={row.description}>{row.description || "—"}</td>
                      <td className="p-3.5 text-right font-mono font-bold">{row.bags.toLocaleString()}</td>
                      <td className="p-3.5 text-right font-mono text-emerald-400">{row.inflow > 0 ? fmt(row.inflow) : "—"}</td>
                      <td className="p-3.5 text-right font-mono text-rose-400">{row.outflow > 0 ? fmt(row.outflow) : "—"}</td>
                      <td className="p-3.5 text-right font-mono text-amber-500">{row.ex > 0 ? fmt(row.ex) : "—"}</td>
                      <td className={`p-3.5 text-right font-mono font-bold text-sm ${row.runningPosition >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {fmtSigned(row.runningPosition)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}