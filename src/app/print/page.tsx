"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { calcTxn, calcNetProfit, fmt, fmtSigned } from "@/lib/calc";

type ViewMode = "combined" | "separated";

export default function PrintPage() {
  const { transactions = [], activeTerm, capitalRecords = [] } = useApp();
  const [startingCapital, setStartingCapital] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("combined");

  useEffect(() => {
    if (!activeTerm) return;
    const record = capitalRecords.find((c) => c.term_id === activeTerm.id);
    setStartingCapital(record ? record.starting_capital : 0);
  }, [activeTerm, capitalRecords]);

  const termTransactions = transactions.filter((t: any) => {
    if (!activeTerm) return false;
    return t.term_id === activeTerm.id || t.term === activeTerm.name;
  });

  const { sellRevenue, buyCost, totalExp, netProfit } =
    calcNetProfit(termTransactions);
  const totalAgent = termTransactions.reduce(
    (s, t) => s + (t.agent_bags || 0) * (t.agent_rate || 0),
    0,
  );
  const totalTransfer = termTransactions.reduce(
    (s, t) => s + (t.transfer_bags || 0) * (t.transfer_rate || 0),
    0,
  );
  const totalOther = termTransactions.reduce(
    (s, t) => s + (t.other_exp || 0),
    0,
  );
  // Only count bags from Sell transactions — Buy bags aren't "sold" yet
  const totalBags = termTransactions.reduce(
    (s, t) => (t.category === "Sell" ? s + (t.bags || 0) : s),
    0,
  );
  const roi = buyCost > 0 ? ((netProfit / buyCost) * 100).toFixed(1) : "0.0";
  const margin =
    sellRevenue > 0 ? ((netProfit / sellRevenue) * 100).toFixed(1) : "0.0";
  const today = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sorted = [...termTransactions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const buyRows = sorted.filter((t: any) => t.category === "Buy");
  const sellRows = sorted.filter((t: any) => t.category === "Sell");

  function sumRows(rows: any[]) {
    let bags = 0, saleTotal = 0, agent = 0, transfer = 0, other = 0, total = 0;
    rows.forEach((t) => {
      const c = calcTxn(t);
      if (t.category === "Sell") bags += t.bags || 0;
      saleTotal += c.saleTotal;
      agent += c.agentCost;
      transfer += c.transferCost;
      other += t.other_exp || 0;
      total += c.total;
    });
    return { bags, saleTotal, agent, transfer, other, total };
  }

  const allTotals = sumRows(sorted);
  const buyTotals = sumRows(buyRows);
  const sellTotals = sumRows(sellRows);

  if (!activeTerm) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p>Please select an active term to generate a valid print statement.</p>
      </div>
    );
  }

  // ── Reusable table renderer ──
  function TransactionTable({ rows, totals, label }: { rows: any[]; totals: ReturnType<typeof sumRows>; label?: string }) {
    return (
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 10,
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            {[
              ["Date", "11%"],
              ["Cat.", "7%"],
              ["Tags", "11%"],
              ["Class.", "12%"],
              ["Bags", "7%"],
              ["Price/bag", "11%"],
              ["Sale Total", "13%"],
              ["Fees", "13%"],
              ["Total", "15%"],
            ].map(([h, w]) => (
              <th
                key={h}
                style={{
                  width: w,
                  padding: "5px 6px",
                  textAlign: h === "Date" || h === "Cat." || h === "Class." || h === "Tags" ? "left" : "right",
                  fontSize: 8,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  color: "#555",
                  borderBottom: "1px solid #ddd",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const c = calcTxn(t);
            const bg = i % 2 === 0 ? "#fff" : "#f7f8f7";
            const totalColor = c.total >= 0 ? "#00a362" : "#e05252";
            const fees = c.agentCost + c.transferCost + (t.other_exp || 0);
            return (
              <tr key={t.id} style={{ background: bg }}>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #eee", fontSize: 10 }}>
                  {t.date}
                </td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #eee", fontSize: 10 }}>
                  {t.category}
                </td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #eee", fontSize: 10 }}>
                  {(t.tags || "")
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #eee", fontSize: 10 }}>
                  {t.classification || "—"}
                </td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #eee", fontSize: 10, textAlign: "right" }}>
                  {t.bags || 0}
                </td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #eee", fontSize: 10, textAlign: "right" }}>
                  {fmt(t.price || 0)}
                </td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #eee", fontSize: 10, textAlign: "right" }}>
                  {fmt(c.saleTotal)}
                </td>
                <td style={{ padding: "5px 6px", borderBottom: "1px solid #eee", fontSize: 10, textAlign: "right" }}>
                  {fmt(fees)}
                </td>
                <td
                  style={{
                    padding: "5px 6px",
                    borderBottom: "1px solid #eee",
                    fontSize: 10,
                    textAlign: "right",
                    fontWeight: 700,
                    color: totalColor,
                  }}
                >
                  {fmtSigned(c.total)}
                </td>
              </tr>
            );
          })}
          {/* Totals — only Fees and Total are summed */}
          <tr style={{ background: "#e8f0e8", fontWeight: 700, borderTop: "2px solid #aaa" }}>
            <td
              colSpan={7}
              style={{ padding: "6px", fontSize: 9, textTransform: "uppercase", letterSpacing: ".05em", color: "#444" }}
            >
              {label ? `${label} TOTALS` : "TOTALS"}
            </td>
            <td style={{ padding: "6px", textAlign: "right", fontSize: 10 }}>
              {fmt(totals.agent + totals.transfer + totals.other)}
            </td>
            <td
              style={{
                padding: "6px",
                textAlign: "right",
                fontSize: 10,
                fontWeight: 800,
                color: totals.total >= 0 ? "#00a362" : "#e05252",
              }}
            >
              {fmtSigned(totals.total)}
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div>
      {/* Print-only page setup */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body * {
            visibility: hidden;
          }
          #printPreview, #printPreview * {
            visibility: visible;
          }
          #printPreview {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            padding: 0 !important;
            border-radius: 0 !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Screen-only header */}
      <div className="py-6 max-w-[1600px] mx-auto flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-strong)]">
            Print Report
          </h1>
          <p className="text-xs mt-1 flex items-center gap-1.5 text-slate-400">
            Active Term:
            <span className="term border uppercase font-bold tracking-wide">
              {activeTerm?.name}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle: Combined vs Separated (Buy/Sell on separate pages) */}
          <div
            className="flex items-center rounded-lg p-0.5 border text-xs font-semibold"
            style={{ borderColor: "var(--border)", background: "var(--bg2)" }}
          >
            <button
              onClick={() => setViewMode("combined")}
              className="px-3 py-1.5 rounded-md cursor-pointer transition-all"
              style={{
                background: viewMode === "combined" ? "var(--accent)" : "transparent",
                color: viewMode === "combined" ? "#fff" : "var(--text2)",
              }}
            >
              Combined
            </button>
            <button
              onClick={() => setViewMode("separated")}
              className="px-3 py-1.5 rounded-md cursor-pointer transition-all"
              style={{
                background: viewMode === "separated" ? "var(--accent)" : "transparent",
                color: viewMode === "separated" ? "#fff " : "var(--text2)",
              }}
            >
              Buy / Sell Separate
            </button>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg text-sm font-bold cursor-pointer"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Print preview */}
      <div
        id="printPreview"
        className="bg-white text-gray-900 rounded-xl p-6 max-w-[1600px] mx-auto font-sans"
      >
        {/* Report header */}
        <div className="border-b-2 border-gray-900 pb-3 mb-5">
          <div className="flex items-baseline justify-between">
            <div className="text-xl font-black">🧅 Storage FastBreak</div>
            <div className="text-xs text-gray-400">{today}</div>
          </div>
          <div className="text-sm font-semibold text-gray-600 mt-0.5">
            Term: {activeTerm?.name || "—"}
            {viewMode === "separated" && (
              <span className="ml-2 text-gray-400 font-normal">— Buy / Sell Report</span>
            )}
          </div>
        </div>

        {/* Summary — single compact row, only the numbers that matter */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {[
            { label: "Starting Capital", value: fmt(startingCapital) },
            { label: "Bags Sold", value: totalBags.toLocaleString() },
            { label: "Revenue", value: fmt(sellRevenue) },
            { label: "Cost", value: fmt(buyCost) },
            { label: "Expenses", value: fmt(totalExp) },
            { label: "Net Profit", value: fmtSigned(netProfit), h: true },
            { label: "ROI", value: roi + "%", h: true },
          ].map((m) => (
            <div
              key={m.label}
              className={`px-2 py-2 rounded-md border ${
                m.h ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">
                {m.label}
              </div>
              <div
                className={`text-sm font-bold ${m.h ? "text-green-700" : "text-gray-900"}`}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {viewMode === "combined" ? (
          // ── COMBINED: single table, all transactions ──
          <TransactionTable rows={sorted} totals={allTotals} />
        ) : (
          // ── SEPARATED: Buy table, then page break, then Sell table ──
          <>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1 mb-3">
              Buy Transactions
            </div>
            <TransactionTable rows={buyRows} totals={buyTotals} label="BUY" />

            <div className="page-break" />
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1 mb-3 mt-8 print:mt-0">
              Sell Transactions
            </div>
            <TransactionTable rows={sellRows} totals={sellTotals} label="SELL" />
          </>
        )}

        {/* Signature line — common requirement for printed financial statements */}
        <div className="grid grid-cols-2 gap-12 mt-12 text-xs text-gray-500">
          <div>
            <div className="border-t border-gray-400 pt-1">Prepared by</div>
          </div>
          <div>
            <div className="border-t border-gray-400 pt-1">Approved by</div>
          </div>
        </div>
      </div>
    </div>
  );
}