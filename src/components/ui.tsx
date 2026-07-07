// src/components/ui.tsx
export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      <p className="text-sm text-slate-400">Loading ledger environment...</p>
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
    <span className="bg-slate-800 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-700 max-w-[80px] truncate">
      {tag}
    </span>
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
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
