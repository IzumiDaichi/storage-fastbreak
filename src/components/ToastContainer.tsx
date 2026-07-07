// src/components/ToastContainer.tsx
"use client";

import { useApp } from "@/context/AppContext";
import { CheckCircle2, AlertCircle, Info, Loader2, X } from "lucide-react";

const toastStyles = {
  success: {
    bg: "#064e3b",
    border: "#059669",
    text: "#a7f3d0",
    icon: CheckCircle2,
  },
  error: {
    bg: "#7f1d1d",
    border: "#dc2626",
    text: "#fca5a5",
    icon: AlertCircle,
  },
  info: { bg: "#1e3a8a", border: "#2563eb", text: "#bfdbfe", icon: Info },
  syncing: { bg: "#14532d", border: "#16a34a", text: "#bbf7d0", icon: Loader2 },
};

export default function ToastContainer() {
  const context = useApp();

  // Defensive fallback checkpoint: If context is loading or unpopulated, bypass rendering
  if (
    !context ||
    !context.toasts ||
    !Array.isArray(context.toasts) ||
    context.toasts.length === 0
  ) {
    return null;
  }

  const { toasts, removeToast } = context;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        if (!toast) return null;

        const style = toastStyles[toast.type] || toastStyles.info;
        const Icon = style.icon;

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-slide-in"
            style={{
              background: style.bg,
              borderColor: style.border,
              color: style.text,
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon
                size={16}
                className={
                  toast.type === "syncing"
                    ? "animate-spin flex-shrink-0"
                    : "flex-shrink-0"
                }
              />
              <p className="text-xs font-medium tracking-wide leading-tight truncate">
                {toast.message}
              </p>
            </div>

            {toast.type !== "syncing" && (
              <button
                onClick={() => {
                  if (typeof removeToast === "function") {
                    removeToast(toast.id);
                  }
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer text-current/70 hover:text-current"
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
