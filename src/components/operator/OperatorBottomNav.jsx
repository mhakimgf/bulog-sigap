"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWarehouse } from "../../context/WarehouseContext";

export const OperatorBottomNav = () => {
  const { operatorScreen, setOperatorScreen, selectedStapelId } = useWarehouse();
  const pathname = usePathname() || "";
  const router = useRouter();

  const isHome = pathname === "/operator" || (!pathname.startsWith("/operator/") && operatorScreen === "home");
  const isStapel = pathname.startsWith("/operator/stapel") || operatorScreen === "stapel-detail";
  const isInbound = pathname === "/operator/inbound" || operatorScreen === "inbound";
  const isHistory = pathname === "/operator/history" || operatorScreen === "history";
  const isOutbound = pathname === "/operator/outbound" || operatorScreen === "outbound";

  const handleNav = (screen, url) => {
    setOperatorScreen(screen);
    try {
      router.push(url);
    } catch {}
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#E2E8F0] shadow-[0_-4px_16px_rgba(0,38,91,0.06)]">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Tab 1: Home */}
        <button
          onClick={() => handleNav("home", "/operator")}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            isHome ? "text-[#1E3D73] font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isHome ? "'FILL' 1" : "'FILL' 0" }}
          >
            home
          </span>
          <span className="text-[11px] tracking-tight">Beranda</span>
        </button>

        {/* Tab 2: Stapel / Stok */}
        <button
          onClick={() => handleNav("stapel-detail", `/operator/stapel/${selectedStapelId || "G1-A2"}`)}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            isStapel ? "text-[#1E3D73] font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isStapel ? "'FILL' 1" : "'FILL' 0" }}
          >
            grid_view
          </span>
          <span className="text-[11px] tracking-tight">Stapel</span>
        </button>

        {/* Central Floating Button: QR Scan */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => handleNav("inbound", "/operator/inbound")}
            aria-label="Pindai QR Tumpukan"
            className="w-14 h-14 rounded-full bg-[#F0A516] hover:bg-[#D4900F] text-[#0F2040] shadow-[0_6px_20px_rgba(240,165,22,0.45)] flex items-center justify-center active:scale-95 transition-all border-4 border-white cursor-pointer"
          >
            <span
              className="material-symbols-outlined text-[30px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              qr_code_scanner
            </span>
          </button>
        </div>

        {/* Tab 4: Mutasi / Riwayat */}
        <button
          onClick={() => handleNav("history", "/operator/history")}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            isHistory ? "text-[#1E3D73] font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isHistory ? "'FILL' 1" : "'FILL' 0" }}
          >
            receipt_long
          </span>
          <span className="text-[11px] tracking-tight">Riwayat</span>
        </button>

        {/* Tab 5: Penyaluran / Barang Keluar */}
        <button
          onClick={() => handleNav("outbound", "/operator/outbound")}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors cursor-pointer ${
            isOutbound ? "text-[#1E3D73] font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isOutbound ? "'FILL' 1" : "'FILL' 0" }}
          >
            outbox
          </span>
          <span className="text-[11px] tracking-tight">Keluar</span>
        </button>
      </div>
    </nav>
  );
};
