"use client";
import React, { useRef, useState } from "react";
import { FileJson } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function ImportButton() {
  const { setTransactions, setTerms, terms, transactions, addToast } = useApp() as any;
  const [importStatus, setImportStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const totalExistingRecords = (terms?.length || 0) + (transactions?.length || 0);
    if (totalExistingRecords > 0) {
      const confirmDestruction = window.confirm(
        "Warning: Would you like to continue importing? Doing so will delete current data and it will be replaced by the imported data."
      );
      if (!confirmDestruction) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawText = event.target?.result as string;
        const data = JSON.parse(rawText);

        if (!data.terms && !data.transactions && !data.capital) {
          throw new Error("JSON missing expected keys: terms, transactions, or capital");
        }

        console.log("Importing Data:", data);

        const newTerms = data.terms || [];
        const newTransactions = data.transactions || [];
        const newClassifications = data.classifications || [];
        const newActiveTerm = data.activeTerm || (newTerms.length > 0 ? newTerms[0] : null);

        // 1. Update React state
        setTerms(newTerms);
        setTransactions(newTransactions);

        // 2. Persist directly to Electron's file storage (source of truth on reload)
        if (typeof window !== "undefined" && window.electronAPI) {
          const timestamp = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          await window.electronAPI.saveLocalData({
            terms: newTerms,
            transactions: newTransactions,
            classifications: newClassifications,
            activeTerm: newActiveTerm,
            lastBackup: timestamp,
          });
        }

        setImportStatus("✅ Sync Complete!");
        addToast?.("Import successful. Reloading...", "success");

        // 3. Reload only after save is confirmed
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        console.error("IMPORT ERROR:", err);
        setImportStatus("❌ Error: Check JSON structure");
        addToast?.("Import failed. Check JSON structure.", "error");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="w-full">
      <label className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs cursor-pointer border border-dashed border-[var(--border)] text-[var(--text2)] bg-transparent hover:bg-slate-800/20 transition-all">
        <FileJson size={13} /> Import Backup
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
      </label>
      {importStatus && (
        <p className="text-center text-[10px] mt-2 text-[var(--accent)] font-semibold">
          {importStatus}
        </p>
      )}
    </div>
  );
}