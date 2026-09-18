import { ArrowUpDown, Filter, RotateCcw, Search } from "lucide-react";
import { Select } from "@/components/ui";

export type TransactionFiltersProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterClass: string;
  setFilterClass: (value: string) => void;
  filterMonth: string;
  setFilterMonth: (value: string) => void;
  dateMode: "month" | "exact";
  setDateMode: (value: "month" | "exact") => void;
  filterExactDate: string;
  setFilterExactDate: (value: string) => void;
  filterAgent: boolean;
  setFilterAgent: (value: boolean) => void;
  filterTransfer: boolean;
  setFilterTransfer: (value: boolean) => void;
  filterOther: boolean;
  setFilterOther: (value: boolean) => void;
  filterTags: boolean;
  setFilterTags: (value: boolean) => void;
  filterConnected: boolean;
  setFilterConnected: (value: boolean) => void;
  dateSortOrder: "latest" | "oldest";
  setDateSortOrder: (value: "latest" | "oldest") => void;
  suggestedFilterClassifications: string[];
  onReset: () => void;
};

export function TransactionFilters({
  searchQuery,
  setSearchQuery,
  filterClass,
  setFilterClass,
  filterMonth,
  setFilterMonth,
  dateMode,
  setDateMode,
  filterExactDate,
  setFilterExactDate,
  filterAgent,
  setFilterAgent,
  filterTransfer,
  setFilterTransfer,
  filterOther,
  setFilterOther,
  filterTags,
  setFilterTags,
  filterConnected,
  setFilterConnected,
  dateSortOrder,
  setDateSortOrder,
  suggestedFilterClassifications,
  onReset,
}: TransactionFiltersProps) {
  return (
    <div className="filter p-4 rounded-xl backdrop-blur-md shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-[var(--text2)] text-xs font-semibold">
          <Filter size={12} className="text-[var(--text2)]" /> Filter View:
        </div>

        <div className="relative min-w-[220px] flex-1 max-w-[320px]">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text2)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search UID or tags"
            aria-label="Search transactions by UID or tags"
            className="h-[34px] w-full rounded-lg pl-9 pr-3 text-xs border"
          />
        </div>

        <div className="min-w-[160px]">
          <Select
            value={filterClass}
            onChange={setFilterClass}
            options={[
              ["", "All Classifications"],
              ...suggestedFilterClassifications.map((name) => [name, name] as [string, string]),
            ]}
          />
        </div>

        <div className="flex items-center rounded-lg border border-[var(--border)] p-0.5 gap-1 h-[34px]">
          <select
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value as "month" | "exact")}
            className="text-xs px-2 py-1 rounded bg-slate-950 border-0 text-slate-300 font-semibold cursor-pointer focus:outline-none focus:ring-0 h-full"
          >
            <option value="month">By Month</option>
            <option value="exact">Specific Date</option>
          </select>

          <div className="px-1 flex items-center">
            {dateMode === "month" ? (
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="text-xs px-2 py-0.5 rounded border-0 bg-transparent text-slate-200 focus:outline-none w-[120px]"
              />
            ) : (
              <input
                type="date"
                value={filterExactDate}
                onChange={(e) => setFilterExactDate(e.target.value)}
                className="text-xs px-2 py-0.5 rounded border-0 bg-transparent text-slate-200 focus:outline-none w-[130px] accent-emerald-500"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto border-l border-[var(--border)] pl-3">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <ArrowUpDown size={12} className="text-slate-500" /> Sort:
          </span>
          <select
            value={dateSortOrder}
            onChange={(e) => setDateSortOrder(e.target.value as "latest" | "oldest")}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-200 font-medium focus:outline-none focus:border-slate-700 cursor-pointer transition-colors h-[32px]"
          >
            <option value="latest">Latest to Oldest</option>
            <option value="oldest">Oldest to Latest</option>
          </select>
        </div>

        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] hover:bg-[var(--accent)] text-[var(--text2)] hover:text-white transition-all flex items-center gap-1 cursor-pointer h-[32px]"
        >
          <RotateCcw size={12} /> Clear
        </button>
      </div>

      <div className="flex gap-4 flex-wrap">
        {[
          ["Has Agent Fee", filterAgent, setFilterAgent],
          ["Has Transfer Fee", filterTransfer, setFilterTransfer],
          ["Has Other Expenses", filterOther, setFilterOther],
          ["Has Tags", filterTags, setFilterTags],
          ["Connected Records", filterConnected, setFilterConnected],
        ].map(([label, val, setter]: any) => (
          <label
            key={label}
            className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none text-[var(--text2)] hover:text-[var(--accent)] transition-colors group"
          >
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => setter(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--accent)] w-3.5 h-3.5 cursor-pointer accent-[var(--accent)]"
            />
            <span className="group-hover:translate-x-[1px] transition-transform duration-150">
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
