"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  List,
  Moon,
  Printer,
  Sun,
} from "lucide-react";
import { ImportButton } from "@/features/workspace/Import";
import { ExportButton } from "@/features/workspace/Export";
import { GoogleAuthCard } from "@/features/workspace/GoogleAuthCard";
import { TermsManager } from "@/features/workspace/TermsManager";
import { useTheme } from "@/context/ThemeProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const [transactionsOpen, setTransactionsOpen] = useState(pathname === "/transactions");
  const [transactionView, setTransactionView] = useState("all");

  const navItems = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  ];

  useEffect(() => {
    if (pathname === "/transactions") setTransactionsOpen(true);
  }, [pathname]);

  useEffect(() => {
    const updateTransactionView = () => {
      const queryView = new URLSearchParams(window.location.search).get("view");
      const view = queryView || window.location.hash.slice(1);
      setTransactionView(view === "buy" || view === "sell" ? view : "all");
    };

    updateTransactionView();
    window.addEventListener("hashchange", updateTransactionView);
    return () => window.removeEventListener("hashchange", updateTransactionView);
  }, []);

  function openTransactionView(view: "all" | "buy" | "sell") {
    setTransactionsOpen(true);
    setTransactionView(view);
    router.push(`/transactions?view=${view}`);
    window.dispatchEvent(new CustomEvent("transaction-view-change", { detail: view }));
  }

  return (
    <aside className="sidebar flex flex-col justify-between h-full">
      <div>
        <div className="px-2 mb-6 font-bold uppercase text-md">
          FastBreak Tracker
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]"
                style={{
                  color: isActive ? "var(--accent)" : "var(--text2)",
                  background: isActive ? "var(--mutedaccent)" : "transparent",
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div>
            <div
              className="group flex items-center rounded-lg text-sm transition-all hover:bg-blue-50 hover:text-blue-700"
              style={{
                color: pathname === "/transactions" ? "var(--accent)" : "var(--text2)",
                background: pathname === "/transactions" ? "var(--mutedaccent)" : "transparent",
              }}
            >
              <button
                type="button"
                onClick={() => openTransactionView("all")}
                className="flex flex-1 items-center gap-2.5 px-3 py-2 text-left cursor-pointer active:scale-[0.98]"
              >
                <List size={16} />
                <span>Transactions</span>
              </button>
              <button
                type="button"
                aria-label={transactionsOpen ? "Collapse transaction views" : "Expand transaction views"}
                aria-expanded={transactionsOpen}
                onClick={() => setTransactionsOpen((open) => !open)}
                className="px-3 py-2 text-current transition-colors hover:text-blue-700 active:scale-90 cursor-pointer"
              >
                {transactionsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            </div>

            {transactionsOpen && (
              <div className="ml-5 mt-1 flex flex-col gap-0.5 border-l border-[var(--border)] pl-2">
                {[
                  ["all", "All Transactions"],
                  ["buy", "Buy Transactions"],
                  ["sell", "Sell Transactions"],
                ].map(([view, label]) => {
                  const isViewActive = pathname === "/transactions" && transactionView === view;
                  return (
                    <button
                      key={view}
                      type="button"
                      onClick={() => openTransactionView(view as "all" | "buy" | "sell")}
                      className="rounded-md px-3 py-1.5 text-left text-xs transition-all hover:bg-blue-50 hover:text-blue-700 active:translate-x-0.5 cursor-pointer"
                      style={{
                        color: isViewActive ? "var(--accent)" : "var(--text2)",
                        background: isViewActive ? "var(--mutedaccent)" : "transparent",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href="/print"
            className="group px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]"
            style={{
              color: pathname === "/print" ? "var(--accent)" : "var(--text2)",
              background: pathname === "/print" ? "var(--mutedaccent)" : "transparent",
            }}
          >
            <Printer size={16} />
            <span>Print</span>
          </Link>
        </nav>
      </div>

      <TermsManager />

      <div className="mt-auto pt-4 border-t border-[var(--border)] flex flex-col gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle"
          style={{ color: "var(--text2)" }}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span>{isDark ? "Dark mode" : "Light mode"}</span>
          {isDark ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <GoogleAuthCard />
        <ImportButton />
        <ExportButton />
      </div>
    </aside>
  );
}