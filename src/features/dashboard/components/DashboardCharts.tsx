"use client";

import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmt } from "@/lib/calc";

interface DashboardChartsProps {
  chartData: Array<{ label: string; value: number; color: string }>;
}

export function DashboardCharts({ chartData }: DashboardChartsProps) {
  return (
    <div className="card lg:col-span-2 p-5 rounded-xl backdrop-blur-sm">
      <p className="text-xs font-bold uppercase tracking-wider mb-6 text-[var(--text2)]">
        Purchases vs Sales Value
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          barSize={44}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          tabIndex={-1}
          style={{outline: "none"}}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--text-subtle)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-subtle)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmt(v)}
          />
          <Tooltip 
          /* Hover bar background fill*/
            cursor={{ fill: "var(--text)", opacity: 0.1 }}
            /* Hover tooltip style*/
            contentStyle={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--text)",
            }}
            /* Tool Tip Data*/
            itemStyle={{ color: "var(--text)" }}
            formatter={(v) => [fmt(Number(v)), ""]}
            labelStyle={{ color: "var(--text2)", fontWeight: 600, fontSize: 11 }}
          />
          /* Chart Bar*/
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}