"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { fmt, fmtSigned } from "@/lib/calc";
import { LoadingSpinner, NoTerm } from "@/components/ui";
import { Activity, ShoppingBag, ArrowDownLeft, ArrowUpRight, Scale, TrendingUp, Wallet } from "lucide-react";
import { getClassificationItems, getCashflowRows, getDashboardMetrics } from "@/lib/dashboard";

// Import modular architectural components
import { StartingCapitalControl } from "@/components/Dashboard/StartingCapital";
import { DashboardCharts } from "@/components/Dashboard/DashboardCharts";
import { ExpenseBreakdown } from "@/components/Dashboard/ExpenseBreakdown";
import { CashflowLedger } from "@/components/Dashboard/CashflowLedger";

// Internal Sub-component MetricCard
interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  valueColorClass?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}

function MetricCard({ label, value, sub, valueColorClass = "text-[var(--text)]", highlight, icon }: MetricCardProps) {
  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${highlight ? "border-emerald-500/30 bg-emerald-500/[0.04] shadow-md shadow-emerald-500/5" : "border-[var(--border)] bg-[var(--bg4)] backdrop-blur-sm"}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
      <p className={`text-xl font-bold font-mono tracking-tight ${valueColorClass}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1 truncate font-medium">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { transactions = [], activeTerm, loading, capitalRecords = [], updateCapitalRecord } = useApp() as any;
  const [starting, setStarting] = useState<number>(0);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const rowsPerPage = 10;

  useEffect(() => {
    if (!activeTerm) {
      setStarting(0);
      setInputValue("");
      setIsEditing(false);
      setCurrentPage(1);
      return;
    }

    const record = capitalRecords.find((c: any) => c.term_id === activeTerm.id);
    const parsed = record ? record.starting_capital : 0;
    setStarting(parsed);
    setInputValue(record ? String(parsed) : "");
    setIsEditing(false);
    setCurrentPage(1);
  }, [activeTerm, capitalRecords]);

  const termTransactions = useMemo(() => {
    if (!activeTerm) return [];
    return transactions.filter((t: any) => t.term_id === activeTerm.id || t.term === activeTerm.name);
  }, [transactions, activeTerm]);

  const financialMetrics = useMemo(() => getDashboardMetrics(termTransactions, starting), [termTransactions, starting]);

  const chartData = useMemo(() => {
    const { buyCost, sellRevenue, netProfit } = financialMetrics;
    return [
      { label: "Total Purchases", value: buyCost, color: "#f43f5e" },
      { label: "Total Sales", value: sellRevenue, color: "#10b981" },
      { label: "Net Profit", value: netProfit, color: netProfit >= 0 ? "#10b981" : "#f43f5e" },
    ];
  }, [financialMetrics]);

  const expItems = useMemo(() => {
    const { totalAgent, totalTransfer, totalOther } = financialMetrics;
    return [
      { label: "Agent Fees", value: totalAgent },
      { label: "Transfer Fees", value: totalTransfer },
      { label: "Other Expenses", value: totalOther },
    ];
  }, [financialMetrics]);

  const classItems = useMemo(() => getClassificationItems(termTransactions), [termTransactions]);

  const cashflowLedgerRows = useMemo(
    () => getCashflowRows(termTransactions, starting, sortOrder),
    [termTransactions, starting, sortOrder]
  );

  const totalPages = Math.ceil(cashflowLedgerRows.length / rowsPerPage) || 1;
  const paginatedLedgerRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return cashflowLedgerRows.slice(startIndex, startIndex + rowsPerPage);
  }, [cashflowLedgerRows, currentPage]);

  const handleApplyClick = async () => {
    const targetValue = parseFloat(inputValue) || 0;
    if (targetValue < 0 || !activeTerm) return;
    setSaving(true);
    try {
      await updateCapitalRecord(activeTerm.id, targetValue);
      setStarting(targetValue);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!activeTerm) return <NoTerm />;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 antialiased text-slate-200">
      {/* HEADER NAVIGATION AREA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)]">
            Operations Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time tracking of positions and pipelines.</p>
        </div>
        <div className="term px-2.5 py-2 border rounded font-mono text-xs font-semibold tracking-wide flex flex-row gap-2">
          <p> Scope Term: </p>
          <span className="uppercase">
           {activeTerm.name}
          </span>
        </div>
      </div>

      {/* ── 1. STARTING CAPITAL COMPONENT ── */}
      <StartingCapitalControl
        inputValue={inputValue}
        setInputValue={setInputValue}
        hasSavedCapital={starting > 0}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        handleApplyClick={handleApplyClick}
        handleCancelEdit={() => { setInputValue(String(starting)); setIsEditing(false); }}
        saving={saving}
      />

      {/* METRIC BLOCK GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <MetricCard label="Current Cash" value={fmt(financialMetrics.currentCashBalance)} valueColorClass={financialMetrics.currentCashBalance >= 0 ? "text-emerald-400" : "text-rose-400"} icon={<Wallet size={14} />} />
        <MetricCard label="Activity Volume" value={String(termTransactions.length)} sub={`B: ${financialMetrics.buyTxns.length} · S: ${financialMetrics.sellTxns.length}`} icon={<Activity size={14} />} />
        <MetricCard label="Total Volume" value={financialMetrics.totalBags.toLocaleString()} sub="Bags tracked" icon={<ShoppingBag size={14} />} />
        <MetricCard label="Total Sales" value={fmt(financialMetrics.sellRevenue)} valueColorClass="text-emerald-400" icon={<ArrowDownLeft size={14} className="text-emerald-500" />} />
        <MetricCard label="Total Purchases" value={fmt(financialMetrics.buyCost)} valueColorClass="text-rose-400" icon={<ArrowUpRight size={14} className="text-rose-500" />} />
        <MetricCard label="Logistics Fees" value={fmt(financialMetrics.totalExp)} valueColorClass="text-amber-500" sub="Pipeline total" icon={<Scale size={14} />} />
        <MetricCard label="Net Profit Margin" value={fmtSigned(financialMetrics.netProfit)} valueColorClass={financialMetrics.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"} sub={`ROI: ${financialMetrics.roi.toFixed(1)}%`} highlight icon={<TrendingUp size={14} />} />
      </div>

      {/* CHARTS & EXPENSES PANEL SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── 2. DASHBOARD CHARTS COMPONENT ── */}
        <DashboardCharts chartData={chartData} />

        {/* ── 3. EXPENSE BREAKDOWN COMPONENT ── */}
        <ExpenseBreakdown expItems={expItems} totalExp={financialMetrics.totalExp} />
      </div>

      {/* RATIOS & PERFORMANCE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5 rounded-xl backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider mb-4 text-[var(--text2)]">Profit &amp; Return Metrics</p>
          <div className="divide-y divide-[var(--border)] text-xs font-medium">
            {[
              { label: "Total Sales", value: fmt(financialMetrics.sellRevenue), cls: "text-[var(--text-subtle)]" },
              { label: "Total Purchases", value: fmt(financialMetrics.buyCost), cls: "text-[var(--text-subtle)]" },
              { label: "Net Profit Position", value: fmtSigned(financialMetrics.netProfit), cls: financialMetrics.netProfit >= 0 ? "text-emerald-400" : "text-rose-400 font-bold" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-center py-3 px-1 rounded hover:bg-[var(--bg4)]">
                <span className="text-[var(--text-subtle)]">{r.label}</span>
                <span className={`font-mono font-semibold ${r.cls}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 rounded-xl backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider mb-4 text-[var(--text2)]">Classification Performance</p>
          <div className="divide-y divide-[var(--border)] text-xs font-medium overflow-y-auto max-h-[290px] pr-1">
            {classItems.length === 0 ? (
              <p className="text-xs text-center py-16 text-[var(--text-subtle)] italic">No structural variants logged.</p>
            ) : (
              classItems.map(([name, d]) => (
                <div key={name} className="flex justify-between items-center py-3 px-1 rounded hover:bg-[var(--bg4)]">
                  <div className="space-y-0.5">
                    <span className="text-[var(--text-subtle)] font-semibold">{name}</span>
                    <span className="block text-[10px] text-[var(--text-subtle)] font-mono">({d.count} transactions · {d.bags} bags)</span>
                  </div>
                  <span className={`font-mono font-bold ${d.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtSigned(d.net)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 4. CASHFLOW LEDGER DATA TABLE COMPONENT ── */}
      <CashflowLedger
        paginatedLedgerRows={paginatedLedgerRows}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        sortOrder={sortOrder}
        toggleSortOrder={() => { setSortOrder((p) => p === "desc" ? "asc" : "desc"); setCurrentPage(1); }}
      />
    </div>
  );
}