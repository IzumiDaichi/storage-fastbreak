"use client";

import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { calcTxn, fmt, fmtSigned } from "@/lib/calc";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  ArrowUpDown,
  Filter,
  RotateCcw,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { CategoryBadge, TagPill, Select } from "@/components/ui";
import { TransactionModal } from "@/components/TransactionModal";
import type { Transaction } from "@/types";

export default function TransactionsPage() {
  const {
    transactions = [],
    activeTerm,
    loading,
    classifications,
    deleteTransaction,
  } = useApp();

  // Ledger Filter States
  const [filterCat, setFilterCat] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // Date Filtering States
  const [dateMode, setDateMode] = useState<"month" | "exact">("month");
  const [filterExactDate, setFilterExactDate] = useState("");

  const [filterAgent, setFilterAgent] = useState(false);
  const [filterTransfer, setFilterTransfer] = useState(false);
  const [filterOther, setFilterOther] = useState(false);
  const [filterTags, setFilterTags] = useState(false);

  // Chronological Sorting State Machine
  const [dateSortOrder, setDateSortOrder] = useState<"latest" | "oldest">(
    "latest",
  );

  // UX Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Isolated Modal Controls
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── COMPUTED PROCESSING PIPELINE (FILTER, CALC, & CHRONO SORT) ────────────────
  // When a developer reads this, it says: "Process and compute financial transaction structures
  // synchronously. Running calcTxn here ensures that the structural records inside the array match
  // perfectly across sorting arrays before slicing operations are committed."
  const filteredAndSortedTransactions = useMemo(() => {
    const filteredList = transactions
      .filter((t) => {
        if (!activeTerm) return false;

        const matchesTerm =
          t.term_id === activeTerm.id ||
          t.term === activeTerm.name ||
          (t as any).termId === activeTerm.id;
        if (!matchesTerm) return false;

        if (filterCat && t.category !== filterCat) return false;
        if (filterClass && t.classification !== filterClass) return false;

        if (dateMode === "month") {
          if (filterMonth && !t.date?.startsWith(filterMonth)) return false;
        } else {
          if (filterExactDate && t.date !== filterExactDate) return false;
        }

        if (filterAgent && !((t.agent_bags || 0) > 0)) return false;
        if (filterTransfer && !((t.transfer_bags || 0) > 0)) return false;
        if (filterOther && !((t.other_exp || 0) > 0)) return false;
        if (filterTags && !(t.tags && t.tags.trim().length > 0)) return false;
        return true;
      })
      .map((t) => ({
        ...t,
        computedMetrics: calcTxn(t), // Secure computation schema attachment
      }));

    return [...filteredList].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;

      return dateSortOrder === "latest" ? timeB - timeA : timeA - timeB;
    });
  }, [
    transactions,
    activeTerm,
    filterCat,
    filterClass,
    filterMonth,
    dateMode,
    filterExactDate,
    filterAgent,
    filterTransfer,
    filterOther,
    filterTags,
    dateSortOrder,
  ]);

  // Defensive Reset Pattern
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filterCat,
    filterClass,
    filterMonth,
    dateMode,
    filterExactDate,
    filterAgent,
    filterTransfer,
    filterOther,
    filterTags,
    dateSortOrder,
    itemsPerPage,
  ]);

  // Derived Window Slice Metrics
  const totalItems = filteredAndSortedTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedTransactions = useMemo(() => {
    return filteredAndSortedTransactions.slice(startIndex, endIndex);
  }, [filteredAndSortedTransactions, startIndex, endIndex]);

  function openAdd() {
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditingId(t.id);
    setModalOpen(true);
  }

  function handleLaunchExternalReceipt(url: string | undefined | null) {
    if (url && window.electronAPI?.openExternalLink) {
      window.electronAPI.openExternalLink(url);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this transaction record?"))
      return;
    try {
      await deleteTransaction(id);
    } catch (e: any) {
      alert("Error executing row disposal: " + e.message);
    }
  }

  const handleResetFilters = () => {
    setFilterCat("");
    setFilterClass("");
    setFilterMonth("");
    setFilterExactDate("");
    setDateMode("month");
    setFilterAgent(false);
    setFilterTransfer(false);
    setFilterOther(false);
    setFilterTags(false);
    setDateSortOrder("latest");
    setItemsPerPage(10);
  };

  if (!activeTerm && !loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] rounded-2xl border border-dashed border-slate-800 bg-slate-950/20 p-8 text-center">
        <CalendarDays size={40} className="text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-slate-300">
          No Target Term Scope Specified
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Please select an active fiscal workspace boundary from the sidebar
          directory timeline to unlock ledger calculations.
        </p>
      </div>
    );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 antialiased text-slate-200 min-h-screen overflow-y-auto">
      {/* Top Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Transaction Ledger
          </h1>
          <p className="text-xs mt-1 flex items-center gap-1.5 text-slate-400">
            Current Workspace:
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[var(--accent)] font-semibold font-mono tracking-wide">
              {activeTerm?.name}
            </span>
          </p>
        </div>
        <button
          onClick={openAdd}
          className="group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer bg-[var(--accent)] text-black hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[var(--accent)]/10"
        >
          <Plus
            size={14}
            className="stroke-[3px] group-hover:rotate-90 transition-transform duration-200"
          />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Filter & Sorting Control Dashboard */}
      <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md shadow-inner space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
            <Filter size={12} className="text-slate-500" /> Filter View:
          </div>

          <div className="min-w-[140px]">
            <Select
              value={filterCat}
              onChange={setFilterCat}
              options={[
                ["", "All Categories"],
                ["Buy", "Buy"],
                ["Sell", "Sell"],
              ]}
            />
          </div>

          <div className="min-w-[160px]">
            <Select
              value={filterClass}
              onChange={setFilterClass}
              options={[
                ["", "All Classifications"],
                ...classifications.map(
                  (c) => [c.name, c.name] as [string, string],
                ),
              ]}
            />
          </div>

          {/* Date Filter Configuration Block */}
          <div className="flex items-center bg-slate-900/40 rounded-lg border border-slate-800/80 p-0.5 gap-1 h-[34px]">
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value as "month" | "exact")}
              className="text-xs px-2 py-1 rounded bg-slate-950 border-0 text-slate-300 font-semibold cursor-pointer focus:outline-none focus:ring-0 h-full"
            >
              <option value="month">By Month</option>
              <option value="exact">Specific Date</option>
            </select>

            <div className="px-1 flex items-center">
              {dateMode === "month" ? (
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="text-xs px-2 py-0.5 rounded border-0 bg-transparent text-slate-200 focus:outline-none w-[120px]"
                />
              ) : (
                <input
                  type="date"
                  value={filterExactDate}
                  onChange={(e) => setFilterExactDate(e.target.value)}
                  className="text-xs px-2 py-0.5 rounded border-0 bg-transparent text-slate-200 focus:outline-none w-[130px] accent-emerald-500"
                />
              )}
            </div>
          </div>

          {/* Integrated Date Sorting */}
          <div className="flex items-center gap-1.5 ml-auto border-l border-slate-800/80 pl-3">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <ArrowUpDown size={12} className="text-slate-500" /> Sort:
            </span>
            <select
              value={dateSortOrder}
              onChange={(e) =>
                setDateSortOrder(e.target.value as "latest" | "oldest")
              }
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-200 font-medium focus:outline-none focus:border-slate-700 cursor-pointer transition-colors h-[32px]"
            >
              <option value="latest">Latest to Oldest</option>
              <option value="oldest">Oldest to Latest</option>
            </select>
          </div>

          <button
            onClick={handleResetFilters}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 transition-all flex items-center gap-1 cursor-pointer h-[32px]"
          >
            <RotateCcw size={12} /> Clear
          </button>
        </div>

        <div className="flex gap-4 flex-wrap pt-2 border-t border-slate-900/60">
          {[
            ["Has Agent Fee", filterAgent, setFilterAgent],
            ["Has Transfer Fee", filterTransfer, setFilterTransfer],
            ["Has Other Expenses", filterOther, setFilterOther],
            ["Has Tags", filterTags, setFilterTags],
          ].map(([label, val, setter]: any) => (
            <label
              key={label}
              className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none text-slate-400 hover:text-slate-200 transition-colors group"
            >
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => setter(e.target.checked)}
                className="rounded border-slate-800 bg-slate-900 text-[var(--accent)] w-3.5 h-3.5 cursor-pointer accent-emerald-500"
              />
              <span className="group-hover:translate-x-[1px] transition-transform duration-150">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Data Ledger Box */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/20 shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto overflow-y-auto max-h-[68vh] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          <table className="w-full border-collapse text-left text-xs table-fixed min-w-[1200px]">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800/80 sticky top-0 z-10 shadow-md">
              <tr>
                <th className="p-3.5 w-[7%] bg-slate-900">Date</th>
                <th className="p-3.5 w-[6%] bg-slate-900">Category</th>
                <th className="p-3.5 w-[10%] bg-slate-900">Classification</th>
                <th className="p-3.5 w-[10%] bg-slate-900">Tags</th>
                <th className="p-3.5 w-[14%] bg-slate-900">Description</th>
                <th className="p-3.5 w-[5%] text-right bg-slate-900">Bags</th>
                <th className="p-3.5 w-[7%] text-right bg-slate-900">Price/Bag</th>
                <th className="p-3.5 w-[8%] text-right bg-slate-900">Gross Total</th>
                <th className="p-3.5 w-[6%] text-right bg-slate-900">Agent</th>
                <th className="p-3.5 w-[6%] text-right bg-slate-900">Transfer</th>
                <th className="p-3.5 w-[6%] text-right bg-slate-900">Other</th>
                <th className="p-3.5 w-[9%] text-right font-semibold bg-slate-900">Net Balance</th>
                <th className="p-3.5 w-[9%] text-center bg-slate-900">Receipt</th>
                <th className="p-3.5 w-[7%] text-center bg-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 text-slate-300 font-medium">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="text-center py-16 text-slate-500 font-medium italic"
                  >
                    No records matched the active filter variables.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => {
                  const c = t.computedMetrics; // Safe, pre-computed parameters
                  const tags = (t.tags || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  const isPositive = c.total >= 0;

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-900/40 group/row transition-colors duration-150"
                    >
                      <td className="p-3 whitespace-nowrap text-slate-400 font-mono tracking-tight">
                        {t.date}
                      </td>
                      <td className="p-3">
                        <CategoryBadge cat={t.category} />
                      </td>
                      <td
                        className="p-3 truncate text-slate-400"
                        title={t.classification}
                      >
                        {t.classification || "—"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap max-w-full">
                          {tags.length ? (
                            tags.map((tag) => <TagPill key={tag} tag={tag} />)
                          ) : (
                            <span className="text-slate-600 font-mono">—</span>
                          )}
                        </div>
                      </td>
                      <td
                        className="p-3 truncate text-slate-300 group-hover/row:text-white transition-colors"
                        title={t.description}
                      >
                        {t.description || "—"}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {t.bags || 0}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-400">
                        {fmt(t.price || 0)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">
                        {fmt(c.saleTotal)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {c.agentCost > 0 ? fmt(c.agentCost) : "—"}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {c.transferCost > 0 ? fmt(c.transferCost) : "—"}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-500">
                        {t.other_exp > 0 ? fmt(t.other_exp) : "—"}
                      </td>
                      <td
                        className={`p-3 text-right font-mono font-bold tracking-tight text-sm ${
                          isPositive ? "text-[var(--accent)]" : "text-rose-400"
                        }`}
                      >
                        {fmtSigned(c.total)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {(t as any).receiptUrl ? (
                          <button
                            onClick={() =>
                              handleLaunchExternalReceipt((t as any).receiptUrl)
                            }
                            className="inline-flex items-center justify-center gap-1 mx-auto px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-emerald-400 text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer"
                          >
                            <FileText size={11} />
                            <span>View Receipt</span>
                          </button>
                        ) : (
                          <span className="text-slate-700 font-mono select-none">
                            —
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1 opacity-40 group-hover/row:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={() => openEdit(t as any)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="bg-slate-900/90 px-4 py-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              Showing{" "}
              <span className="text-slate-200 font-semibold">
                {startIndex + 1}
              </span>{" "}
              to{" "}
              <span className="text-slate-200 font-semibold">
                {Math.min(endIndex, totalItems)}
              </span>{" "}
              of{" "}
              <span className="text-slate-200 font-semibold">{totalItems}</span>{" "}
              transactions
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-slate-700 cursor-pointer"
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="font-medium">
                Page <span className="text-slate-200">{safeCurrentPage}</span>{" "}
                of <span className="text-slate-200">{totalPages}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingId={editingId}
        activeTerm={activeTerm}
        classifications={classifications}
      />
    </div>
  );
}