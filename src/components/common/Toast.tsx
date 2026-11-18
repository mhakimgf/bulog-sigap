"use client";

import React from "react";
import { useWarehouse } from "../../context/WarehouseContext";

export interface ToastMessageData {
  type?: "success" | "warning" | "info" | "error" | string;
  message?: string;
}

export const Toast: React.FC = () => {
  const { toastMessage: rawToast } = useWarehouse();
  const toastMessage = rawToast as ToastMessageData | null;

  if (!toastMessage) return null;

  const isSuccess = toastMessage.type === "success";
  const isWarning = toastMessage.type === "warning";
  const isInfo = toastMessage.type === "info";

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[92%] animate-bounce shadow-2xl">
      <div
        className={`flex items-start gap-3 p-4 rounded-xl border ${
          isSuccess
            ? "bg-emerald-900/95 text-white border-emerald-500"
            : isWarning
            ? "bg-amber-900/95 text-white border-amber-500"
            : isInfo
            ? "bg-brand-blue-900/95 text-white border-brand-blue-400"
            : "bg-red-900/95 text-white border-red-500"
        } backdrop-blur-md`}
      >
        <span className="material-symbols-outlined text-2xl flex-shrink-0">
          {isSuccess ? "check_circle" : isWarning ? "warning" : "info"}
        </span>
        <div className="flex-1 text-sm font-medium leading-relaxed">
          {toastMessage.message}
        </div>
      </div>
    </div>
  );
};
