"use client";

import React from "react";
import { fmt } from "@/lib/calc";

interface ExpenseBreakdownProps {
  expItems: Array<{ label: string; value: number }>;
  totalExp: number;
}

export function ExpenseBreakdown({ expItems, totalExp }: ExpenseBreakdownProps) {
  return (
    <div className="card p-5 rounded-xl backdrop-blur-sm flex flex-col justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-6 text-[var(--text2)]">
          Expense Breakdown
        </p>
        <div className="space-y-4">
          {expItems.map((e) => {
            const pct = totalExp > 0 ? (e.value / totalExp) * 100 : 0;
            return (
              <div key={e.label} className="group">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-subtle)] group-hover:text-[var(--text-strong)] transition-colors">
                    {e.label}
                  </span>
                  <span className="font-mono font-bold text-amber-500">
                    {fmt(e.value)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg4)] border border-[var(--border)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                    style={{ width: `${pct.toFixed(1)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between items-center text-xs mt-6 pt-4 font-bold border-t border-[var(--border)]">
        <span className="text-[var(--text2)]">Total Pipeline Overhead</span>
        <span className="font-mono text-base text-rose-400">
          {fmt(totalExp)}
        </span>
      </div>
    </div>
  );
}