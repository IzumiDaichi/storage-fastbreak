import { calcNetProfit, calcTxn } from "@/lib/calc";
import type { Transaction } from "@/types";

export function getDashboardMetrics(termTransactions: Transaction[], starting: number) {
  const buyTxns = termTransactions.filter((t) => t.category === "Buy");
  const sellTxns = termTransactions.filter((t) => t.category === "Sell");
  const { sellRevenue, buyCost, totalExp, netProfit } = calcNetProfit(termTransactions);

  const totalBags = termTransactions.reduce((sum, t) => sum + (t.bags || 0), 0);
  const totalAgent = termTransactions.reduce((sum, t) => sum + (t.agent_bags || 0) * (t.agent_rate || 0), 0);
  const totalTransfer = termTransactions.reduce((sum, t) => sum + (t.transfer_bags || 0) * (t.transfer_rate || 0), 0);
  const totalOther = termTransactions.reduce((sum, t) => sum + (t.other_exp || 0), 0);

  const roi = buyCost > 0 ? (netProfit / buyCost) * 100 : 0;
  const margin = sellRevenue > 0 ? (netProfit / sellRevenue) * 100 : 0;
  const currentCashBalance = starting + sellRevenue - buyCost - totalExp;

  return {
    buyTxns,
    sellTxns,
    sellRevenue,
    buyCost,
    totalExp,
    netProfit,
    totalBags,
    totalAgent,
    totalTransfer,
    totalOther,
    roi,
    margin,
    currentCashBalance,
  };
}

export function getClassificationItems(termTransactions: Transaction[]) {
  const classMap: Record<string, { bags: number; count: number; net: number }> = {};

  termTransactions.forEach((t) => {
    const key = t.classification || "Unclassified";
    if (!classMap[key]) classMap[key] = { bags: 0, count: 0, net: 0 };
    classMap[key].bags += t.bags || 0;
    classMap[key].count += 1;
    classMap[key].net += calcTxn(t).total;
  });

  return Object.entries(classMap).sort((a, b) => b[1].net - a[1].net);
}

export function getCashflowRows(termTransactions: Transaction[], starting: number, sortOrder: "desc" | "asc") {
  const baseChronological = [...termTransactions].sort((a, b) => a.date.localeCompare(b.date));
  let running = starting;

  const mapped = baseChronological.map((t) => {
    const ag = (t.agent_bags || 0) * (t.agent_rate || 0);
    const tr = (t.transfer_bags || 0) * (t.transfer_rate || 0);
    const ex = ag + tr + (t.other_exp || 0);
    const inflow = t.category === "Sell" ? (t.bags || 0) * (t.price || 0) : 0;
    const outflow = t.category === "Buy" ? (t.bags || 0) * (t.price || 0) : 0;
    running = running + inflow - outflow - ex;

    return {
      id: t.id || `${t.date}-${t.description}`,
      date: t.date,
      category: t.category,
      classification: t.classification,
      tags: t.tags,
      description: t.description,
      bags: t.bags || 0,
      inflow,
      outflow,
      ex,
      runningPosition: running,
    };
  });

  return sortOrder === "desc" ? mapped.reverse() : mapped;
}
