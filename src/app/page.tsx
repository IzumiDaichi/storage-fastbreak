"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { calcTxn, calcNetProfit, fmt, fmtSigned } from "@/lib/calc";
import { LoadingSpinner, NoTerm } from "@/components/ui";
import { Activity, ShoppingBag, ArrowDownLeft, ArrowUpRight, Scale, TrendingUp, Wallet } from "lucide-react";

// Import modular architectural components
import { StartingCapitalControl } from "@/components/StartingCapital";
import { DashboardCharts } from "@/components/DashboardCharts";
import { ExpenseBreakdown } from "@/components/ExpenseBreakdown";
import { CashflowLedger } from "@/components/CashflowLedger";

// Internal Sub-component MetricCard
interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  valueColorClass?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}

function MetricCard({ label, value, sub, valueColorClass = "text-white", highlight, icon }: MetricCardProps) {
  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 relative overflow-hidden ${highlight ? "border-emerald-500/30 bg-emerald-500/[0.04] shadow-md shadow-emerald-500/5" : "border-slate-800 bg-slate-950/40 backdrop-blur-sm"}`}>
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
  const { transactions = [], activeTerm, loading } = useApp() as any;
  const [starting, setStarting] = useState<number>(0);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const rowsPerPage = 10;

  const localStorageKey = `local_starting_capital_${activeTerm ? String(activeTerm.id || activeTerm.name || "default") : "default"}`;

  useEffect(() => {
    const savedLocalCapital = localStorage.getItem(localStorageKey);
    if (savedLocalCapital) {
      const parsed = parseFloat(savedLocalCapital) || 0;
      setStarting(parsed);
      setInputValue(String(parsed));
    } else {
      setStarting(0);
      setInputValue("");
    }
    setIsEditing(false);
    setCurrentPage(1);
  }, [localStorageKey, activeTerm]);

  const termTransactions = useMemo(() => {
    if (!activeTerm) return [];
    return transactions.filter((t: any) => t.term_id === activeTerm.id || t.term === activeTerm.name);
  }, [transactions, activeTerm]);

  const financialMetrics = useMemo(() => {
    const buyTxns = termTransactions.filter((t: any) => t.category === "Buy");
    const sellTxns = termTransactions.filter((t: any) => t.category === "Sell");
    const { sellRevenue, buyCost, totalExp, netProfit } = calcNetProfit(termTransactions);

    const totalBags = termTransactions.reduce((s: number, t: any) => s + (t.bags || 0), 0);
    const totalAgent = termTransactions.reduce((s: number, t: any) => s + (t.agent_bags || 0) * (t.agent_rate || 0), 0);
    const totalTransfer = termTransactions.reduce((s: number, t: any) => s + (t.transfer_bags || 0) * (t.transfer_rate || 0), 0);
    const totalOther = termTransactions.reduce((s: number, t: any) => s + (t.other_exp || 0), 0);

    const roi = buyCost > 0 ? (netProfit / buyCost) * 100 : 0;
    const margin = sellRevenue > 0 ? (netProfit / sellRevenue) * 100 : 0;
    const currentCashBalance = starting + sellRevenue - buyCost - totalExp;

    return { buyTxns, sellTxns, sellRevenue, buyCost, totalExp, netProfit, totalBags, totalAgent, totalTransfer, totalOther, roi, margin, currentCashBalance };
  }, [termTransactions, starting]);

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

  const classItems = useMemo(() => {
    const classMap: Record<string, { bags: number; count: number; net: number }> = {};
    termTransactions.forEach((t: any) => {
      const key = t.classification || "Unclassified";
      if (!classMap[key]) classMap[key] = { bags: 0, count: 0, net: 0 };
      classMap[key].bags += t.bags || 0;
      classMap[key].count += 1;
      classMap[key].net += calcTxn(t).total;
    });
    return Object.entries(classMap).sort((a, b) => b[1].net - a[1].net);
  }, [termTransactions]);

  const cashflowLedgerRows = useMemo(() => {
    const baseChronological = [...termTransactions].sort((a, b) => a.date.localeCompare(b.date));
    let running = starting;

    const mapped = baseChronological.map((t) => {
      const ag = (t.agent_bags || 0) * (t.agent_rate || 0);
      const tr = (t.transfer_bags || 0) * (t.transfer_rate || 0);
      const ex = ag + tr + (t.other_exp || 0);
      const inflow = t.category === "Sell" ? (t.bags || 0) * (t.price || 0) : 0;
      const outflow = t.category === "Buy" ? (t.bags || 0) * (t.price || 0) : 0;
      running = running + inflow - outflow - ex;

      return { id: t.id || `${t.date}-${t.description}`, date: t.date, category: t.category, classification: t.classification, tags: t.tags, description: t.description, bags: t.bags || 0, inflow, outflow, ex, runningPosition: running };
    });

    return sortOrder === "desc" ? mapped.reverse() : mapped;
  }, [termTransactions, starting, sortOrder]);

  const totalPages = Math.ceil(cashflowLedgerRows.length / rowsPerPage) || 1;
  const paginatedLedgerRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return cashflowLedgerRows.slice(startIndex, startIndex + rowsPerPage);
  }, [cashflowLedgerRows, currentPage]);

  const handleApplyClick = async () => {
    const targetValue = parseFloat(inputValue) || 0;
    if (targetValue < 0) return;
    setSaving(true);
    try {
      localStorage.setItem(localStorageKey, String(targetValue));
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
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Operations Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time tracking of positions and pipelines.</p>
        </div>
        <div>
          <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-amber-400 font-mono text-xs font-semibold tracking-wide">
            Scope Term: {activeTerm.name}
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
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/20 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider mb-4 text-slate-400">Profit &amp; Return Metrics</p>
          <div className="divide-y divide-slate-900 text-xs font-medium">
            {[
              { label: "Total Sales", value: fmt(financialMetrics.sellRevenue), cls: "text-emerald-400" },
              { label: "Total Purchases", value: fmt(financialMetrics.buyCost), cls: "text-rose-400" },
              { label: "Net Profit Position", value: fmtSigned(financialMetrics.netProfit), cls: financialMetrics.netProfit >= 0 ? "text-emerald-400" : "text-rose-400 font-bold" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between items-center py-3 px-1 rounded hover:bg-slate-900/20">
                <span className="text-slate-400">{r.label}</span>
                <span className={`font-mono font-semibold ${r.cls}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/20 backdrop-blur-sm">
          <p className="text-xs font-bold uppercase tracking-wider mb-4 text-slate-400">Classification Performance</p>
          <div className="divide-y divide-slate-900 text-xs font-medium overflow-y-auto max-h-[290px] pr-1">
            {classItems.length === 0 ? (
              <p className="text-xs text-center py-16 text-slate-500 italic">No structural variants logged.</p>
            ) : (
              classItems.map(([name, d]) => (
                <div key={name} className="flex justify-between items-center py-3 px-1 rounded hover:bg-slate-900/20">
                  <div className="space-y-0.5">
                    <span className="text-slate-300 font-semibold">{name}</span>
                    <span className="block text-[10px] text-slate-500 font-mono">({d.count} txns · {d.bags} bags)</span>
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