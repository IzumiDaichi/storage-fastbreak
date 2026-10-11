"use client";

import type React from "react";
import { Check } from "lucide-react";
import { fmt } from "@/lib/calc";

interface StartingCapitalControlProps {
  inputValue: string;
  setInputValue: (v: string) => void;
  hasSavedCapital: boolean;
  handleApplyClick: () => Promise<void>;
  saving: boolean;
}

export function StartingCapitalControl({
  inputValue,
  setInputValue,
  hasSavedCapital,
  handleApplyClick,
  saving,
}: StartingCapitalControlProps) {
  return (
    <div className="dashboard-panel card flex flex-col justify-between gap-4 rounded-xl p-4 md:flex-row md:items-center">
      <div className="space-y-0.5">
        <label className="text-xs font-bold tracking-wider text-[var(--text2)] uppercase">
          Starting Capital
        </label>
        <p className="text-xs text-[var(--text-subtle)]">
          {hasSavedCapital ? "Initial balance for this term" : "Set the initial balance for this term"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {hasSavedCapital ? (
          <p className="font-mono text-lg font-bold text-[var(--text-strong)]" aria-label="Saved starting capital">
            {fmt(Number(inputValue) || 0)}
          </p>
        ) : (
          <div className="flex items-center gap-1.5">
            <label htmlFor="startingCapital" className="sr-only">Starting capital</label>
            <input
              id="startingCapital"
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-44 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--text-strong)] focus:border-[var(--accent)] focus:outline-none"
            />
            <button
              onClick={handleApplyClick}
              disabled={saving || inputValue.trim() === "" || !Number.isFinite(Number(inputValue)) || Number(inputValue) < 0}
              type="button"
              className="group flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[var(--button-on-accent)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check size={13} className="stroke-[3px]" />
              <span>{saving ? "Saving..." : "Save"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}