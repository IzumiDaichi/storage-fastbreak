// src/lib/calc.ts
import type { Transaction, CalcResult, NetProfit } from "@/types";

export function calcTxn(t: Transaction): CalcResult {
  const saleTotal = (t.bags || 0) * (t.price || 0);
  const agentCost = (t.agent_bags || 0) * (t.agent_rate || 0);
  const transferCost = (t.transfer_bags || 0) * (t.transfer_rate || 0);
  const totalExp = agentCost + transferCost + (t.other_exp || 0);

  const total =
    t.category === "Buy" ? -(saleTotal + totalExp) : saleTotal - totalExp;

  return { saleTotal, agentCost, transferCost, totalExp, total };
}

export function calcNetProfit(transactions: Transaction[]): NetProfit {
  const sellRevenue = transactions
    .filter((t) => t.category === "Sell")
    .reduce((s, t) => s + (t.bags || 0) * (t.price || 0), 0);

  const buyCost = transactions
    .filter((t) => t.category === "Buy")
    .reduce((s, t) => s + (t.bags || 0) * (t.price || 0), 0);

  const totalExp = transactions.reduce((s, t) => {
    const ag = (t.agent_bags || 0) * (t.agent_rate || 0);
    const tr = (t.transfer_bags || 0) * (t.transfer_rate || 0);
    return s + ag + tr + (t.other_exp || 0);
  }, 0);

  return {
    sellRevenue,
    buyCost,
    totalExp,
    netProfit: sellRevenue - buyCost - totalExp,
  };
}

export function fmt(n: number): string {
  return (
    "₱" +
    Math.abs(n).toLocaleString("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

export function fmtSigned(n: number): string {
  return (n < 0 ? "-" : "") + fmt(n);
}
