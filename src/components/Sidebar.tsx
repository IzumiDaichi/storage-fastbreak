"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Printer,
  X,
  Calendar,
  Cloud,
  Link2,
  Pencil,
  Check,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ImportButton } from "./Import";
import { ExportButton } from "./Export";

// ── SUB-COMPONENT: GOOGLE AUTH ───────────
function GoogleAuthCard() {
  const {
    isGoogleLinked,
    googleUserEmail,
    linkGoogleAccount,
    disconnectGoogleAccount,
  } = useApp() as any;

  if (isGoogleLinked) {
    return (
      <div
        className="p-3 rounded-xl mb-6 border text-xs"
        style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Cloud size={14} /> Synced
          </div>
          <button
            onClick={disconnectGoogleAccount}
            className="hover:text-red-400 transition-all cursor-pointer bg-transparent border-0 p-0 text-xs"
          >
            Log Out
          </button>
        </div>
        <p className="truncate text-slate-400">{googleUserEmail}</p>
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-xl mb-6 border text-xs"
      style={{ background: "var(--bg2)", borderColor: "var(--border)" }}
    >
      <p className="text-slate-400 mb-2">Cloud backup disabled.</p>
      <button
        onClick={linkGoogleAccount}
        className="w-full py-1.5 rounded-lg font-semibold cursor-pointer border-0 text-xs"
        style={{ background: "var(--accent)", color: "#000" }}
      >
        <Link2 size={13} className="inline mr-1" /> Link Google Account
      </button>
    </div>
  );
}

// ── SUB-COMPONENT: TERMS MANAGER ────────
function TermsManager() {
  const { terms = [], activeTerm, switchTerm, deleteTerm, updateTerm } = useApp() as any;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (e: React.MouseEvent, term: any) => {
    e.stopPropagation();
    setEditingId(term.id);
    setEditValue(term.name);
  };

  const handleConfirmEdit = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== "" && updateTerm) {
      await updateTerm(editingId, trimmed);
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirmEdit();
    if (e.key === "Escape") {
      setEditingId(null);
      setEditValue("");
    }
  };

  const handleDelete = (e: React.MouseEvent, termId: string, termName: string) => {
    e.stopPropagation();
    const confirmDeletion = window.confirm(
      `Are you sure you want to delete the term "${termName}"? This action cannot be undone.`
    );
    if (confirmDeletion && deleteTerm) deleteTerm(termId);
  };

  return (
    <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs font-bold mb-1.5 px-3" style={{ color: "var(--text2)" }}>
        TERMS
      </p>
      <div className="flex flex-col gap-1">
        {terms.map((term: any) => {
          const isActive = activeTerm?.id === term.id;
          const isEditing = editingId === term.id;

          return (
            <div
              key={term.id}
              onClick={() => !isEditing && switchTerm(term)}
              className="group px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center justify-between transition-all"
              style={{
                color: isActive ? "var(--accent)" : "var(--text2)",
                background: isActive ? "var(--bg2)" : "transparent",
                border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                fontWeight: isActive ? "600" : "normal",
              }}
            >
              {isEditing ? (
                // ── EDIT MODE ──
                <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
                  <Calendar size={13} className="flex-shrink-0 text-slate-400" />
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 bg-transparent border-b text-sm outline-none py-0"
                    style={{
                      borderColor: "var(--accent)",
                      color: "var(--accent)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleConfirmEdit}
                    className="p-0.5 rounded text-emerald-400 hover:bg-slate-800/50 transition-all border-0 bg-transparent cursor-pointer flex-shrink-0"
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                // ── VIEW MODE ──
                <>
                  <div className="flex items-center truncate">
                    <Calendar size={13} className="mr-1.5 flex-shrink-0" />
                    <span className="truncate">{term.name}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleStartEdit(e, term)}
                      className="p-0.5 rounded text-slate-500 hover:text-blue-400 hover:bg-slate-800/50 transition-all border-0 bg-transparent cursor-pointer"
                      title="Rename Term"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, term.id, term.name)}
                      className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800/50 transition-all border-0 bg-transparent cursor-pointer"
                      title="Delete Term"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN SIDEBAR ──
export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { href: "/transactions", label: "Transactions", icon: <List size={16} /> },
    { href: "/print", label: "Print", icon: <Printer size={16} /> },
  ];

  return (
    <aside className="sidebar flex flex-col justify-between h-full">
      <div>
        <div className="px-2 mb-6 font-bold text-sm text-[var(--accent)]">
          🧅 Storage FastBreak
        </div>

        <GoogleAuthCard />

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors"
                style={{
                  color: isActive ? "var(--accent)" : "var(--text2)",
                  background: isActive ? "var(--bg2)" : "transparent",
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <TermsManager />
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--border)] flex flex-col gap-2">
        <ImportButton />
        <ExportButton />
      </div>
    </aside>
  );
}