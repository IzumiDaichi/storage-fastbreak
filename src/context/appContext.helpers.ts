import type { Transaction, Term, Classification, Capital } from "@/types";
import type { AppNotificationToast } from "./appContext.types";

export function createTimestamp() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildPayload(
  terms: Term[],
  transactions: Transaction[],
  classifications: Classification[],
  activeTerm: Term | null,
  capitalRecords: Capital[],
  timestamp: string
) {
  return {
    terms,
    transactions,
    classifications,
    activeTerm,
    capitalRecords,
    lastBackup: timestamp,
  };
}

export function makeToast(message: string, type: AppNotificationToast["type"]) {
  return { message, type };
}
