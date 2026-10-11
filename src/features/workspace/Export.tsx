"use client";
import React from "react";
import { Download } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function ExportButton() {
  const { transactions = [], terms = [], classifications = [], activeTerm, capitalRecords = [] } = useApp();

  function handleExportData() {
    try {
      console.log("Electron Live Context Hook Snapshot:", { terms, transactions, classifications, activeTerm, capitalRecords });

      if (!transactions.length && !terms.length) {
        alert("No active ledger records found to export yet!");
        return;
      }

      const exportPayload = {
        terms,
        transactions,
        classifications,
        capitalRecords,
        activeTerm,
      };

      const jsonString = JSON.stringify(exportPayload, null, 2);
      const dataBlob = new Blob([jsonString], { type: "application/json" });
      const downloadUrl = URL.createObjectURL(dataBlob);

      const dummyLink = document.createElement("a");
      dummyLink.href = downloadUrl;

      const currentIsoDate = new Date().toISOString().split("T")[0];
      dummyLink.download = `ledger-backup-${currentIsoDate}.json`;

      document.body.appendChild(dummyLink);
      dummyLink.click();
      document.body.removeChild(dummyLink);
      URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error("Critical failure during Electron data export sequence:", error);
      alert("Failed to export your data. Check browser devtools console.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleExportData}
      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs cursor-pointer border border-dashed border-[var(--border)] text-[var(--text2)] bg-transparent hover:text-white hover:bg-[var(--accent)] transition-all"
    >
      <Download size={14} className="transition-colors flex-shrink-0" />
      <span>Export Data</span>
    </button>
  );
}