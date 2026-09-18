"use client";
import React, { useRef, useState } from "react";
import { FileJson } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function ImportButton() {
  const { setTransactions, setTerms, setClassifications, setCapitalRecords, switchTerm, terms, transactions, addToast } = useApp() as any;
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

        if (!data.terms && !data.transactions && !data.capitalRecords && !data.capital) {
          throw new Error("JSON missing expected keys: terms, transactions, capitalRecords, or capital");
        }

        console.log("Importing Data:", data);

        const newTerms = data.terms || [];
        const newTransactions = data.transactions || [];
        const newClassifications = data.classifications || [];
        const newCapitalRecords = data.capitalRecords || (data.capital ? [data.capital] : []);
        const newActiveTerm = data.activeTerm || (newTerms.length > 0 ? newTerms[0] : null);

        // 1. Update React state
        setTerms(newTerms);
        setTransactions(newTransactions);
        setClassifications(newClassifications);
        setCapitalRecords(newCapitalRecords);
        switchTerm(newActiveTerm);

        // 2. Persist directly to Electron's file storage (source of truth on reload)
        if (typeof window !== "undefined" && window.electronAPI?.saveLocalData) {
          const timestamp = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });

          await window.electronAPI.saveLocalData({
            terms: newTerms,
            transactions: newTransactions,
            classifications: newClassifications,
            capitalRecords: newCapitalRecords,
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
      <label className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs cursor-pointer border border-dashed border-[var(--border)] text-[var(--text2)] bg-transparent hover:text-white hover:bg-[var(--accent)] transition-all">
        <FileJson size={13} /> Import Data
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