import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { calcTxn } from "@/lib/calc";

export type DateMode = "month" | "exact";
export type DateSortOrder = "latest" | "oldest";

export function useTransactionFilters() {
  const { transactions = [], activeTerm, classifications = [] } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("month");
  const [filterExactDate, setFilterExactDate] = useState("");
  const [filterAgent, setFilterAgent] = useState(false);
  const [filterTransfer, setFilterTransfer] = useState(false);
  const [filterOther, setFilterOther] = useState(false);
  const [filterTags, setFilterTags] = useState(false);
  const [filterConnected, setFilterConnected] = useState(false);
  const [dateSortOrder, setDateSortOrder] = useState<DateSortOrder>("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const applyViewFromHash = (event?: Event) => {
      const eventView = event instanceof CustomEvent && typeof event.detail === "string"
        ? event.detail
        : null;
      const queryView = new URLSearchParams(window.location.search).get("view");
      const view = eventView || queryView || window.location.hash.slice(1);
      setFilterCat(view === "buy" || view === "sell" ? view[0].toUpperCase() + view.slice(1) : "");
    };

    applyViewFromHash();
    window.addEventListener("hashchange", applyViewFromHash);
    window.addEventListener("transaction-view-change", applyViewFromHash);
    return () => {
      window.removeEventListener("hashchange", applyViewFromHash);
      window.removeEventListener("transaction-view-change", applyViewFromHash);
    };
  }, []);

  const suggestedFilterClassifications = useMemo(() => {
    const collected = new Set<string>();

    classifications.forEach((c) => {
      const trimmed = c.name?.trim();
      if (trimmed) collected.add(trimmed);
    });

    transactions.forEach((t) => {
      const trimmed = t.classification?.trim();
      if (trimmed) collected.add(trimmed);
    });

    return Array.from(collected).sort((a, b) => a.localeCompare(b));
  }, [classifications, transactions]);

  const filteredAndSortedTransactions = useMemo(() => {
    const resolveLinkedBuyUid = (txn: typeof transactions[number]) => {
      if (txn.linked_buy_uid) return txn.linked_buy_uid;

      if (txn.linked_buy_id) {
        const matched = transactions.find((candidate) => candidate.id === txn.linked_buy_id);
        return matched?.uid ?? null;
      }

      return null;
    };

    const resolveLinkedBuyRecord = (txn: typeof transactions[number]) => {
      const linkedBuyUid = resolveLinkedBuyUid(txn);

      if (!linkedBuyUid) return null;

      return (
        transactions.find((candidate) => candidate.uid === linkedBuyUid) ||
        transactions.find((candidate) => candidate.id === txn.linked_buy_id) ||
        null
      );
    };

    const hasLinkedRelationship = (txn: typeof transactions[number]) => {
      if (txn.category === "Sell") {
        const linkedBuyUid = resolveLinkedBuyUid(txn);
        return !!linkedBuyUid && transactions.some((candidate) => candidate.uid === linkedBuyUid);
      }

      if (txn.category === "Buy") {
        return transactions.some(
          (candidate) =>
            candidate.category === "Sell" &&
            (candidate.linked_buy_uid === txn.uid ||
              (candidate.linked_buy_id === txn.id &&
                (!candidate.linked_buy_uid || candidate.linked_buy_uid === txn.uid))),
        );
      }

      return false;
    };

    const filteredList = transactions
      .filter((t) => {
        if (!activeTerm) return false;

        const matchesTerm =
          t.term_id === activeTerm.id ||
          t.term === activeTerm.name ||
          t.termId === activeTerm.id;

        if (!matchesTerm) return false;
        if (searchQuery) {
          const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
          const matchesSearch =
            (t.uid || "").toLocaleLowerCase().includes(normalizedSearch) ||
            (t.tags || "").toLocaleLowerCase().includes(normalizedSearch);

          if (!matchesSearch) return false;
        }
        if (filterCat && t.category !== filterCat) return false;
        if (filterClass && t.classification !== filterClass) return false;

        if (dateMode === "month") {
          if (filterMonth && !t.date?.startsWith(filterMonth)) return false;
        } else if (filterExactDate && t.date !== filterExactDate) {
          return false;
        }

        if (filterAgent && !((t.agent_bags || 0) > 0)) return false;
        if (filterTransfer && !((t.transfer_bags || 0) > 0)) return false;
        if (filterOther && !((t.other_exp || 0) > 0)) return false;
        if (filterTags && !(t.tags && t.tags.trim().length > 0)) return false;
        if (filterConnected && !hasLinkedRelationship(t)) return false;

        return true;
      })
      .map((t) => {
        const linkedPair =
          t.category === "Sell"
            ? resolveLinkedBuyRecord(t)
            : t.category === "Buy"
              ? transactions.find(
                  (candidate) =>
                    candidate.category === "Sell" &&
                    (candidate.linked_buy_uid === t.uid || candidate.linked_buy_id === t.id),
                ) || null
              : null;

        return {
          ...t,
          computedMetrics: calcTxn(t),
          linkedPair,
          hasLinkedRelationship: hasLinkedRelationship(t),
        };
      });

    return [...filteredList].sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return dateSortOrder === "latest" ? timeB - timeA : timeA - timeB;
    });
  }, [
    transactions,
    activeTerm,
    searchQuery,
    filterCat,
    filterClass,
    filterMonth,
    dateMode,
    filterExactDate,
    filterAgent,
    filterTransfer,
    filterOther,
    filterTags,
    filterConnected,
    dateSortOrder,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterCat,
    filterClass,
    filterMonth,
    dateMode,
    filterExactDate,
    filterAgent,
    filterTransfer,
    filterOther,
    filterTags,
    filterConnected,
    dateSortOrder,
    itemsPerPage,
  ]);

  const totalItems = filteredAndSortedTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const paginatedTransactions = useMemo(
    () => filteredAndSortedTransactions.slice(startIndex, endIndex),
    [filteredAndSortedTransactions, startIndex, endIndex],
  );

  const resetFilters = () => {
    setSearchQuery("");
    setFilterCat("");
    setFilterClass("");
    setFilterMonth("");
    setFilterExactDate("");
    setDateMode("month");
    setFilterAgent(false);
    setFilterTransfer(false);
    setFilterOther(false);
    setFilterTags(false);
    setFilterConnected(false);
    setDateSortOrder("latest");
    setItemsPerPage(10);
  };

  return {
    searchQuery,
    setSearchQuery,
    filterCat,
    setFilterCat,
    filterClass,
    setFilterClass,
    filterMonth,
    setFilterMonth,
    dateMode,
    setDateMode,
    filterExactDate,
    setFilterExactDate,
    filterAgent,
    setFilterAgent,
    filterTransfer,
    setFilterTransfer,
    filterOther,
    setFilterOther,
    filterTags,
    setFilterTags,
    filterConnected,
    setFilterConnected,
    dateSortOrder,
    setDateSortOrder,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    suggestedFilterClassifications,
    filteredAndSortedTransactions,
    paginatedTransactions,
    totalItems,
    totalPages,
    safeCurrentPage,
    startIndex,
    endIndex,
    resetFilters,
  };
}
