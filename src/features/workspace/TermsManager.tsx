"use client";

import React, { useEffect, useRef, useState } from "react";
import { Calendar, Check, Pencil, Plus, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { Term } from "@/types";

export function TermsManager() {
  const { terms, activeTerm, switchTerm, deleteTerm, updateTerm, addTerm, setTerms, addToast } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [showNewTermModal, setShowNewTermModal] = useState(false);
  const [newTermName, setNewTermName] = useState("");
  const [newTermStartingCapital, setNewTermStartingCapital] = useState("");
  const [creatingTerm, setCreatingTerm] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartEdit = (e: React.MouseEvent, term: Term) => {
    e.stopPropagation();
    setEditingId(term.id);
    setEditValue(term.name);
  };

  const handleConfirmEdit = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const trimmed = editValue.trim();
    if (editingId && trimmed) await updateTerm(editingId, trimmed);
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

  const handleCreateTerm = async () => {
    const trimmedName = newTermName.trim();
    const startingCapital = Number(newTermStartingCapital);
    if (!trimmedName || newTermStartingCapital.trim() === "" || !Number.isFinite(startingCapital) || startingCapital < 0) {
      return;
    }

    setCreatingTerm(true);
    try {
      await addTerm(trimmedName, startingCapital);
      setShowNewTermModal(false);
      setNewTermName("");
      setNewTermStartingCapital("");
    } catch (error) {
      console.error("Failed to create term:", error);
      addToast("Could not create the term. Please try again.", "error");
    } finally {
      setCreatingTerm(false);
    }
  };

  return (
    <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between px-3 mb-2">
        <p className="text-xs font-bold mb-1.5" style={{ color: "var(--text2)" }}>
          TERMS
        </p>
        <button
          onClick={() => setShowNewTermModal(true)}
          className="text-xs px-2 py-1 rounded bg-emerald-500 text-slate-900 font-semibold"
          aria-label="Create new term"
        >
          <Plus size={12} />
        </button>
      </div>

      {showNewTermModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewTermModal(false)} />
          <div className="relative z-50 w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 text-[var(--text)] shadow-2xl">
            <h4 className="text-sm font-bold mb-2">Create New Term</h4>
            <input
              value={newTermName}
              onChange={(e) => setNewTermName(e.target.value)}
              placeholder="Term name"
              aria-label="Term name"
              className="mb-3 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            />
            <label htmlFor="new-term-starting-capital" className="mb-1 block text-xs font-semibold text-[var(--text2)]">
              Starting capital
            </label>
            <input
              id="new-term-starting-capital"
              type="number"
              min="0"
              step="any"
              required
              value={newTermStartingCapital}
              onChange={(e) => setNewTermStartingCapital(e.target.value)}
              placeholder="0.00"
              className="mb-3 w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowNewTermModal(false); setNewTermName(""); setNewTermStartingCapital(""); }}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] px-3 py-1.5 text-xs text-[var(--text2)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateTerm}
                disabled={creatingTerm || !newTermName.trim() || newTermStartingCapital.trim() === "" || !Number.isFinite(Number(newTermStartingCapital)) || Number(newTermStartingCapital) < 0}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--button-on-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingTerm ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {terms.map((term) => {
          const isActive = activeTerm?.id === term.id;
          const isEditing = editingId === term.id;

          const handleDragStart = (e: React.DragEvent, id: string) => {
            e.dataTransfer.setData("text/plain", id);
            setDraggingId(id);
          };

          const handleDrop = (e: React.DragEvent, targetId: string) => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData("text/plain");
            if (!draggedId || draggedId === targetId) {
              setDraggingId(null);
              return;
            }

            const fromIndex = terms.findIndex((t: any) => t.id === draggedId);
            const toIndex = terms.findIndex((t: any) => t.id === targetId);
            if (fromIndex === -1 || toIndex === -1) { setDraggingId(null); return; }

            const updated = [...terms];
            const [moved] = updated.splice(fromIndex, 1);
            updated.splice(toIndex, 0, moved);

            if (setTerms) setTerms(updated);
            if (addToast) addToast("Terms reordered.", "info");
            setDraggingId(null);
          };

          return (
            <div
              key={term.id}
              draggable
              onDragStart={(e) => handleDragStart(e, term.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, term.id)}
              onDragEnd={() => setDraggingId(null)}
              onClick={() => !isEditing && switchTerm(term)}
              className={`group px-3 py-2 uppercase rounded-lg cursor-pointer text-sm flex items-center justify-between transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-[0.99] ${draggingId === term.id ? "opacity-60" : ""}`}
              style={{
                color: isActive ? "var(--accent)" : "var(--text2)",
                background: isActive ? "var(--mutedaccent)" : "transparent",
                border: isActive ? "1px solid var(--border)" : "1px solid transparent",
                fontWeight: isActive ? "600" : "normal",
              }}
            >
              {isEditing ? (
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
                    className="p-0.5 rounded text-emerald-500 hover:text-emerald-700 transition-colors border-0 bg-transparent cursor-pointer flex-shrink-0"
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center truncate">
                    <Calendar size={13} className="mr-1.5 flex-shrink-0" />
                    <span className="truncate">{term.name}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleStartEdit(e, term)}
                      className="p-0.5 rounded text-slate-500 hover:text-blue-600 transition-colors border-0 bg-transparent cursor-pointer"
                      title="Rename Term"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, term.id, term.name)}
                      className="p-0.5 rounded text-slate-500 hover:text-rose-600 transition-colors border-0 bg-transparent cursor-pointer"
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
