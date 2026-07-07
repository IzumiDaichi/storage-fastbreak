// src/types/index.ts

export interface Term {
  id: string;
  name: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  term_id: string;
  category: "Buy" | "Sell";
  date: string;
  classification: string;
  tags: string;
  description: string;
  bags: number;
  price: number;
  agent_bags: number;
  agent_rate: number;
  transfer_bags: number;
  transfer_rate: number;
  other_exp: number;
  created_at: string;
}

export interface Capital {
  id: string;
  term_id: string;
  starting_capital: number;
  updated_at: string;
}

export interface Classification {
  id: string;
  name: string;
  created_at: string;
}

export interface CalcResult {
  saleTotal: number;
  agentCost: number;
  transferCost: number;
  totalExp: number;
  total: number;
}

export interface NetProfit {
  sellRevenue: number;
  buyCost: number;
  totalExp: number;
  netProfit: number;
}

// Toast structure for user feedback messages

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "syncing";
}

// Container for the complete local file structure saved to disk
export interface LocalStorageSchema {
  terms: Term[];
  transactions: Transaction[];
  capitalRecord: Capital | null;
  classifications: Classification[];
  activeTerm: Term | null;
}
