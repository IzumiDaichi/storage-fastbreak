"use client";

import { createContext, useContext } from "react";
import type { AppContextType } from "./appContext.types";

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be evaluated within an active AppProvider hierarchy.");
  }

  return context;
}