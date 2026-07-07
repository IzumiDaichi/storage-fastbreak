"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Transaction, Term, Classification } from "@/types";

interface AppNotificationToast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "syncing";
}

interface AppContextType {
  transactions: Transaction[];
  terms: Term[];
  classifications: Classification[];
  activeTerm: Term | null;
  loading: boolean;
  isGoogleLinked: boolean;
  googleUserEmail: string | null;
  lastBackup: string | null;
  driveSync: "idle" | "pending" | "synced" | "error";
  setTerms: (terms: Term[]) => void;
  setTransactions: (txns: Transaction[]) => void;
  switchTerm: (term: Term | null) => void;
  addTerm: (name: string) => Promise<void>;
  updateTerm: (id: string, newName: string) => Promise<void>;
  deleteTerm: (id: string) => Promise<void>;
  addTransaction: (payload: any) => Promise<void>;
  updateTransaction: (id: string, payload: any) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  disconnectGoogleAccount: () => Promise<void>;
  addToast: (message: string, type: AppNotificationToast["type"]) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [masterTerms, setMasterTerms] = useState<Term[]>([]);
  const [masterTransactions, setMasterTransactions] = useState<Transaction[]>([]);
  const [masterClassifications, setMasterClassifications] = useState<Classification[]>([]);
  const [masterActiveTerm, setMasterActiveTerm] = useState<Term | null>(null);

  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [driveSync, setDriveSync] = useState<"idle" | "pending" | "synced" | "error">("idle");
  const [toasts, setToasts] = useState<AppNotificationToast[]>([]);

  const isDesktop =
    typeof window !== "undefined" && window.electronAPI !== undefined;

  // ── 1. BOOTSTRAP ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadInitialSystemData() {
      if (!isDesktop) { setLoading(false); return; }

      try {
        console.log("🔑 Checking auth...");
        const authRes = await window.electronAPI.checkGoogleAuthStatus();

        if (authRes?.success && authRes.isLinked) {
          setIsGoogleLinked(true);
          setGoogleUserEmail(authRes.email);
          console.log(`🔒 Logged in as: ${authRes.email}`);

          setDriveSync("pending");
          const fileRes = await window.electronAPI.readLocalData();

          if (fileRes?.success && fileRes.data) {
            setMasterTerms(fileRes.data.terms || []);
            setMasterTransactions(fileRes.data.transactions || []);
            setMasterClassifications(fileRes.data.classifications || []);
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

  // ── 2. LISTEN FOR ASYNC DRIVE SYNC RESULT ────────────────────────────
  useEffect(() => {
    if (!isDesktop || !window.electronAPI.onDriveSyncStatus) return;
    return window.electronAPI.onDriveSyncStatus((result: { synced: boolean; error?: string }) => {
      setDriveSync(result.synced ? "synced" : "error");
      if (!result.synced) console.warn("Drive sync error:", result.error);
    });
  }, [isDesktop]);

  // ── 3. AUTH SUCCESS LISTENER ─────────────────────────────────────────
  useEffect(() => {
    if (!isDesktop || !window.electronAPI.onAuthSuccess) return;

    window.electronAPI.onAuthSuccess(async (data: { email: string }) => {
      clearAllState();
      setIsGoogleLinked(true);
      setGoogleUserEmail(data.email);

      setDriveSync("pending");
      const fileRes = await window.electronAPI.readLocalData();
      if (fileRes?.success && fileRes.data) {
        setMasterTerms(fileRes.data.terms || []);
        setMasterTransactions(fileRes.data.transactions || []);
        setMasterClassifications(fileRes.data.classifications || []);
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

  // ── 4. SYNC TO DISK ───────────────────────────────────────────────────
  async function syncToDisk(
    updatedTerms: Term[],
    updatedTxns: Transaction[],
    updatedClasses: Classification[],
    currentActive: Term | null,
  ) {
    if (!isDesktop || !isHydrated) return;
    try {
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setLastBackup(timestamp);
      setDriveSync("pending");

      await window.electronAPI.saveLocalData({
        terms: updatedTerms,
        transactions: updatedTxns,
        classifications: updatedClasses,
        activeTerm: currentActive,
        lastBackup: timestamp,
      });
    } catch (err) {
      console.error("Sync failure:", err);
      setDriveSync("error");
    }
  }

  // ── 5. HELPERS ────────────────────────────────────────────────────────
  function clearAllState() {
    setMasterTerms([]);
    setMasterTransactions([]);
    setMasterClassifications([]);
    setMasterActiveTerm(null);
    setIsGoogleLinked(false);
    setGoogleUserEmail(null);
    setDriveSync("idle");
  }

  function addToast(message: string, type: AppNotificationToast["type"]) {
    const id = crypto.randomUUID();
    setToasts((prev) => [...(Array.isArray(prev) ? prev : []), { id, message, type }]);
    if (type !== "syncing") setTimeout(() => removeToast(id), 4000);
  }

  function removeToast(id: string) {
    setToasts((prev) => (Array.isArray(prev) ? prev : []).filter((t) => t.id !== id));
  }

  // ── 6. TERM OPERATIONS ────────────────────────────────────────────────
  function switchTerm(term: Term | null) {
    setMasterActiveTerm(term);
    if (isGoogleLinked)
      syncToDisk(masterTerms, masterTransactions, masterClassifications, term);
  }

  async function addTerm(name: string) {
    const newTerm: Term = { id: crypto.randomUUID(), name };
    const updated = [...masterTerms, newTerm];
    setMasterTerms(updated);
    if (!masterActiveTerm) setMasterActiveTerm(newTerm);
    await syncToDisk(updated, masterTransactions, masterClassifications, masterActiveTerm || newTerm);
    addToast(`Term ${name} generated.`, "success");
  }

  async function updateTerm(id: string, newName: string) {
    const updated = masterTerms.map((t) =>
      t.id === id ? { ...t, name: newName } : t
    );
    setMasterTerms(updated);

    // Keep activeTerm in sync if it's the one being renamed
    const updatedActive =
      masterActiveTerm?.id === id
        ? { ...masterActiveTerm, name: newName }
        : masterActiveTerm;
    if (masterActiveTerm?.id === id) setMasterActiveTerm(updatedActive);

    await syncToDisk(updated, masterTransactions, masterClassifications, updatedActive);
    addToast(`Term renamed to "${newName}".`, "info");
  }

  async function deleteTerm(id: string) {
    const updatedTerms = masterTerms.filter((t) => t.id !== id);
    const updatedTxns = masterTransactions.filter((t) => t.termId !== id);
    setMasterTerms(updatedTerms);

    let nextActive = masterActiveTerm;
    if (masterActiveTerm?.id === id) {
      nextActive = updatedTerms.length > 0 ? updatedTerms[0] : null;
      setMasterActiveTerm(nextActive);
    }

    setMasterTransactions(updatedTxns);
    await syncToDisk(updatedTerms, updatedTxns, masterClassifications, nextActive);
    addToast("Term and associated records wiped.", "error");
  }

  // ── 7. TRANSACTION OPERATIONS ─────────────────────────────────────────
  async function addTransaction(payload: any) {
    const newTxn: Transaction = { id: crypto.randomUUID(), ...payload };
    const updated = [newTxn, ...masterTransactions];
    setMasterTransactions(updated);
    await syncToDisk(masterTerms, updated, masterClassifications, masterActiveTerm);
    addToast("Transaction recorded!", "success");
  }

  async function updateTransaction(id: string, payload: any) {
    const updated = masterTransactions.map((t) => (t.id === id ? { ...t, ...payload } : t));
    setMasterTransactions(updated);
    await syncToDisk(masterTerms, updated, masterClassifications, masterActiveTerm);
    addToast("Transaction updated.", "info");
  }

  async function deleteTransaction(id: string) {
    const updated = masterTransactions.filter((t) => t.id !== id);
    setMasterTransactions(updated);
    await syncToDisk(masterTerms, updated, masterClassifications, masterActiveTerm);
    addToast("Transaction removed.", "error");
  }

  // ── 8. GOOGLE AUTH ────────────────────────────────────────────────────
  async function linkGoogleAccount() {
    if (!isDesktop) { addToast("Cannot connect outside desktop app.", "error"); return; }
    try {
      addToast("Opening authorization window...", "info");
      const res = await window.electronAPI.requestGoogleAuthLink();
      if (!res?.success) addToast(`Connection failed: ${res?.error || "Closed window"}`, "error");
    } catch {
      addToast("Authentication bridge crash caught.", "error");
    }
  }

  async function disconnectGoogleAccount() {
    if (!isDesktop) return;
    try {
      const res = await window.electronAPI.signOutGoogleAccount();
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

  // ── 9. PRIVACY FILTER ─────────────────────────────────────────────────
  const transactions = isGoogleLinked ? masterTransactions : [];
  const terms = isGoogleLinked ? masterTerms : [];
  const classifications = isGoogleLinked ? masterClassifications : [];
  const activeTerm = isGoogleLinked ? masterActiveTerm : null;

  return (
    <AppContext.Provider
      value={{
        transactions,
        terms,
        classifications,
        activeTerm,
        loading,
        isGoogleLinked,
        googleUserEmail,
        lastBackup,
        driveSync,
        setTerms: setMasterTerms,
        setTransactions: setMasterTransactions,
        switchTerm,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context)
    throw new Error("useApp must be evaluated within an active AppProvider hierarchy.");
  return context;
}