"use client";

import {
  Eye,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";

import { TagPill } from "@/components/ui";
import { ReusableTable } from "@/components/Table";
import { fmt, fmtSigned } from "@/lib/calc";
import type { Transaction } from "@/types";

export type TransactionsTableProps = {
  loading?: boolean;
  paginatedTransactions: Array<
    Transaction & { computedMetrics: any }
  >;

  totalItems: number;
  startIndex: number;
  endIndex: number;
  totalPages: number;
  safeCurrentPage: number;

  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;

  setCurrentPage: (
    value: number | ((prev: number) => number)
  ) => void;

  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onOpenReceipt: (
    url: string | undefined | null
  ) => void;
};

export function TransactionTable({
  loading = false,
  paginatedTransactions,
  totalItems,
  startIndex,
  endIndex,
  totalPages,
  safeCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  onView,
  onEdit,
  onDelete,
  onOpenReceipt,
}: TransactionsTableProps) {
  return (
    <div className="transactions-table">
      <ReusableTable
        loading={loading}
        columnCount={10}
        minWidth="1100px"
        columnWidths={[
          "14%",
          "11%",
          "13%",
          "17%",
          "6%",
          "7%",
          "8%",
          "8%",
          "7%",
          "9%",
        ]}
        header={
          <tr className="border-b border-[var(--border)] bg-[var(--bg2)] font-bold uppercase tracking-wider text-[10px] text-[var(--text2)]">
            <th className="p-3.5">
              Identifier
            </th>

            <th className="p-3.5">
              Classification
            </th>

            <th className="p-3.5">
              Tags
            </th>

            <th className="p-3.5">
              Description
            </th>

            <th className="p-3.5 text-center">
              Bags
            </th>

            <th className="p-3.5 text-right">
              Rate
            </th>

            <th className="p-3.5 text-right">
              Gross
            </th>

            <th className="p-3.5 text-right">
              Net
            </th>

            <th className="p-3.5 text-center">
              Receipt
            </th>

            <th className="p-3.5 text-center">
              Actions
            </th>
          </tr>
        }
        pagination={{
          totalItems,
          startIndex,
          endIndex,
          totalPages,
          currentPage: safeCurrentPage,
          setCurrentPage,
          itemsPerPage,
          setItemsPerPage,
        }}
      >
        {paginatedTransactions.length === 0 ? (
          <tr>
            <td
              colSpan={10}
              className="py-16 text-center font-medium italic text-[var(--text2)]"
            >
              No records matched the active
              filter variables.
            </td>
          </tr>
        ) : (
          paginatedTransactions.map((t) => {
            const c = t.computedMetrics;

            const tags = (t.tags || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);

            const isPositive = c.total >= 0;

            const linkedPair = (
              t as Transaction & {
                linkedPair?: Transaction | null;
              }
            ).linkedPair;

            const isBuy = t.category === "Buy";

            return (
              <tr
                key={t.id}
                className={`group/row border-l-4 transition-colors duration-150 ${
                  isBuy
                    ? "row-buy"
                    : "row-sell"
                }`}
                style={{
                  backgroundColor: isBuy
                    ? "var(--buy-bg)"
                    : "var(--sell-bg)",
                  borderLeftColor: isBuy
                    ? "var(--buy-border)"
                    : "var(--sell-border)",
                }}
              >
                {/* =================================================
                    IDENTIFIER
                    ================================================= */}

                <td className="uid p-3 align-top whitespace-nowrap font-mono tracking-tight">
                  <div>
                    {t.uid || "—"}
                  </div>

                  <div className="date mt-1 text-[10px] font-normal">
                    {t.date || "—"}
                  </div>

                  <div
                    className="mt-1 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      color: isBuy
                        ? "var(--buy-border)"
                        : "var(--sell-border)",
                    }}
                  >
                    {t.category}
                  </div>
                </td>

                {/* =================================================
                    CLASSIFICATION
                    ================================================= */}

                <td
                  className="classification truncate p-3"
                  title={t.classification}
                >
                  {t.classification || "—"}
                </td>

                {/* =================================================
                    TAGS
                    ================================================= */}

                <td className="overflow-hidden p-3 align-top">
                  {tags.length > 0 ? (
                    <div className="flex max-w-full flex-wrap gap-1">
                      {tags.map((tag) => (
                        <TagPill
                          key={tag}
                          tag={tag}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--text2)]">
                      —
                    </span>
                  )}
                </td>

                {/* =================================================
                    DESCRIPTION
                    ================================================= */}

                <td className="description p-3">
                  <div
                    className="truncate"
                    title={`${
                      t.uid
                        ? `${t.uid} • `
                        : ""
                    }${
                      t.description || ""
                    }`}
                  >
                    {t.description || "—"}
                  </div>

                  {linkedPair && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                      {linkedPair.uid ? (
                        <button
                          type="button"
                          onClick={() =>
                            onView(linkedPair)
                          }
                          className="link truncate font-mono font-semibold"
                          title={`View linked transaction ${linkedPair.uid}`}
                        >
                          {linkedPair.uid}
                        </button>
                      ) : (
                        <span className="font-mono text-[var(--text2)]">
                          —
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* =================================================
                    BAGS
                    ================================================= */}

                <td className="bags p-3 text-center font-mono">
                  {t.bags || 0}
                </td>

                {/* =================================================
                    RATE
                    ================================================= */}

                <td className="rate p-3 text-right font-mono">
                  {fmt(t.price || 0)}
                </td>

                {/* =================================================
                    GROSS
                    ================================================= */}

                <td className="gross p-3 text-right font-mono">
                  {fmt(c.saleTotal)}
                </td>

                {/* =================================================
                    NET
                    ================================================= */}

                <td
                  className="p-3 text-right text-sm font-mono font-bold tracking-tight"
                  style={{
                    color: isPositive
                      ? "var(--sell-border)"
                      : "var(--buy-border)",
                  }}
                >
                  {fmtSigned(c.total)}
                </td>

                {/* =================================================
                    RECEIPT
                    ================================================= */}

                <td className="overflow-hidden p-3 text-center whitespace-nowrap">
                  {(t as any).receiptUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenReceipt(
                          (t as any)
                            .receiptUrl
                        )
                      }
                      className="receipt-action mx-auto inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide shadow-sm transition-all"
                    >
                      <span>
                        View Reciept
                      </span>
                    </button>
                  ) : (
                    <span className="select-none font-mono text-[var(--text2)]">
                      —
                    </span>
                  )}
                </td>

                {/* =================================================
                    ACTIONS
                    ================================================= */}

                <td className="p-3 text-center whitespace-nowrap">
                  <div className="inline-flex items-center justify-center gap-1.5">

                    {/* VIEW */}

                    <button
                      type="button"
                      onClick={() =>
                        onView(t)
                      }
                      className="transaction-action rounded-lg border shadow-sm transition-all"
                      title="View transaction details"
                      aria-label="View transaction details"
                    >
                      <Eye size={16} />
                    </button>

                    {/* EDIT */}

                    <button
                      type="button"
                      onClick={() =>
                        onEdit(t)
                      }
                      className="transaction-action rounded-lg border shadow-sm transition-all"
                      title="Edit transaction"
                      aria-label="Edit transaction"
                    >
                      <Pencil size={16} />
                    </button>

                    {/* DELETE */}

                    <button
                      type="button"
                      onClick={() =>
                        onDelete(t.id)
                      }
                      className="transaction-action btn-danger"
                      title="Delete transaction"
                      aria-label="Delete transaction"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>
                </td>
              </tr>
            );
          })
        )}
      </ReusableTable>
    </div>
  );
}