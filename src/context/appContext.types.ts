import type { Transaction, Term, Classification, Capital } from "@/types";

export interface AppNotificationToast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "syncing";
}

export interface AppContextType {
  transactions: Transaction[];
  capitalRecords: Capital[];
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
  setClassifications: (classifications: Classification[]) => void;
  setCapitalRecords: (records: Capital[]) => void;
  switchTerm: (term: Term | null) => void;
  updateCapitalRecord: (termId: string, startingCapital: number) => Promise<void>;
  addTerm: (name: string) => Promise<void>;
  updateTerm: (id: string, newName: string) => Promise<void>;
  deleteTerm: (id: string) => Promise<void>;
  addTransaction: (payload: any) => Promise<void>;
  updateTransaction: (id: string, payload: any) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  disconnectGoogleAccount: () => Promise<void>;
  toasts: AppNotificationToast[];
  addToast: (message: string, type: AppNotificationToast["type"]) => void;
  removeToast: (id: string) => void;
}
