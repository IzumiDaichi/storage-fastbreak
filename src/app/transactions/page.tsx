"use client";

import { useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { TransactionDetailsModal } from "@/features/transactions/components/TransactionDetailsModal";
import { TransactionModal } from "@/features/transactions/components/TransactionModal";
import { useTransactionFilters } from "@/features/transactions/hooks/useTransactionFilters";
import { TransactionFilters } from "@/features/transactions/components/TransactionFilters";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import type { Transaction } from "@/types";

export default function TransactionsPage() {
  const { activeTerm, loading, classifications, transactions, deleteTransaction } = useApp();
  const {
    searchQuery,
    setSearchQuery,
    filterCat,
    setFilterCat,
    filterClass,
    setFilterClass,
    filterMonth,
    setFilterMonth,
    dateMode,
    setDateMode,
    filterExactDate,
    setFilterExactDate,
    filterAgent,
    setFilterAgent,
    filterTransfer,
    setFilterTransfer,
    filterOther,
    setFilterOther,
    filterTags,
    setFilterTags,
    filterConnected,
    setFilterConnected,
    dateSortOrder,
    setDateSortOrder,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    suggestedFilterClassifications,
    paginatedTransactions,
    totalItems,
    totalPages,
    safeCurrentPage,
    startIndex,
    endIndex,
    resetFilters,
  } = useTransactionFilters();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewedTransaction, setViewedTransaction] = useState<Transaction | null>(null);

  function openAdd() {
    setEditingId(null);
    setViewedTransaction(null);
    setModalMode("add");
    setModalOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditingId(t.id);
    setViewedTransaction(null);
    setModalMode("edit");
    setModalOpen(true);
  }

  function openView(t: Transaction) {
    setEditingId(null);
    setViewedTransaction(t);
    setModalMode("view");
    setModalOpen(true);
  }

  function getLinkedTransaction(t: Transaction | null) {
    if (!t) return null;

    if (t.category === "Sell") {
      if (t.linked_buy_uid) {
        return transactions.find((candidate) => candidate.uid === t.linked_buy_uid) || null;
      }

      return t.linked_buy_id
        ? transactions.find((candidate) => candidate.id === t.linked_buy_id) || null
        : null;
    }

    return transactions.find(
      (candidate) =>
        candidate.category === "Sell" &&
        (candidate.linked_buy_uid === t.uid || candidate.linked_buy_id === t.id),
    ) || null;
  }

  function handleLaunchExternalReceipt(url: string | undefined | null) {
    if (url && window.electronAPI?.openExternalLink) {
      window.electronAPI.openExternalLink(url);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this transaction record?")) return;

    try {
      await deleteTransaction(id);
    } catch (e: any) {
      alert("Error executing row disposal: " + e.message);
    }
  }

  if (!activeTerm && !loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] rounded-2xl border border-dashed border-slate-800 bg-slate-950/20 p-8 text-center">
        <CalendarDays size={40} className="text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-slate-300">No Target Term Scope Specified</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1">
          Please select an active fiscal workspace boundary from the sidebar directory timeline to unlock ledger calculations.
        </p>
      </div>
    );

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 antialiased text-slate-200 min-h-screen overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)]" title="Transaction Ledger">
            Transaction Ledger
          </h1>
          <p className="text-xs mt-1 flex items-center gap-1.5 text-slate-400">
            Current Workspace:
            <span className="term border uppercase font-bold tracking-wide">
              {activeTerm?.name}
            </span>
          </p>
        </div>
        <button
          onClick={openAdd}
          className="group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer bg-[var(--accent)] text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[var(--accent)]/10"
        >
          <Plus size={14} className="stroke-[3px] group-hover:rotate-90 transition-transform duration-200" />
          <span>Add Transaction</span>
        </button>
      </div>

      <TransactionFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterClass={filterClass}
        setFilterClass={setFilterClass}
        filterMonth={filterMonth}
        setFilterMonth={setFilterMonth}
        dateMode={dateMode}
        setDateMode={setDateMode}
        filterExactDate={filterExactDate}
        setFilterExactDate={setFilterExactDate}
        filterAgent={filterAgent}
        setFilterAgent={setFilterAgent}
        filterTransfer={filterTransfer}
        setFilterTransfer={setFilterTransfer}
        filterOther={filterOther}
        setFilterOther={setFilterOther}
        filterTags={filterTags}
        setFilterTags={setFilterTags}
        filterConnected={filterConnected}
        setFilterConnected={setFilterConnected}
        dateSortOrder={dateSortOrder}
        setDateSortOrder={setDateSortOrder}
        suggestedFilterClassifications={suggestedFilterClassifications}
        onReset={resetFilters}
      />

      <TransactionTable
        loading={loading}
        paginatedTransactions={paginatedTransactions}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        totalPages={totalPages}
        safeCurrentPage={safeCurrentPage}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
        onView={openView}
        onEdit={openEdit}
        onDelete={handleDelete}
        onOpenReceipt={handleLaunchExternalReceipt}
      />

      <TransactionModal
        isOpen={modalOpen && modalMode !== "view"}
        onClose={() => setModalOpen(false)}
        editingId={editingId}
        mode={modalMode}
        activeTerm={activeTerm}
        classifications={classifications}
      />

      <TransactionDetailsModal
        isOpen={modalOpen && modalMode === "view"}
        onClose={() => {
          setModalOpen(false);
          setViewedTransaction(null);
        }}
        transaction={viewedTransaction}
        linkedTransaction={getLinkedTransaction(viewedTransaction)}
      />
    </div>
  );
}