"use client";

import React from "react";
import { Check, X } from "lucide-react";

interface StartingCapitalControlProps {
  inputValue: string;
  setInputValue: (v: string) => void;
  hasSavedCapital: boolean;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  handleApplyClick: () => Promise<void>;
  handleCancelEdit: () => void;
  saving: boolean;
}

export function StartingCapitalControl({
  inputValue,
  setInputValue,
  hasSavedCapital,
  isEditing,
  setIsEditing,
  handleApplyClick,
  handleCancelEdit,
  saving,
}: StartingCapitalControlProps) {
  return (
    <div className="card p-4 rounded-xl backdrop-blur-md shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-0.5">
        <label className="text-xs font-bold tracking-wider text-[var(--text2)] uppercase">
          Starting Capital
        </label>
        <p className="text-xs text-[var(--text-subtle)]">
          {hasSavedCapital && !isEditing
            ? ""
            : "Enter your starting balance to begin tracking"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600 font-mono">
            ₱
          </span>
          <input
            id="startingCapital"
            type="number"
            placeholder="0.00"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={hasSavedCapital && !isEditing}
            className="text-sm pl-6 pr-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-white font-semibold focus:outline-none focus:border-slate-700 w-44 disabled:opacity-50 transition-all"
          />
        </div>

        {!hasSavedCapital || isEditing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleApplyClick}
              disabled={saving || (parseFloat(inputValue) || 0) <= 0}
              type="button"
              className="group flex items-center justify-center gap-1 text-xs px-3 py-2 font-bold rounded-xl text-black bg-[var(--accent)] hover:brightness-110 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-[var(--accent)]/5"
            >
              <Check size={13} className="stroke-[3px]" />
              <span>{saving ? "Syncing..." : "Commit"}</span>
            </button>

            {isEditing && (
              <button
                onClick={handleCancelEdit}
                type="button"
                className="flex items-center justify-center gap-1 text-xs px-3 py-2 font-medium rounded-xl border border-[var(--border)] bg-[var(--accent)] text-slate-400 hover:text-slate-200 hover[var(--accent2)]0/80 transition-all cursor-pointer"
              >
                <X size={13} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            type="button"
            className="text-xs px-3 py-2 font-medium rounded-xl border border-[var(--border)] bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-600 transition-all cursor-pointer"
          >
            Modify Balance
          </button>
        )}
      </div>
    </div>
  );
}