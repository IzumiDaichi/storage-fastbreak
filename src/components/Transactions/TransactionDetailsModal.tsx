"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { Transaction } from "@/types";

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  linkedTransaction?: Transaction | null;
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1 rounded-lg border border-slate-800/70 bg-slate-950/40 p-3">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="break-words text-xs font-medium text-slate-200">{value || "—"}</div>
    </div>
  );
}

function TransactionDetails({
  transaction,
  linkedTransaction,
}: {
  transaction: Transaction;
  linkedTransaction?: Transaction | null;
}) {
  const linkedLabel = transaction.category === "Buy" ? "Linked Sell UID" : "Linked Buy UID";

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Detail label="UID" value={transaction.uid} />
      <Detail label="Category" value={transaction.category} />
      <Detail label="Date" value={transaction.date} />
      <Detail label="Term" value={transaction.term || transaction.term_id} />
      <Detail label="Classification" value={transaction.classification} />
      <div className="sm:col-span-2">
        <Detail label="Description" value={transaction.description} />
      </div>
      <div className="sm:col-span-2">
        <Detail label="Tags" value={transaction.tags} />
      </div>
      <Detail label="Bags" value={transaction.bags} />
      <Detail label="Rate" value={transaction.price} />
      <Detail label="Agent Bags" value={transaction.agent_bags_count ?? transaction.agent_bags} />
      <Detail label="Agent Cost / Bag" value={transaction.agent_cost_per_bag ?? transaction.agent_rate} />
      <Detail label="Transfer Bags" value={transaction.transfer_bags_count ?? transaction.transfer_bags} />
      <Detail label="Transfer Cost / Bag" value={transaction.transfer_cost_per_bag ?? transaction.transfer_rate} />
      <Detail label="Other Expenses" value={transaction.other_exp} />
      <Detail label="Receipt URL" value={transaction.receiptUrl} />
      <Detail label={linkedLabel} value={linkedTransaction?.uid} />
    </div>
  );
}

export function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  linkedTransaction,
}: TransactionDetailsModalProps) {
  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/50 p-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Transaction Details</h2>
            <p className="mt-1 text-[10px] text-slate-500">
              {transaction.uid || transaction.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close transaction details"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div className={`grid gap-5 ${linkedTransaction ? "lg:grid-cols-2" : "grid-cols-1"}`}>
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Selected Record</span>
                <span className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[10px] text-slate-400">
                  {transaction.category}
                </span>
              </div>
              <TransactionDetails transaction={transaction} linkedTransaction={linkedTransaction} />
            </section>

            {linkedTransaction && (
              <section className="space-y-3 border-t border-slate-800 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-300">Linked Record</span>
                  <span className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] text-violet-300">
                    {linkedTransaction.uid || "No UID"}
                  </span>
                </div>
                <TransactionDetails transaction={linkedTransaction} linkedTransaction={transaction} />
              </section>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-800 bg-slate-950/30 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-700 px-6 py-2 text-xs font-bold text-slate-100 transition-colors hover:bg-slate-600 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
