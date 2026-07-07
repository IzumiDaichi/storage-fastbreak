"use client";
import React from "react";
import { Download } from "lucide-react";
import { useApp } from "@/context/AppContext";

export function ExportButton() {
  const { transactions = [], terms = [], classifications = [], activeTerm } = useApp();

  function handleExportData() {
    try {
      console.log("Electron Live Context Hook Snapshot:", { terms, transactions, classifications, activeTerm });

      if (!transactions.length && !terms.length) {
        alert("No active ledger records found to export yet!");
        return;
      }

      const exportPayload = {
        terms,
        transactions,
        classifications,
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
      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/40 text-slate-400 hover:text-slate-200 text-xs font-bold transition-all cursor-pointer group"
    >
      <Download size={14} className="text-slate-500 group-hover:text-slate-400 transition-colors flex-shrink-0" />
      <span>Export System Data</span>
    </button>
  );
}