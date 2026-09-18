"use client";

import React, { useEffect, useState } from "react";
import type { Transaction, Term, Classification, Capital } from "@/types";
import type { AppContextType, AppNotificationToast } from "./appContext.types";
import { AppContext } from "./AppContext";
import { buildPayload, createTimestamp, makeToast } from "./appContext.helpers";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [masterTerms, setMasterTerms] = useState<Term[]>([]);
  const [masterTransactions, setMasterTransactions] = useState<Transaction[]>([]);
  const [masterClassifications, setMasterClassifications] = useState<Classification[]>([]);
  const [masterCapitalRecords, setMasterCapitalRecords] = useState<Capital[]>([]);
  const [masterActiveTerm, setMasterActiveTerm] = useState<Term | null>(null);

  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [driveSync, setDriveSync] = useState<"idle" | "pending" | "synced" | "error">("idle");
  const [toasts, setToasts] = useState<AppNotificationToast[]>([]);

  const isDesktop =
    typeof window !== "undefined" && Boolean(window.electronAPI);

  useEffect(() => {
    async function loadInitialSystemData() {
      if (!isDesktop) {
        setLoading(false);
        return;
      }

      try {
        console.log("🔑 Checking auth...");
        const authRes = await window.electronAPI?.checkGoogleAuthStatus();

        if (authRes?.success && authRes.isLinked) {
          setIsGoogleLinked(true);
          setGoogleUserEmail(authRes.email);
          console.log(`🔒 Logged in as: ${authRes.email}`);

          setDriveSync("pending");
          const fileRes = await window.electronAPI?.readLocalData();

          if (fileRes?.success && fileRes.data) {
            setMasterTerms(fileRes.data.terms || []);
            setMasterTransactions(fileRes.data.transactions || []);
            setMasterClassifications(fileRes.data.classifications || []);
            setMasterCapitalRecords(
              fileRes.data.capitalRecords ||
              (fileRes.data.capital ? [fileRes.data.capital] : []) ||
              []
            );
            setMasterActiveTerm(fileRes.data.activeTerm || null);
            setLastBackup(
              fileRes.data.lastBackup ||
              new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            );
            setDriveSync(fileRes.source === "drive" ? "synced" : "idle");
            console.log(`📦 Loaded from: ${fileRes.source}`);
          } else {
            setDriveSync("idle");
          }
        } else {
          clearAllState();
        }
      } catch (err) {
        console.error("Init error:", err);
        setDriveSync("error");
      } finally {
        setIsHydrated(true);
        setLoading(false);
      }
    }

    loadInitialSystemData();
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop || !window.electronAPI?.onDriveSyncStatus) return;
    return window.electronAPI.onDriveSyncStatus((result: { synced: boolean; error?: string }) => {
      setDriveSync(result.synced ? "synced" : "error");
      if (!result.synced) console.warn("Drive sync error:", result.error);
    });
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop || !window.electronAPI?.onAuthSuccess) return;

    window.electronAPI.onAuthSuccess(async (data: { email: string }) => {
      clearAllState();
      setIsGoogleLinked(true);
      setGoogleUserEmail(data.email);

      setDriveSync("pending");
      const fileRes = await window.electronAPI?.readLocalData();
      if (fileRes?.success && fileRes.data) {
        setMasterTerms(fileRes.data.terms || []);
        setMasterTransactions(fileRes.data.transactions || []);
        setMasterClassifications(fileRes.data.classifications || []);
        setMasterCapitalRecords(
          fileRes.data.capitalRecords ||
          (fileRes.data.capital ? [fileRes.data.capital] : []) ||
          []
        );
        setMasterActiveTerm(fileRes.data.activeTerm || null);
        setLastBackup(
          fileRes.data.lastBackup ||
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
        setDriveSync(fileRes.source === "drive" ? "synced" : "idle");
      } else {
        setDriveSync("idle");
      }

      addToast(`Workspace unlocked for ${data.email}`, "success");
    });
  }, [isDesktop]);

  async function syncToDisk(
    updatedTerms: Term[],
    updatedTxns: Transaction[],
    updatedClasses: Classification[],
    updatedCapitalRecords: Capital[],
    currentActive: Term | null,
    persist: boolean = false,
  ) {
    if (!isDesktop || !isHydrated || !persist) return;
    try {
      const timestamp = createTimestamp();
      setLastBackup(timestamp);
      setDriveSync("pending");

      await window.electronAPI?.saveLocalData(
        buildPayload(
          updatedTerms,
          updatedTxns,
          updatedClasses,
          currentActive,
          updatedCapitalRecords,
          timestamp
        )
      );
    } catch (err) {
      console.error("Sync failure:", err);
      setDriveSync("error");
    }
  }

  function clearAllState() {
    setMasterTerms([]);
    setMasterTransactions([]);
    setMasterClassifications([]);
    setMasterCapitalRecords([]);
    setMasterActiveTerm(null);
    setIsGoogleLinked(false);
    setGoogleUserEmail(null);
    setDriveSync("idle");
  }

  function generateTransactionUid(termId: string | undefined, currentTransactions: Transaction[]) {
    const dateStamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const matchingToday = currentTransactions.filter((txn) => txn.uid?.startsWith(`TXN-${dateStamp}-`)).length;
    const fallback = termId ? `-${termId.slice(0, 4).toUpperCase()}` : "";
    return `TXN-${dateStamp}${fallback}-${String(matchingToday + 1).padStart(4, "0")}`;
  }

  function addToast(message: string, type: AppNotificationToast["type"]) {
    const id = crypto.randomUUID();
    setToasts((prev) => [...(Array.isArray(prev) ? prev : []), { id, ...makeToast(message, type) }]);
    if (type !== "syncing") setTimeout(() => removeToast(id), 4000);
  }

  function removeToast(id: string) {
    setToasts((prev) => (Array.isArray(prev) ? prev : []).filter((t) => t.id !== id));
  }

  function switchTerm(term: Term | null) {
    setMasterActiveTerm(term);
  }

  async function updateCapitalRecord(termId: string, startingCapital: number) {
    const existing = masterCapitalRecords.find((record) => record.term_id === termId);
    const timestamp = new Date().toISOString();

    let updatedCapitalRecords: Capital[];
    if (existing) {
      updatedCapitalRecords = masterCapitalRecords.map((record) =>
        record.term_id === termId ? { ...record, starting_capital: startingCapital, updated_at: timestamp } : record
      );
    } else {
      updatedCapitalRecords = [
        ...masterCapitalRecords,
        {
          id: crypto.randomUUID(),
          term_id: termId,
          starting_capital: startingCapital,
          updated_at: timestamp,
        },
      ];
    }

    setMasterCapitalRecords(updatedCapitalRecords);
    await syncToDisk(masterTerms, masterTransactions, masterClassifications, updatedCapitalRecords, masterActiveTerm, true);
  }

  async function addTerm(name: string) {
    const newTerm: Term = { id: crypto.randomUUID(), name };
    const updated = [...masterTerms, newTerm];
    setMasterTerms(updated);
    if (!masterActiveTerm) setMasterActiveTerm(newTerm);
    await syncToDisk(updated, masterTransactions, masterClassifications, masterCapitalRecords, masterActiveTerm || newTerm, true);
    addToast(`Term ${name} generated.`, "success");
  }

  async function updateTerm(id: string, newName: string) {
    const updated = masterTerms.map((t) =>
      t.id === id ? { ...t, name: newName } : t
    );
    setMasterTerms(updated);

    const updatedActive =
      masterActiveTerm?.id === id
        ? { ...masterActiveTerm, name: newName }
        : masterActiveTerm;

    if (masterActiveTerm?.id === id) setMasterActiveTerm(updatedActive);

    await syncToDisk(updated, masterTransactions, masterClassifications, masterCapitalRecords, updatedActive, true);
    addToast(`Term renamed to "${newName}".`, "info");
  }

  async function deleteTerm(id: string) {
    const updatedTerms = masterTerms.filter((t) => t.id !== id);
    const updatedTxns = masterTransactions.filter((t) => t.term_id !== id);
    const updatedCapitalRecords = masterCapitalRecords.filter((c) => c.term_id !== id);
    setMasterTerms(updatedTerms);

    let nextActive = masterActiveTerm;
    if (masterActiveTerm?.id === id) {
      nextActive = updatedTerms.length > 0 ? updatedTerms[0] : null;
      setMasterActiveTerm(nextActive);
    }

    setMasterTransactions(updatedTxns);
    setMasterCapitalRecords(updatedCapitalRecords);
    await syncToDisk(updatedTerms, updatedTxns, masterClassifications, updatedCapitalRecords, nextActive, true);
    addToast("Term and associated records wiped.", "error");
  }

  async function addTransaction(payload: any) {
    const termId = payload.term_id || masterActiveTerm?.id;
    const uid = payload.uid || generateTransactionUid(termId, masterTransactions);
    const newTxn: Transaction = { id: crypto.randomUUID(), ...payload, uid };
    const updated = [newTxn, ...masterTransactions];
    setMasterTransactions(updated);
    await syncToDisk(masterTerms, updated, masterClassifications, masterCapitalRecords, masterActiveTerm, true);
    addToast("Transaction recorded!", "success");
  }

  async function updateTransaction(id: string, payload: any) {
    const targetTxn = masterTransactions.find((t) => t.id === id);
    const uid = payload.uid || targetTxn?.uid || generateTransactionUid(targetTxn?.term_id || masterActiveTerm?.id, masterTransactions);
    const updated = masterTransactions.map((t) => (t.id === id ? { ...t, ...payload, uid } : t));
    setMasterTransactions(updated);
    await syncToDisk(masterTerms, updated, masterClassifications, masterCapitalRecords, masterActiveTerm, true);
    addToast("Transaction updated.", "info");
  }

  async function deleteTransaction(id: string) {
    const updated = masterTransactions.filter((t) => t.id !== id);
    setMasterTransactions(updated);
    await syncToDisk(masterTerms, updated, masterClassifications, masterCapitalRecords, masterActiveTerm, true);
    addToast("Transaction removed.", "error");
  }

  async function linkGoogleAccount() {
    if (!isDesktop) {
      addToast("Cannot connect outside desktop app.", "error");
      return;
    }

    try {
      addToast("Opening authorization window...", "info");
      const res = await window.electronAPI?.requestGoogleAuthLink();
      if (!res?.success) addToast(`Connection failed: ${res?.error || "Closed window"}`, "error");
    } catch {
      addToast("Authentication bridge crash caught.", "error");
    }
  }

  async function disconnectGoogleAccount() {
    if (!isDesktop) return;

    try {
      const res = await window.electronAPI?.signOutGoogleAccount();
      if (res?.success) {
        clearAllState();
        addToast("Logged out. Vault locked.", "info");
      } else {
        addToast("Sign-out rejected by backend.", "error");
      }
    } catch (err) {
      console.error("Sign out crashed:", err);
    }
  }

  const transactions = isGoogleLinked ? masterTransactions : [];
  const terms = isGoogleLinked ? masterTerms : [];
  const classifications = isGoogleLinked ? masterClassifications : [];
  const capitalRecords = isGoogleLinked ? masterCapitalRecords : [];
  const activeTerm = isGoogleLinked ? masterActiveTerm : null;

  const value: AppContextType = {
    transactions,
    terms,
    classifications,
    capitalRecords,
    activeTerm,
    loading,
    isGoogleLinked,
    googleUserEmail,
    lastBackup,
    driveSync,
    toasts,
    setTerms: setMasterTerms,
    setTransactions: setMasterTransactions,
    setClassifications: setMasterClassifications,
    setCapitalRecords: setMasterCapitalRecords,
    switchTerm,
    updateCapitalRecord,
    addTerm,
    updateTerm,
    deleteTerm,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    linkGoogleAccount,
    disconnectGoogleAccount,
    addToast,
    removeToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
