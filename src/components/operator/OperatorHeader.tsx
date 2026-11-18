"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useWarehouse } from "../../context/WarehouseContext";
import { User } from "@/types/auth";

export interface OperatorHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export const OperatorHeader: React.FC<OperatorHeaderProps> = ({
  title = "SIGAP BULOG",
  showBack = false,
  onBack,
}) => {
  const router = useRouter();
  const {
    warehouse,
    isOnline,
    toggleOnlineMode,
    currentUser: rawUser,
    logout,
    setActiveView,
  } = useWarehouse();
  const currentUser = rawUser as User | null;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const userInitials = (currentUser?.name || "Budi Santoso")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-40 bg-[#F8F9FF]/95 backdrop-blur-xl border-b border-[#D0DAF0]/60 shadow-[0_1px_8px_rgba(30,61,115,0.06)]">
      <div className="h-16 px-4 flex items-center justify-between gap-2 max-w-lg mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          {showBack ? (
            <button
              onClick={handleBack}
              aria-label="Kembali"
              className="w-10 h-10 flex items-center justify-center rounded-lg text-[#1E3D73] hover:bg-[#EEF2F9] active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-[#1E3D73] flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                inventory_2
              </span>
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-[#1E3D73] tracking-tight truncate">
                {title}
              </span>
              <button
                onClick={toggleOnlineMode}
                title="Klik untuk simulasi mode Online/Offline"
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 transition-all cursor-pointer ${
                  isOnline
                    ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                    : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? "bg-[#16A34A] animate-pulse" : "bg-[#F59E0B]"
                  }`}
                ></span>
                {isOnline ? "Online" : "Offline"}
              </button>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <span className="material-symbols-outlined text-[13px] text-[#3E62AF]">
                warehouse
              </span>
              <span className="font-mono text-[11px] truncate text-slate-600">
                {warehouse?.name || "Gudang Bulog"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* If user is superadmin or kepala gudang, allow switching back to Dashboard */}
          {currentUser && currentUser.role !== "operator" && (
            <button
              onClick={() => setActiveView("dashboard")}
              title="Kembali ke Dashboard Utama"
              className="px-2 py-1 bg-[#1E3D73] text-white hover:bg-[#162D55] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">dashboard</span>
              <span className="hidden sm:inline">Dashboard</span>
            </button>
          )}

          <button
            onClick={logout}
            title="Keluar (Logout)"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>

          <div className="flex items-center pl-1">
            <div
              title={`${currentUser?.name || "User"} (${currentUser?.role || "Operator"})`}
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-[#D0DAF0] ${
                currentUser?.role === "superadmin"
                  ? "bg-purple-600 text-white"
                  : currentUser?.role === "kepala_gudang"
                  ? "bg-[#1E3D73] text-white"
                  : "bg-[#F0A516] text-[#0A1630]"
              }`}
            >
              {userInitials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
