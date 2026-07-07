"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { fmt } from "@/lib/calc";

interface DashboardChartsProps {
  chartData: Array<{ label: string; value: number; color: string }>;
}

export function DashboardCharts({ chartData }: DashboardChartsProps) {
  return (
    <div className="lg:col-span-2 p-5 rounded-xl border border-slate-800 bg-slate-950/20 backdrop-blur-sm">
      <p className="text-xs font-bold uppercase tracking-wider mb-6 text-slate-400">
        Purchases vs Sales Value
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          barSize={44}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmt(v)}
          />
          <Tooltip
            contentStyle={{
              background: "#020617",
              border: "1px solid #1e293b",
              borderRadius: 12,
              color: "#f8fafc",
            }}
            formatter={(v) => [fmt(Number(v)), ""]}
            labelStyle={{ color: "#94a3b8", fontWeight: 600, fontSize: 11 }}
          />
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