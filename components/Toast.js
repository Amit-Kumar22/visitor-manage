"use client";

import { useEffect } from "react";

// Simple, dependency-free toast banner. Parent owns the { message, type } state
// and passes onClose; this just handles the auto-dismiss timer and styling.
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === "error";

  return (
    <div className="fixed top-4 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0">
      <div
        role="alert"
        className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${
          isError
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-800"
        }`}
      >
        <span className="mt-0.5 text-lg leading-none">{isError ? "⚠️" : "✅"}</span>
        <p className="flex-1 text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-lg leading-none opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
