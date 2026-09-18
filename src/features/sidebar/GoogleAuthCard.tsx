"use client";

import { Cloud, Link2 } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function GoogleAuthCard() {
  const { isGoogleLinked, googleUserEmail, linkGoogleAccount, disconnectGoogleAccount } = useApp() as any;

  if (isGoogleLinked) {
    return (
      <div
        className="p-3 rounded-xl border text-xs"
        style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
            <Cloud size={14} /> Synced
          </div>
          <button
            onClick={disconnectGoogleAccount}
            className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-all cursor-pointer bg-transparent border-0 p-0 text-xs"
          >
            Log Out
          </button>
        </div>
        <p className="truncate text-[var(--text-muted)]">{googleUserEmail}</p>
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-xl border text-xs"
      style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
    >
      <p className="text-[var(--text-muted)] mb-2">Cloud backup disabled.</p>
      <button
        onClick={linkGoogleAccount}
        className="w-full py-1.5 rounded-lg font-semibold cursor-pointer border-0 text-xs"
        style={{ background: "var(--accent)", color: "var(--button-on-accent)" }}
      >
        <Link2 size={13} className="inline mr-1" /> Link Google Account
      </button>
    </div>
  );
}
