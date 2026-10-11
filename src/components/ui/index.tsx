// Shared UI components.
export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      <p className="text-sm text-slate-400">Loading ledger environment...</p>
    </div>
  );
}

export function TransactionLedgerSkeleton() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 min-h-screen animate-pulse" aria-label="Loading transactions">
      <div className="flex items-center justify-between pb-2">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg bg-slate-800" />
          <div className="h-4 w-44 rounded bg-slate-900" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-slate-800" />
      </div>
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="h-4 w-20 rounded bg-slate-800" />
          <div className="h-9 w-40 rounded-lg bg-slate-900" />
          <div className="h-9 w-36 rounded-lg bg-slate-900" />
          <div className="h-9 w-48 rounded-lg bg-slate-900" />
        </div>
        <div className="flex gap-5 border-t border-slate-900/60 pt-3">
          <div className="h-4 w-28 rounded bg-slate-900" />
          <div className="h-4 w-32 rounded bg-slate-900" />
          <div className="h-4 w-24 rounded bg-slate-900" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/40">
        <div className="grid grid-cols-6 gap-4 border-b border-slate-800 bg-slate-900/70 px-4 py-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-3 rounded bg-slate-800" />
          ))}
        </div>
        <div className="divide-y divide-slate-800/60">
          {Array.from({ length: 8 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-6 gap-4 px-4 py-4">
              {Array.from({ length: 6 }).map((_, cellIndex) => (
                <div key={cellIndex} className={`h-4 rounded bg-slate-900 ${cellIndex === 2 ? "w-4/5" : "w-full"}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function NoTerm() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 border-2 border-dashed border-slate-700 rounded-2xl">
      <h3 className="text-lg font-semibold text-slate-200">
        No Operational Term Active
      </h3>
      <p className="text-sm text-slate-400 max-w-sm mt-1">
        Create or select a workspace term from the control center options to
        begin logging your daily ledger balances.
      </p>
    </div>
  );
}

export function CategoryBadge({ cat }: { cat: "Buy" | "Sell" }) {
  const isBuy = cat === "Buy";
  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
        isBuy
          ? "bg-red-500/10 text-red-400 border border-red-500/20"
          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      }`}
    >
      {cat}
    </span>
  );
}

export function TagPill({ tag }: { tag: string }) {
  return (
    <span className="max-w-[110px] truncate rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 shadow-sm">
      {tag}
    </span>
  );
}

import React, { useId, useState, useEffect } from "react";

export function Select({
  value,
  onChange,
  options,
  allowFreeText,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  allowFreeText?: boolean;
}) {
  const listId = useId();
  const labelToValue = new Map(options.map(([v, l]) => [l, v]));
  const valueToLabel = new Map(options.map(([v, l]) => [v, l]));
  const [inputValue, setInputValue] = useState(
    valueToLabel.has(value) ? (valueToLabel.get(value) as string) : value || ""
  );

  useEffect(() => {
    setInputValue(valueToLabel.has(value) ? (valueToLabel.get(value) as string) : value || "");
  }, [value]);

  function commit(val: string) {
    const mapped = labelToValue.has(val) ? (labelToValue.get(val) as string) : val;
    onChange(mapped);
  }

  if (allowFreeText) {
    return (
      <div>
        <input
          list={listId}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit((e.target as HTMLInputElement).value);
          }}
          className="text-sm px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none"
        />
        <datalist id={listId}>
          {options.map(([v, l]) => (
            <option key={v || l} value={l} />
          ))}
        </datalist>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:outline-none"
    >
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${full ? "col-span-2" : ""}`}>
      <label className="text-[11px] font-semibold tracking-wide text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

export function SectionLabel({ label }: { label: string }) {
  return (
    <div className="col-span-2 text-[10px] font-bold pt-3 pb-1 uppercase tracking-widest text-slate-400 border-t border-slate-800/80">
      {label}
    </div>
  );
}

export function CalcRow({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between py-1 border-b border-slate-800/40 text-slate-400">
      <span>{label}</span>
      <span
        style={{ fontWeight: bold ? 600 : 400, color: color || "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );
}
