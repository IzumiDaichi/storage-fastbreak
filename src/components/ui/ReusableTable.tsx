"use client";

import { useRef } from "react";
import type React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

type PaginationProps = {
  totalItems: number;
  startIndex: number;
  endIndex: number;
  totalPages: number;
  currentPage: number;

  setCurrentPage: (
    value: number | ((prev: number) => number)
  ) => void;

  itemsPerPage?: number;
  setItemsPerPage?: (value: number) => void;
};

type ReusableTableProps = {
  children: React.ReactNode;
  header: React.ReactNode;

  pagination?: PaginationProps;

  loading?: boolean;
  columnCount?: number;
  minWidth?: string;
  bodyMaxHeight?: string;
  className?: string;

  /**
   * Shared column widths.
   * Example:
   * ["80px", "120px", "100px", "1fr"]
   */
  columnWidths?: string[];
};

export function ReusableTable({
  children,
  header,
  pagination,
  loading = false,
  columnCount = 1,
  minWidth = "100%",
  bodyMaxHeight = "68vh",
  columnWidths,
  className = "",
}: ReusableTableProps) {
  const showPagination = pagination !== undefined && pagination.totalItems > 0;

  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  function handleBodyScroll() {
    if (
      bodyScrollRef.current &&
      headerScrollRef.current
    ) {
      headerScrollRef.current.scrollLeft =
        bodyScrollRef.current.scrollLeft;
    }
  }

  const renderColGroup = () => {
    if (!columnWidths) return null;

    return (
      <colgroup>
        {columnWidths.map((width, index) => (
          <col
            key={index}
            style={{ width }}
          />
        ))}
      </colgroup>
    );
  };

  return (
    <div className={`overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg4)] shadow-sm ${className}`}>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div ref={headerScrollRef} className="overflow-hidden">
        <table
          className="w-full border-collapse table-fixed text-left text-xs"
          style={{ minWidth }}
        >
          {renderColGroup()}

          <thead>
            {header}
          </thead>
        </table>
      </div>

      {/* =====================================================
          DATA
          ONLY THIS AREA VERTICALLY SCROLLS
          ===================================================== */}

      <div
        ref={bodyScrollRef}
        onScroll={handleBodyScroll}
        className="max-h-[68vh] overflow-auto"
        style={{
          maxHeight: bodyMaxHeight,
          scrollbarGutter: "stable",
        }}
      >
        <table
          className="w-full border-collapse table-fixed text-left text-xs"
          style={{ minWidth }}
        >
          {renderColGroup()}

          <tbody className="divide-y divide-[var(--border)] text-[var(--text)]">
            {loading ? (
              Array.from({ length: 8 }).map(
                (_, rowIndex) => (
                  <tr
                    key={`loading-${rowIndex}`}
                    className="animate-pulse"
                  >
                    {Array.from({
                      length: columnCount,
                    }).map((_, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="p-3"
                      >
                        <div className="h-4 w-full rounded bg-[var(--bg3)]" />
                      </td>
                    ))}
                  </tr>
                )
              )
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          PAGINATION
          ===================================================== */}

      {showPagination && pagination && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg2)] px-4 py-3 text-xs sm:flex-row">

          <div className="text-[var(--text2)]">
            Showing{" "}
            <span className="font-semibold text-[var(--text)]">
              {pagination.startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-[var(--text)]">
              {Math.min(
                pagination.endIndex,
                pagination.totalItems
              )}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[var(--text)]">
              {pagination.totalItems}
            </span>{" "}
            transactions
          </div>

          <div className="flex items-center gap-6">

            {pagination.itemsPerPage !== undefined &&
              pagination.setItemsPerPage && (
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text2)]">
                    Rows per page:
                  </span>

                  <select
                    value={pagination.itemsPerPage}
                    onChange={(e) =>
                      pagination.setItemsPerPage!(
                        Number(e.target.value)
                      )
                    }
                    className="cursor-pointer rounded border border-[var(--border)] bg-[var(--bg2)] px-2 py-1 text-xs text-[var(--text)] outline-none"
                  >
                    {[5, 10, 20, 50].map(
                      (size) => (
                        <option
                          key={size}
                          value={size}
                        >
                          {size}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}

            <div className="font-medium text-[var(--text2)]">
              Page{" "}
              <span className="text-[var(--text)]">
                {pagination.currentPage}
              </span>{" "}
              of{" "}
              <span className="text-[var(--text)]">
                {pagination.totalPages}
              </span>
            </div>

            <div className="flex items-center gap-1">

              <button
                type="button"
                onClick={() =>
                  pagination.setCurrentPage(1)
                }
                disabled={
                  pagination.currentPage === 1
                }
                className="pagination-action"
                title="First page"
                aria-label="First page"
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() =>
                  pagination.setCurrentPage(
                    (prev) =>
                      Math.max(prev - 1, 1)
                  )
                }
                disabled={
                  pagination.currentPage === 1
                }
                className="pagination-action"
                title="Previous page"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() =>
                  pagination.setCurrentPage(
                    (prev) =>
                      Math.min(
                        prev + 1,
                        pagination.totalPages
                      )
                  )
                }
                disabled={
                  pagination.currentPage ===
                  pagination.totalPages
                }
                className="pagination-action"
                title="Next page"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={() =>
                  pagination.setCurrentPage(
                    pagination.totalPages
                  )
                }
                disabled={
                  pagination.currentPage ===
                  pagination.totalPages
                }
                className="pagination-action"
                title="Last page"
                aria-label="Last page"
              >
                <ChevronsRight size={14} />
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}