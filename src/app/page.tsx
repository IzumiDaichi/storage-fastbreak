"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { fmt, fmtSigned } from "@/lib/calc";
import { LoadingSpinner, NoTerm } from "@/components/ui";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  getCashflowRows,
  getClassificationItems,
  getDashboardMetrics,
} from "@/features/dashboard/lib/dashboard";
import { StartingCapitalControl } from "@/features/dashboard/components/StartingCapital";
import { DashboardCharts } from "@/features/dashboard/components/DashboardCharts";
import { ExpenseBreakdown } from "@/features/dashboard/components/ExpenseBreakdown";
import { CashflowLedger } from "@/features/dashboard/components/CashflowLedger";

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}

function MetricCard({
  label,
  value,
  sub,
  valueColor,
  highlight = false,
  icon,
}: MetricCardProps) {
  const appearance = highlight
    ? "dashboard-metric-highlight border-emerald-500/30 bg-emerald-500/[0.04] shadow-md shadow-emerald-500/5"
    : "border-[var(--border)] bg-[var(--bg4)] backdrop-blur-sm";

  return (
    <div className={`dashboard-metric relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${appearance}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text2)]">
          {label}
        </p>
        {icon && <div className="text-[var(--text-subtle)]">{icon}</div>}
      </div>
      <p
        className="font-mono text-xl font-bold tracking-tight"
        style={{ color: valueColor ?? "var(--text-strong)" }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1 truncate text-[11px] font-medium text-[var(--text2)]">
          {sub}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const {
    transactions,
    activeTerm,
    loading,
    capitalRecords,
    updateCapitalRecord,
    addToast,
  } = useApp();
  const [starting, setStarting] = useState<number>(0);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const rowsPerPage = 10;

  useEffect(() => {
    if (!activeTerm) {
      setStarting(0);
      setInputValue("");
      setCurrentPage(1);
      return;
    }

    const record = capitalRecords.find((capital) => capital.term_id === activeTerm.id);
    const parsed = record ? record.starting_capital : 0;
    setStarting(parsed);
    setInputValue(record ? String(parsed) : "");
    setCurrentPage(1);
  }, [activeTerm, capitalRecords]);

  const termTransactions = useMemo(() => {
    if (!activeTerm) return [];
    return transactions.filter(
      (transaction) =>
        transaction.term_id === activeTerm.id || transaction.term === activeTerm.name,
    );
  }, [transactions, activeTerm]);

  const financialMetrics = useMemo(
    () => getDashboardMetrics(termTransactions, starting),
    [termTransactions, starting],
  );

  const chartData = useMemo(() => {
    const { buyCost, sellRevenue, netProfit } = financialMetrics;
    return [
      { label: "Total Purchases", value: buyCost, color: "var(--negative)" },
      { label: "Total Sales", value: sellRevenue, color: "var(--positive)" },
      {
        label: "Net Profit",
        value: netProfit,
        color: netProfit >= 0 ? "var(--positive)" : "var(--negative)",
      },
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
    [termTransactions, starting, sortOrder],
  );

  const totalPages = Math.ceil(cashflowLedgerRows.length / rowsPerPage) || 1;
  const paginatedLedgerRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return cashflowLedgerRows.slice(startIndex, startIndex + rowsPerPage);
  }, [cashflowLedgerRows, currentPage]);

  const handleApplyClick = async () => {
    const targetValue = Number(inputValue);
    if (!Number.isFinite(targetValue) || targetValue < 0 || !activeTerm) return;
    setSaving(true);
    try {
      await updateCapitalRecord(activeTerm.id, targetValue);
      setStarting(targetValue);
    } catch (err) {
      console.error(err);
      addToast("Could not save starting capital. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!activeTerm) return <NoTerm />;

  return (
    <div className="dashboard-page mx-auto max-w-[1600px] space-y-6 p-6 antialiased text-[var(--text)]">
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)]">
            Operations Dashboard
          </h1>
          <p className="mt-1 text-xs text-[var(--text2)]">
            Real-time tracking of positions and pipelines.
          </p>
        </div>
        <div className="term flex items-center gap-2 rounded border px-2.5 py-2 font-mono text-xs font-semibold tracking-wide">
          <span>Scope term:</span>
          <span className="uppercase">{activeTerm.name}</span>
        </div>
      </div>

      <StartingCapitalControl
        inputValue={inputValue}
        setInputValue={setInputValue}
        hasSavedCapital={capitalRecords.some((record) => record.term_id === activeTerm.id)}
        handleApplyClick={handleApplyClick}
        saving={saving}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-7">
        <MetricCard
          label="Current Cash"
          value={fmt(financialMetrics.currentCashBalance)}
          valueColor={financialMetrics.currentCashBalance >= 0
            ? "var(--positive)"
            : "var(--negative)"}
          icon={<Wallet size={14} />}
        />
        <MetricCard
          label="Activity Volume"
          value={String(termTransactions.length)}
          sub={`B: ${financialMetrics.buyTxns.length} · S: ${financialMetrics.sellTxns.length}`}
          icon={<Activity size={14} />}
        />
        <MetricCard
          label="Total Volume"
          value={financialMetrics.totalBags.toLocaleString()}
          sub="Bags tracked"
          icon={<ShoppingBag size={14} />}
        />
        <MetricCard
          label="Total Sales"
          value={fmt(financialMetrics.sellRevenue)}
          valueColor="var(--positive)"
          icon={<ArrowDownLeft size={14} className="text-emerald-500" />}
        />
        <MetricCard
          label="Total Purchases"
          value={fmt(financialMetrics.buyCost)}
          valueColor="var(--negative)"
          icon={<ArrowUpRight size={14} className="text-rose-500" />}
        />
        <MetricCard
          label="Logistics Fees"
          value={fmt(financialMetrics.totalExp)}
          valueColor="var(--warning)"
          sub="Pipeline total"
          icon={<Scale size={14} />}
        />
        <MetricCard
          label="Net Profit Margin"
          value={fmtSigned(financialMetrics.netProfit)}
          valueColor={financialMetrics.netProfit >= 0
            ? "var(--positive)"
            : "var(--negative)"}
          sub={`ROI: ${financialMetrics.roi.toFixed(1)}%`}
          highlight
          icon={<TrendingUp size={14} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCharts chartData={chartData} />
        <ExpenseBreakdown expItems={expItems} totalExp={financialMetrics.totalExp} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card rounded-xl p-5 backdrop-blur-sm">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--text2)]">
            Profit &amp; Return Metrics
          </h2>
          <div className="divide-y divide-[var(--border)] text-xs font-medium">
            {[
              { label: "Total Sales", value: fmt(financialMetrics.sellRevenue), cls: "text-[var(--text-subtle)]" },
              { label: "Total Purchases", value: fmt(financialMetrics.buyCost), cls: "text-[var(--text-subtle)]" },
              { label: "Net Profit Position", value: fmtSigned(financialMetrics.netProfit), cls: financialMetrics.netProfit >= 0 ? "text-emerald-400" : "text-rose-400 font-bold" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between rounded px-1 py-3 hover:bg-[var(--bg4)]">
                <span className="text-[var(--text-subtle)]">{r.label}</span>
                <span className={`font-mono font-semibold ${r.cls}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card rounded-xl p-5 backdrop-blur-sm">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[var(--text2)]">
            Classification Performance
          </h2>
          <div className="max-h-[290px] divide-y divide-[var(--border)] overflow-y-auto pr-1 text-xs font-medium">
            {classItems.length === 0 ? (
              <p className="py-16 text-center text-xs italic text-[var(--text-subtle)]">
                No structural variants logged.
              </p>
            ) : (
              classItems.map(([name, d]) => (
                <div key={name} className="flex items-center justify-between rounded px-1 py-3 hover:bg-[var(--bg4)]">
                  <div className="space-y-0.5">
                    <span className="text-[var(--text-subtle)] font-semibold">{name}</span>
                    <span className="block text-[10px] text-[var(--text-subtle)] font-mono">({d.count} transactions · {d.bags} bags)</span>
                  </div>
                  <span className={`font-mono font-bold ${d.net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtSigned(d.net)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <CashflowLedger
        paginatedLedgerRows={paginatedLedgerRows}
        totalPages={totalPages}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        sortOrder={sortOrder}
        toggleSortOrder={() => {
          setSortOrder((previous) => previous === "desc" ? "asc" : "desc");
          setCurrentPage(1);
        }}
      />
    </div>
  );
}