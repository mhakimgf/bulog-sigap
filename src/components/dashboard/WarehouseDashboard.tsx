"use client";

import React, { useState } from "react";
import {
  useWarehouse,
  calculateAgingDays,
  getShelfLifeStatus,
} from "../../context/WarehouseContext";
import { BasoModal } from "./BasoModal";
import { AccountManagement } from "../admin/AccountManagement";
import { QrGeneratorModal } from "./QrGeneratorModal";
import { StockOpnameModal } from "./StockOpnameModal";
import { AuditTrailView } from "./AuditTrailView";
import { Stapel, Batch } from "@/types/warehouse";

export interface WarehouseDashboardProps {
  initialTab?: string;
  initialBasoOpen?: boolean;
  initialQrOpen?: boolean;
  initialOpnameOpen?: boolean;
}

interface ExtendedBatch extends Batch {
  stapelId: string;
  gudang: string;
  block: string;
  number: number;
}

export const WarehouseDashboard: React.FC<WarehouseDashboardProps> = ({
  initialTab = "denah",
  initialBasoOpen = false,
  initialQrOpen = false,
  initialOpnameOpen = false,
}) => {
  const {
    warehouse,
    stapels,
    transactions,
    warehouseStats,
    isOnline,
    toggleOnlineMode,
    setActiveView,
    setSelectedStapelId,
    setOperatorScreen,
    currentUser,
    logout,
    isFreezeMode,
    toggleFreezeMode,
  } = useWarehouse();

  // Active Gudang tab: 'Gudang 1' | 'Gudang 2' | 'Gudang 3' | 'Gudang 4' | 'Gudang 5' | 'ALL'
  const [selectedGudang, setSelectedGudang] = useState<string>("Gudang 1");
  const [commodityFilter, setCommodityFilter] = useState<string>("ALL");
  const [selectedStapelForModal, setSelectedStapelForModal] = useState<Stapel | null>(null);
  const [hoveredStapel, setHoveredStapel] = useState<Stapel | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(initialQrOpen || initialTab === "qr");
  const [isOpnameModalOpen, setIsOpnameModalOpen] = useState<boolean>(initialOpnameOpen || initialTab === "opname");
  const [qrDefaultStapelId, setQrDefaultStapelId] = useState<string>("G1-A2");
  const [mobileViewMode, setMobileViewMode] = useState<"denah" | "cards">("denah");
  const [stapelTooltip, setStapelTooltip] = useState<{
    visible: boolean;
    stapel: Stapel | null;
    top: number;
    left: number;
    placement: "top" | "bottom";
    arrowLeft: number;
  }>({
    visible: false,
    stapel: null,
    top: 0,
    left: 0,
    placement: "bottom", // 'top' | 'bottom'
    arrowLeft: 160,
  });
  const [isBasoOpen, setIsBasoOpen] = useState<boolean>(initialBasoOpen || initialTab === "baso");
  const [sidebarMenu, setSidebarMenu] = useState<string>(
    initialTab === "accounts"
      ? "accounts"
      : initialTab === "mutasi"
      ? "mutasi"
      : initialTab === "audit"
      ? "audit"
      : "denah"
  );

  // Handler posisi tooltip/popover interaktif menempel pada kotak grid tumpukan (bukan kursor)
  const handleStapelMouseEnter = (e: React.MouseEvent<HTMLDivElement>, stapel: Stapel) => {
    // Matikan popover hover mengambang pada HP / layar sentuh agar tidak menutupi tampilan
    if (typeof window !== "undefined") {
      if (window.innerWidth < 1024 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)) {
        return;
      }
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipWidth = 340;
    const tooltipHeight = 285;
    const margin = 16;
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Tentukan vertikal: jika ruang di bawah tidak cukup (misal Blok C paling bawah), muncul di atas
    let top;
    let placement: "top" | "bottom" = "bottom";

    if (rect.bottom + tooltipHeight + margin > winH && rect.top > tooltipHeight + margin) {
      top = rect.top - tooltipHeight - 10;
      placement = "top";
    } else {
      top = rect.bottom + 10;
      placement = "bottom";
    }

    // Tentukan horizontal: sejajarkan dengan kotak tumpukan
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Jika melebar melebihi batas kanan layar (misal kotak No. 1 di paling kanan)
    if (left + tooltipWidth > winW - margin) {
      left = rect.right - tooltipWidth;
    }
    // Jika melebar melebihi batas kiri layar (misal kotak No. 4 di paling kiri)
    if (left < margin) {
      left = rect.left;
    }

    // Absolute screen clamp
    if (left < margin) left = margin;
    if (left + tooltipWidth > winW - margin) left = winW - tooltipWidth - margin;
    if (top < margin) top = margin;
    if (top + tooltipHeight > winH - margin) top = winH - tooltipHeight - margin;

    // Hitung posisi panah segitiga relatif terhadap lebar tooltip agar tepat menunjuk ke tengah kotak tumpukan
    const boxCenterX = rect.left + rect.width / 2;
    const arrowLeft = Math.max(20, Math.min(tooltipWidth - 20, boxCenterX - left));

    setStapelTooltip({
      visible: true,
      stapel,
      top,
      left,
      placement,
      arrowLeft,
    });
    setHoveredStapel(stapel);
  };

  const handleStapelMouseLeave = () => {
    setStapelTooltip((prev) => ({ ...prev, visible: false, stapel: null }));
    setHoveredStapel(null);
  };

  // Batches for aging table
  const allBatches = React.useMemo(() => {
    const list: ExtendedBatch[] = [];
    stapels.forEach((stapel: Stapel) => {
      (stapel.batches || []).forEach((b: Batch) => {
        list.push({
          ...b,
          stapelId: stapel.id,
          gudang: stapel.gudang,
          block: stapel.block,
          number: stapel.number,
        });
      });
    });
    return list.sort((a, b) => new Date(a.dateIn).getTime() - new Date(b.dateIn).getTime());
  }, [stapels]);

  // Filtered batches
  const filteredBatches = allBatches.filter((b) => {
    const matchGudang = selectedGudang === "ALL" || b.gudang === selectedGudang;
    const matchComm =
      commodityFilter === "ALL" ||
      b.commodityId?.includes(commodityFilter) ||
      b.commodityName?.toLowerCase().includes(commodityFilter.toLowerCase());
    return matchGudang && matchComm;
  });

  const handleOpenStapelDetail = (stapelId: string) => {
    const s = stapels.find((item: Stapel) => item.id === stapelId);
    if (s) setSelectedStapelForModal(s);
  };

  const handleSwitchToOperatorWithStapel = (stapelId: string, action = "detail") => {
    setSelectedStapelId(stapelId);
    setActiveView("operator");
    if (action === "inbound") setOperatorScreen("inbound");
    else if (action === "outbound") setOperatorScreen("outbound");
    else setOperatorScreen("stapel-detail");
  };

  // Helper render stapel card di dalam denah 2D dengan INFORMASI SINGKAT + HOVER POPOVER KOMODITAS
  const renderStapelBox = (stapel: Stapel) => {
    if (!stapel) return null;
    const batches = Array.isArray(stapel.batches) ? stapel.batches : [];
    const totalKoli = batches.reduce((sum: number, b: Batch) => sum + (b?.koli || 0), 0);
    const capacity = stapel.capacityKoli || 1000;
    const percent = Math.min(100, Math.round((totalKoli / capacity) * 100));
    const firstBatch = batches[0];

    const totalTonase = batches.reduce((sum: number, b: Batch) => {
      return sum + ((b?.koli || 0) * (b?.weightPerUnitKg || 50)) / 1000;
    }, 0);

    // Cek apakah ada batch yang mendekati/melewati batas masa simpan
    const hasFifoAlert = batches.some(
      (b: Batch) => calculateAgingDays(b?.dateIn) >= 150
    );

    // Warna blok sesuai denah blueprint user:
    // A = Merah Muda / Pink (#FFD1D8 / #FDA4AF)
    // B = Kuning (#FEF08A / #FDE047)
    // C = Hijau (#BBF7D0 / #86EFAC)
    const blockTheme =
      stapel.block === "A"
        ? {
            bg: "bg-[#FFE4E6]",
            border: "border-[#FDA4AF]",
            text: "text-[#9F1239]",
            labelBg: "bg-[#FDA4AF]",
            accent: "rose",
          }
        : stapel.block === "B"
        ? {
            bg: "bg-[#FEF9C3]",
            border: "border-[#FDE047]",
            text: "text-[#854D0E]",
            labelBg: "bg-[#FDE047]",
            accent: "amber",
          }
        : {
            bg: "bg-[#DCFCE7]",
            border: "border-[#86EFAC]",
            text: "text-[#166534]",
            labelBg: "bg-[#86EFAC]",
            accent: "emerald",
          };

    // Tooltip position: Baris A (paling atas) muncul di bawah, Baris B & C muncul di atas
    const tooltipPositionClass =
      stapel.block === "A"
        ? "top-[calc(100%+8px)] left-1/2 -translate-x-1/2"
        : "bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2";

    return (
      <div
        key={stapel.id}
        onMouseEnter={(e) => handleStapelMouseEnter(e, stapel)}
        onMouseLeave={handleStapelMouseLeave}
        onClick={() => handleOpenStapelDetail(stapel.id)}
        className={`relative hover:z-30 p-2.5 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.03] flex flex-col justify-between ${blockTheme.bg} ${blockTheme.border} min-h-[105px]`}
      >
        {/* Header Kotak: Kode Stapel & Status Dot */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono text-xs font-black px-2 py-0.5 rounded shadow-xs ${blockTheme.labelBg} ${blockTheme.text}`}
            >
              {stapel.block}
              {stapel.number}
            </span>
            {hasFifoAlert && (
              <span
                title="Peringatan Masa Simpan: Terdapat batch lama yang perlu disalurkan!"
                className="material-symbols-outlined text-[14px] text-orange-600 animate-pulse"
              >
                warning
              </span>
            )}
          </div>
          <span
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              stapel.status === "kosong"
                ? "bg-emerald-500 ring-2 ring-emerald-200"
                : stapel.status === "penuh"
                ? "bg-red-500 ring-2 ring-red-200"
                : stapel.status === "nonaktif"
                ? "bg-slate-400"
                : "bg-amber-500 ring-2 ring-amber-200"
            }`}
          ></span>
        </div>

        {/* Informasi Singkat di Dalam Kotak */}
        <div className="my-1.5 space-y-0.5">
          <p className="text-[11px] font-bold text-slate-800 truncate" title={firstBatch?.commodityName || "Kosong"}>
            {firstBatch ? firstBatch.commodityName : "Kosong"}
          </p>
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-600">
            <span>
              {totalKoli.toLocaleString("id-ID")}{" "}
              <span className="text-slate-400">/ {capacity}</span>
            </span>
            <span className="font-bold text-[#1E3D73]">{percent}%</span>
          </div>
          <p className="text-[9px] font-mono text-slate-500">
            Tonase: <strong>{totalTonase.toFixed(1)} Ton</strong>
          </p>
        </div>

        {/* Progress Bar Keterisian */}
        <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percent > 80
                ? "bg-red-600"
                : percent > 40
                ? "bg-amber-600"
                : percent > 0
                ? "bg-emerald-600"
                : "bg-transparent"
            }`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-full bg-[#F4F6FB] text-slate-800 flex overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* 1. SIDEBAR NAVBAR - RESPONSIVE DRAWER ON MOBILE, FIXED ON DESKTOP */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0A1630] text-white flex flex-col flex-shrink-0 shadow-2xl border-r border-white/10 h-full overflow-hidden select-none transition-transform duration-200 lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0A516] text-[#0F2040] flex items-center justify-center font-bold font-mono shadow-sm">
              B
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                SIGAP BULOG
              </span>
              <span className="text-[10px] text-blue-300 font-mono">
                {warehouse.singkatan} • Bandung
              </span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Navigation Menu (Non-scrollable, locked) */}
        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Operasional
          </div>

          <button
            onClick={() => {
              setSidebarMenu("denah");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              sidebarMenu === "denah"
                ? "bg-[#1E3D73] text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">grid_4x4</span>
            <span>Denah 2D Gudang (4x3)</span>
          </button>

          <button
            onClick={() => {
              setSidebarMenu("aging");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              sidebarMenu === "aging"
                ? "bg-[#1E3D73] text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">timer</span>
              <span>Masa Simpan Komoditas</span>
            </div>
            {warehouseStats.fifoWarnings > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#F0A516] text-[#0F2040] text-[10px] font-bold">
                {warehouseStats.fifoWarnings}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setSidebarMenu("mutasi");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              sidebarMenu === "mutasi"
                ? "bg-[#1E3D73] text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span>Riwayat Mutasi</span>
          </button>

          <button
            onClick={() => {
              setSidebarMenu("audit");
              setIsMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              sidebarMenu === "audit"
                ? "bg-[#1E3D73] text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">security</span>
            <span>Jejak Audit (Audit Trail)</span>
          </button>

          <div className="pt-3 pb-1 border-t border-white/10 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Stock Opname & QR Label
          </div>

          <button
            onClick={() => {
              setIsOpnameModalOpen(true);
              setIsMobileSidebarOpen(false);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-white/10 transition-all border border-emerald-500/30 shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-emerald-400">
                fact_check
              </span>
              <span>Sesi Stock Opname</span>
            </div>
            {isFreezeMode && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold animate-pulse font-mono">
                FREEZE
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setIsQrModalOpen(true);
              setIsMobileSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-blue-200 hover:bg-white/10 transition-all border border-blue-400/30 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] text-[#F0A516]">
              qr_code_2
            </span>
            <span>Generator QR & Label</span>
          </button>

          <button
            onClick={() => {
              setIsBasoOpen(true);
              setIsMobileSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#FFE08A] hover:bg-white/10 transition-all border border-[#F0A516]/30 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] text-[#F0A516]">
              description
            </span>
            <span>Cetak Dokumen BASO</span>
          </button>

          {/* KHUSUS SUPERADMIN: ATUR AKUN PENGGUNA */}
          {currentUser?.role === "superadmin" && (
            <>
              <div className="pt-3 pb-1 border-t border-white/10 px-3 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                Administrasi Pusat
              </div>

              <button
                onClick={() => {
                  setSidebarMenu("accounts");
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  sidebarMenu === "accounts"
                    ? "bg-purple-700 text-white shadow-sm"
                    : "text-purple-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-purple-400">
                    manage_accounts
                  </span>
                  <span>Atur Akun</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-500/40 text-purple-200 text-[9px] font-bold font-mono">
                  Superadmin
                </span>
              </button>
            </>
          )}
        </nav>

        {/* Switch to Operator HP View */}
        <div className="p-3 border-t border-white/10 space-y-2 flex-shrink-0 bg-[#071120]">
          <button
            onClick={() => {
              setActiveView("operator");
              setOperatorScreen("home");
            }}
            className="w-full py-2.5 px-3 bg-[#F0A516] hover:bg-[#D4900F] text-[#0F2040] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">smartphone</span>
            Buka Alur HP Lapangan
          </button>

          {/* User profile & Logout */}
          <div className="p-2.5 rounded-xl bg-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  currentUser?.role === "superadmin"
                    ? "bg-purple-600 text-white"
                    : currentUser?.role === "kepala_gudang"
                    ? "bg-[#1E3D73] text-white"
                    : "bg-[#F0A516] text-[#0A1630]"
                }`}
              >
                {(currentUser?.name || "Bulog").substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-white truncate block">
                  {currentUser?.name || warehouse.kepalaGudang}
                </span>
                <span className="text-[10px] text-slate-400 block truncate capitalize">
                  {currentUser?.role === "superadmin"
                    ? "Superadmin Pusat"
                    : currentUser?.role === "kepala_gudang"
                    ? "Kepala Gudang CISKID"
                    : "Operator Gudang"}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Keluar (Logout)"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN BODY DI SEBELAH KANAN - INI YANG SCROLLABLE */}
      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar (Fixed / Sticky di atas body) */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-20 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger button on mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-xl flex items-center justify-center cursor-pointer"
              title="Buka Menu"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#0A1630] truncate">
                  {sidebarMenu === "accounts"
                    ? "Pengaturan Akun Pengguna"
                    : warehouse.name}
                </h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-[#1E3D73] font-bold flex-shrink-0">
                  {sidebarMenu === "accounts" ? "SUPERADMIN" : warehouse.code}
                </span>
              </div>
              <div className="text-xs text-slate-500 truncate hidden sm:flex items-center gap-1.5 mt-0.5">
                {sidebarMenu === "accounts" ? (
                  <span>Hierarki Peran: Superadmin, Kepala Gudang, Operator Gudang</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-red-500 flex-shrink-0">
                      location_on
                    </span>
                    <span className="truncate" title={warehouse.address}>
                      {warehouse.address} ({warehouse.kancab})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Online Status Toggle */}
            <button
              onClick={toggleOnlineMode}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isOnline
                  ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                  : "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? "bg-[#16A34A] animate-pulse" : "bg-[#F59E0B]"
                }`}
              ></span>
              <span className="hidden sm:inline">{isOnline ? "Server Bulog Online" : "Mode Offline"}</span>
              <span className="sm:hidden">{isOnline ? "Online" : "Offline"}</span>
            </button>

            {/* Opname Fisik Quick Action */}
            <button
              onClick={() => setIsOpnameModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-300">
                fact_check
              </span>
              <span>Stock Opname</span>
            </button>

            {/* QR Generator Quick Action */}
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-300"
            >
              <span className="material-symbols-outlined text-[16px] text-[#F0A516]">
                qr_code_2
              </span>
              <span>Label QR</span>
            </button>

            {/* BASO Button */}
            <button
              onClick={() => setIsBasoOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3D73] hover:bg-[#142A51] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-[#F0A516]">
                description
              </span>
              Ekspor BASO
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* JIKA MEMILIH MENU 'accounts' (KHUSUS SUPERADMIN) */}
          {sidebarMenu === "accounts" ? (
            <AccountManagement />
          ) : sidebarMenu === "audit" ? (
            <AuditTrailView />
          ) : (
            <>
              {/* Alert Banner jika Freeze Mode aktif */}
              {isFreezeMode && (
                <div className="bg-red-600 text-white p-3.5 sm:p-4 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl sm:text-3xl flex-shrink-0">
                      lock
                    </span>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold">
                        SESI STOCK OPNAME AKTIF — MUTASI BARANG DIBEKUKAN
                      </h3>
                      <p className="text-[10px] sm:text-xs text-red-100">
                        Seluruh mutasi masuk dan keluar dinonaktifkan sementara untuk menjamin akurasi data penghitungan fisik lapangan.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpnameModalOpen(true)}
                    className="px-3.5 py-1.5 bg-white text-red-700 hover:bg-red-50 rounded-xl text-xs font-bold shadow-sm whitespace-nowrap cursor-pointer"
                  >
                    Buka Kalkulator Opname
                  </button>
                </div>
              )}

              {/* Mobile Quick Banner to Switch to Operator Flow */}
              <div className="lg:hidden bg-gradient-to-r from-[#1E3D73] to-[#0A1630] text-white p-3.5 rounded-2xl shadow-sm flex items-center justify-between gap-3 border border-blue-900/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#F0A516] text-[#0A1630] flex items-center justify-center flex-shrink-0 font-bold shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">smartphone</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Mode HP Operator Lapangan</p>
                    <p className="text-[10px] text-blue-200 truncate">
                      Pindai QR kamera & catat mutasi di HP
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveView("operator");
                    setOperatorScreen("home");
                  }}
                  className="px-3 py-1.5 bg-[#F0A516] hover:bg-[#D4900F] text-[#0A1630] rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-transform active:scale-95 shadow-sm cursor-pointer"
                >
                  Buka Alur HP
                </button>
              </div>

              {/* Executive KPI Stat Cards (2x2 Grid on Mobile, 4 Cols on Desktop) */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      Total Tonase
                    </span>
                    <span className="material-symbols-outlined text-blue-600 text-base sm:text-lg flex-shrink-0">
                      scale
                    </span>
                  </div>
                  <p className="text-base sm:text-2xl font-bold font-mono text-[#0A1630] truncate">
                    {(warehouseStats.totalTonase ?? warehouseStats.totalOccupiedTonase ?? 0).toLocaleString("id-ID")}{" "}
                    <span className="text-[10px] sm:text-xs font-normal text-slate-500">Ton</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
                    Kapasitas: 3.000 Ton
                  </p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      Total Koli
                    </span>
                    <span className="material-symbols-outlined text-emerald-600 text-base sm:text-lg flex-shrink-0">
                      inventory_2
                    </span>
                  </div>
                  <p className="text-base sm:text-2xl font-bold font-mono text-[#0A1630] truncate">
                    {(warehouseStats.totalKoli ?? warehouseStats.totalOccupiedKoli ?? 0).toLocaleString("id-ID")}{" "}
                    <span className="text-[10px] sm:text-xs font-normal text-slate-500">Koli</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-700 mt-0.5 font-semibold truncate">
                    60 Stapel Aktif
                  </p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      Stapel Terisi
                    </span>
                    <span className="material-symbols-outlined text-amber-600 text-base sm:text-lg flex-shrink-0">
                      grid_view
                    </span>
                  </div>
                  <p className="text-base sm:text-2xl font-bold font-mono text-[#0A1630] truncate">
                    {stapels.filter((s) => s.batches.length > 0).length}{" "}
                    <span className="text-[10px] sm:text-xs font-normal text-slate-500">/ 60</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
                    12 Stapel / Gedung
                  </p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                      Peringatan Simpan
                    </span>
                    <span className="material-symbols-outlined text-orange-500 text-base sm:text-lg flex-shrink-0">
                      warning
                    </span>
                  </div>
                  <p className="text-base sm:text-2xl font-bold font-mono text-orange-600 truncate">
                    {warehouseStats.fifoWarnings}{" "}
                    <span className="text-[10px] sm:text-xs font-normal text-slate-500">Batch</span>
                  </p>
                  <p className="text-[10px] sm:text-xs text-red-600 font-bold mt-0.5 truncate">
                    Prioritas Salur
                  </p>
                </div>
              </section>

          {/* DENAH 2D GUDANG (LAYOUT 4x3 PERSIS SEPERTI DENAH CISKID) */}
          <section className="bg-white rounded-2xl p-3.5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-[#0A1630] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1E3D73] text-[20px] sm:text-[22px]">
                      map
                    </span>
                    <span className="truncate">Denah Tata Letak 2D — CISKID</span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Denah tumpukan komoditas 60 titik stapel
                  </p>
                </div>

                {/* Mobile View Switcher (Denah Matriks vs Kartu Responsif) */}
                {selectedGudang !== "ALL" && (
                  <div className="sm:hidden flex items-center justify-between bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 pl-1">Mode HP:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setMobileViewMode("denah")}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                          mobileViewMode === "denah"
                            ? "bg-[#1E3D73] text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">grid_view</span>
                        Matriks 4x3
                      </button>
                      <button
                        onClick={() => setMobileViewMode("cards")}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                          mobileViewMode === "cards"
                            ? "bg-[#1E3D73] text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">view_agenda</span>
                        Daftar Kartu
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selector Pilihan Gudang (1 sampai 5 + Site Plan) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap mr-1 hidden sm:inline">Pilih:</span>
                {(warehouse.units || []).map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => setSelectedGudang(unit.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                      selectedGudang === unit.name
                        ? "bg-[#1E3D73] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {unit.name}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedGudang("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                    selectedGudang === "ALL"
                      ? "bg-[#F0A516] text-[#0F2040] shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Site Plan (5 Gudang)
                </button>
              </div>
            </div>

            {/* Blueprint Legend Keterangan Warna Sesuai Denah Bulog */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs">
                <span className="font-bold text-slate-700">Keterangan:</span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded bg-[#FDA4AF] border border-[#F43F5E]/40 inline-block"></span>
                  <span className="font-medium">A (Merah Muda)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded bg-[#FDE047] border border-[#EAB308]/40 inline-block"></span>
                  <span className="font-medium">B (Kuning)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 rounded bg-[#86EFAC] border border-[#22C55E]/40 inline-block"></span>
                  <span className="font-medium">C (Hijau)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-4 h-2 bg-black rounded-xs inline-block"></span>
                  <span className="font-medium">Pintu Dermaga</span>
                </span>
              </div>

              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-blue-600">
                  touch_app
                </span>
                <span>Klik kotak tumpukan untuk info komoditas & mutasi</span>
              </div>
            </div>

            {/* TAMPILAN 1: TAMPILAN GUDANG TUNGGAL (DETIL 4x3) */}
            {selectedGudang !== "ALL" && (
              <div className="p-3 sm:p-5 bg-slate-100 rounded-2xl border border-slate-300 flex flex-col items-center">
                <div className="mb-3 text-center">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {selectedGudang} — Tata Letak Matriks 4x3
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Klik kotak tumpukan untuk melihat isi detail batch dan mutasi
                  </p>
                </div>

                {/* Mobile View Option 2: Clean 2-Column Cards List on Mobile */}
                {mobileViewMode === "cards" && (
                  <div className="sm:hidden w-full space-y-3">
                    {["A", "B", "C"].map((blockLetter) => {
                      const blockStapels = stapels.filter((s) => {
                        const g = s.gudang || "Gudang 1";
                        const b = s.block || s.row || "A";
                        return g === selectedGudang && b === blockLetter;
                      });

                      const sorted = [4, 3, 2, 1].map((num) => {
                        const existing = blockStapels.find(
                          (s) => Number(s.number ?? s.col) === num
                        );
                        if (existing) return existing;
                        const gCode = selectedGudang.replace("Gudang ", "G");
                        return {
                          id: `${gCode}-${blockLetter}${num}`,
                          gudang: selectedGudang,
                          block: blockLetter,
                          number: num,
                          name: `Stapel ${blockLetter}${num}`,
                          capacityKoli: 1000,
                          status: "kosong" as const,
                          batches: [],
                        };
                      });

                      return (
                        <div key={blockLetter} className="space-y-1.5">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-700">
                              Blok {blockLetter} (
                              {blockLetter === "A"
                                ? "Beras SPHP"
                                : blockLetter === "B"
                                ? "Beras Premium & Gula"
                                : "Minyakita & Terigu"}
                              )
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kapasitas 4.000 Koli
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {sorted.map((stapel) => renderStapelBox(stapel))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mobile View Option 1: Horizontal Scrollable 4x3 Blueprint Frame */}
                {(mobileViewMode === "denah" || typeof window === "undefined") && (
                  <div className="w-full">
                    {/* Mobile Swipe Hint */}
                    <div className="sm:hidden w-full flex items-center justify-between px-1 mb-2 text-slate-500 text-[11px]">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[15px] text-[#1E3D73]">
                          swipe
                        </span>
                        Geser denah ke samping untuk 4 kolom penuh
                      </span>
                      <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full font-mono">
                        Matriks 4x3
                      </span>
                    </div>

                    <div className="w-full overflow-x-auto pb-3 pt-1 no-scrollbar">
                      {/* Building Structure with Doors on Left & Right */}
                      <div className="relative bg-white p-4 sm:p-6 rounded-2xl border-4 border-slate-800 shadow-lg min-w-[580px] max-w-2xl mx-auto">
                  {/* DOORS / PINTU (Left & Right Walls) */}
                  <div
                    className="absolute -left-3 top-1/4 w-3 h-16 bg-black rounded-l"
                    title="Pintu Barat (Loading Dock Truk)"
                  ></div>
                  <div
                    className="absolute -left-3 bottom-1/4 w-3 h-16 bg-black rounded-l"
                    title="Pintu Barat 2"
                  ></div>
                  <div
                    className="absolute -right-3 top-1/4 w-3 h-16 bg-black rounded-r"
                    title="Pintu Timur (Loading Dock Truk)"
                  ></div>
                  <div
                    className="absolute -right-3 bottom-1/4 w-3 h-16 bg-black rounded-r"
                    title="Pintu Timur 2"
                  ></div>

                  {/* 4x3 Grid Layout:
                      Baris A: A4, A3, A2, A1
                      Baris B: B4, B3, B2, B1
                      Baris C: C4, C3, C2, C1
                  */}
                  <div className="space-y-4">
                    {["A", "B", "C"].map((blockLetter) => {
                      const blockStapels = stapels.filter((s) => {
                        const g = s.gudang || "Gudang 1";
                        const b = s.block || s.row || "A";
                        return g === selectedGudang && b === blockLetter;
                      });

                      // Pastikan selalu ada 4 kotak per blok (4, 3, 2, 1) apapun kondisi data di browser
                      const sorted = [4, 3, 2, 1].map((num) => {
                        const existing = blockStapels.find(
                          (s) => Number(s.number ?? s.col) === num
                        );
                        if (existing) return existing;
                        const gCode = selectedGudang.replace("Gudang ", "G");
                        return {
                          id: `${gCode}-${blockLetter}${num}`,
                          gudang: selectedGudang,
                          block: blockLetter,
                          number: num,
                          name: `Stapel ${blockLetter}${num}`,
                          capacityKoli: 1000,
                          status: "kosong" as const,
                          batches: [],
                        };
                      });

                      return (
                        <div
                          key={blockLetter}
                          className={`space-y-1 relative ${
                            blockLetter === "A"
                              ? "z-30 hover:z-50"
                              : blockLetter === "B"
                              ? "z-20 hover:z-50"
                              : "z-10 hover:z-50"
                          }`}
                        >
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-600">
                              Blok {blockLetter}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Kapasitas 4.000 Koli
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-3">
                            {sorted.map((stapel) => renderStapelBox(stapel))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Floor Label */}
                  <div className="mt-4 pt-3 border-t border-dashed border-slate-300 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Aisle Barat (Pintu 1)</span>
                    <span className="font-bold text-slate-600 uppercase">
                      Lorong Tengah Transportasi Hand Pallet
                    </span>
                    <span>Aisle Timur (Pintu 2)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC LIVE HOVER INSPECTION STRIP BELOW MAP */}
          <div className="w-full max-w-2xl mt-4 p-3 bg-white rounded-xl border border-slate-300 shadow-sm flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[#1E3D73] text-[20px] flex-shrink-0">
                      info
                    </span>
                    <div className="min-w-0">
                      {hoveredStapel ? (
                        <p className="text-slate-800 truncate">
                          Sorotan: <strong className="text-[#1E3D73] font-mono">{hoveredStapel.id}</strong> —{" "}
                          {hoveredStapel.batches.length > 0
                            ? hoveredStapel.batches.map((b) => `${b.commodityName} (${b.koli} ${b.unit})`).join(", ")
                            : "Tumpukan Kosong"}
                        </p>
                      ) : (
                        <p className="text-slate-500">
                          Arahkan kursor mouse ke kotak stapel mana saja di atas untuk melihat isi komoditasnya.
                        </p>
                      )}
                    </div>
                  </div>

                  {hoveredStapel && (
                    <span className="font-mono font-bold text-[11px] bg-blue-50 text-[#1E3D73] px-2 py-0.5 rounded whitespace-nowrap">
                      {hoveredStapel.batches.reduce((sum, b) => sum + b.koli, 0)} Koli
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* TAMPILAN 2: SITE PLAN KESELURUHAN (5 GUDANG CISKID) */}
            {selectedGudang === "ALL" && (
              <div className="p-6 bg-slate-100 rounded-2xl border border-slate-300">
                <div className="text-center mb-6">
                  <h3 className="text-base font-bold text-slate-800">
                    Site Plan Kompleks Pergudangan CISKID (5 Gedung)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Denah posisi Gudang 1 sampai Gudang 5 sesuai arsitektur tata letak lapangan
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  {/* Kolom Kiri: Gudang 1 & Gudang 2 */}
                  <div className="space-y-6">
                    {["Gudang 1", "Gudang 2"].map((gName) => (
                      <div
                        key={gName}
                        onClick={() => setSelectedGudang(gName)}
                        className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-sm cursor-pointer hover:border-blue-600 transition-all relative"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-900">{gName}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                            Vertical (4x3)
                          </span>
                        </div>
                        {/* Mini 3 rows */}
                        <div className="space-y-1.5">
                          {["A", "B", "C"].map((blk) => (
                            <div key={blk} className="grid grid-cols-4 gap-1">
                              {[4, 3, 2, 1].map((n) => (
                                <div
                                  key={n}
                                  className={`h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                                    blk === "A"
                                      ? "bg-[#FDA4AF] text-rose-950"
                                      : blk === "B"
                                      ? "bg-[#FDE047] text-amber-950"
                                      : "bg-[#86EFAC] text-emerald-950"
                                  }`}
                                >
                                  {n}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Kolom Tengah: Gudang 3 & Gudang 5 */}
                  <div className="space-y-6">
                    {["Gudang 3", "Gudang 5"].map((gName) => (
                      <div
                        key={gName}
                        onClick={() => setSelectedGudang(gName)}
                        className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-sm cursor-pointer hover:border-blue-600 transition-all relative"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-900">{gName}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                            Horizontal (3x4)
                          </span>
                        </div>
                        {/* Mini 4 rows */}
                        <div className="space-y-1">
                          {[1, 2, 3, 4].map((r) => (
                            <div key={r} className="grid grid-cols-3 gap-1">
                              <div className="h-5 bg-[#FDA4AF] rounded text-[9px] font-bold flex items-center justify-center">
                                A{r}
                              </div>
                              <div className="h-5 bg-[#FDE047] rounded text-[9px] font-bold flex items-center justify-center">
                                B{r}
                              </div>
                              <div className="h-5 bg-[#86EFAC] rounded text-[9px] font-bold flex items-center justify-center">
                                C{r}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Kolom Kanan: Gudang 4 & Keterangan */}
                  <div className="space-y-6">
                    {["Gudang 4"].map((gName) => (
                      <div
                        key={gName}
                        onClick={() => setSelectedGudang(gName)}
                        className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-sm cursor-pointer hover:border-blue-600 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-slate-900">{gName}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                            Horizontal (3x4)
                          </span>
                        </div>
                        <div className="space-y-1">
                          {[1, 2, 3, 4].map((r) => (
                            <div key={r} className="grid grid-cols-3 gap-1">
                              <div className="h-5 bg-[#FDA4AF] rounded text-[9px] font-bold flex items-center justify-center">
                                A{r}
                              </div>
                              <div className="h-5 bg-[#FDE047] rounded text-[9px] font-bold flex items-center justify-center">
                                B{r}
                              </div>
                              <div className="h-5 bg-[#86EFAC] rounded text-[9px] font-bold flex items-center justify-center">
                                C{r}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Legend Box Card */}
                    <div className="bg-slate-200/80 p-4 rounded-xl border border-slate-300 space-y-2 text-xs">
                      <h4 className="font-bold text-slate-800">Keterangan Denah CISKID:</h4>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-2 bg-black inline-block"></span>
                        <span>Pintu Gerbang Hanggar</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-[#FDA4AF] rounded inline-block"></span>
                        <span>Blok A (Beras Medium SPHP)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-[#FDE047] rounded inline-block"></span>
                        <span>Blok B (Beras Premium & Gula)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-[#86EFAC] rounded inline-block"></span>
                        <span>Blok C (Minyakita & Terigu)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* TABEL PEMANTAUAN MASA SIMPAN KOMODITAS */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-[#0A1630] flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-[20px]">
                    timer
                  </span>
                  Pemantauan Masa Simpan Komoditas
                </h3>
                <p className="text-xs text-slate-500">
                  Semua batch diurutkan dari yang terlama disimpan di gudang
                </p>
              </div>

              {/* Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto text-xs">
                {["ALL", "Beras", "Minyak", "Gula", "Tepung"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setCommodityFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      commodityFilter === f
                        ? "bg-[#1E3D73] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f === "ALL" ? "Semua Komoditas" : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="min-w-[640px] w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-3">Gudang & Stapel</th>
                    <th className="py-2.5 px-3">Komoditas & Batch</th>
                    <th className="py-2.5 px-3">Tgl Masuk</th>
                    <th className="py-2.5 px-3">Masa Simpan</th>
                    <th className="py-2.5 px-3">Status Umur Simpan</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBatches.map((batch) => {
                    const agingDays = calculateAgingDays(batch.dateIn);
                    const shelfLife = getShelfLifeStatus(agingDays);

                    return (
                      <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-bold text-[#1E3D73] font-mono text-sm block">
                            {batch.stapelId}
                          </span>
                          <span className="text-[10px] text-slate-500">{batch.gudang}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">
                            {batch.commodityName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {batch.batchNo} • {batch.koli} {batch.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">{String(batch.dateIn)}</td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <span className="font-mono font-bold text-slate-800">
                              {agingDays} Hari
                            </span>
                            <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${shelfLife.barColor}`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round((agingDays / 180) * 100)
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${shelfLife.badgeColor}`}
                          >
                            {shelfLife.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() =>
                              handleSwitchToOperatorWithStapel(batch.stapelId, "outbound")
                            }
                            className="px-2.5 py-1 bg-[#EEF2F9] hover:bg-[#D0DAF0] text-[#1E3D73] rounded-lg text-xs font-bold transition-colors"
                          >
                            Alokasi DO
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* FEED LIVE MUTASI */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-[#0A1630] flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">
                  history
                </span>
                Log Mutasi Realtime Gudang
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {transactions.slice(0, 6).map((trx) => (
                <div
                  key={trx.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                          trx.type === "MASUK"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {trx.type}
                      </span>
                      <span className="font-mono font-bold text-slate-800">{trx.stapelId}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {String(trx.timestamp || "").slice(11, 16)}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-900 truncate">
                    {trx.commodityName}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">{trx.sourceOrDest}</span>
                    <span
                      className={`font-mono font-bold whitespace-nowrap ml-2 ${
                        trx.type === "MASUK" ? "text-emerald-700" : "text-blue-700"
                      }`}
                    >
                      {trx.type === "MASUK" ? "+" : "-"}
                      {trx.koli} {trx.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  </div>

      {/* Stapel Quick Inspector Modal */}
      {selectedStapelForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Inspeksi Tumpukan
                </span>
                <h3 className="text-xl font-bold font-mono text-[#0A1630]">
                  {selectedStapelForModal.id} ({selectedStapelForModal.name})
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStapelForModal.gudang} • Blok {selectedStapelForModal.block}, No.{" "}
                  {selectedStapelForModal.number}
                </p>
              </div>
              <button
                onClick={() => setSelectedStapelForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Kapasitas Maksimal:</span>
                <span className="font-mono font-bold">
                  {selectedStapelForModal.capacityKoli} koli
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Koli Saat Ini:</span>
                <span className="font-mono font-bold text-[#1E3D73]">
                  {selectedStapelForModal.batches.reduce((sum, b) => sum + b.koli, 0)} koli
                </span>
              </div>
            </div>

            {/* Batches in this Stapel */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedStapelForModal.batches.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Stapel ini kosong.</p>
              ) : (
                selectedStapelForModal.batches.map((b) => (
                  <div key={b.id} className="p-2.5 bg-[#EEF2F9] rounded-xl text-xs space-y-1">
                    <div className="flex justify-between font-bold text-[#0A1630]">
                      <span>{b.commodityName}</span>
                      <span className="font-mono">
                        {b.koli} {b.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>
                        {b.batchNo} ({b.brand})
                      </span>
                      <span>{calculateAgingDays(b.dateIn)} hari simpan</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() =>
                  handleSwitchToOperatorWithStapel(selectedStapelForModal.id, "inbound")
                }
                className="py-2.5 bg-[#1E3D73] text-white rounded-xl text-xs font-bold shadow-sm"
              >
                + Masuk (Inbound)
              </button>
              <button
                onClick={() =>
                  handleSwitchToOperatorWithStapel(selectedStapelForModal.id, "outbound")
                }
                className="py-2.5 bg-[#F0A516] text-[#0F2040] rounded-xl text-xs font-bold shadow-sm"
              >
                - Penyaluran Stok
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setQrDefaultStapelId(selectedStapelForModal.id);
                  setIsQrModalOpen(true);
                  setSelectedStapelForModal(null);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#1E3D73] border border-slate-200 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                Cetak Label QR Tumpukan {selectedStapelForModal.id}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING INTERACTIVE TOOLTIP ANCHORED TO GRID STAPEL BOX */}
      {stapelTooltip.visible && stapelTooltip.stapel && (
        <div
          style={{
            position: "fixed",
            left: `${stapelTooltip.left}px`,
            top: `${stapelTooltip.top}px`,
            zIndex: 9999,
          }}
          className="pointer-events-none w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 transition-all duration-150 text-slate-800"
        >
          {/* Subtle Pointer Arrow pointing directly to the stapel grid box */}
          <div
            style={{ left: `${stapelTooltip.arrowLeft}px` }}
            className={`absolute w-3 h-3 bg-white border-slate-200 transform -translate-x-1/2 rotate-45 ${
              stapelTooltip.placement === "top"
                ? "-bottom-1.5 border-r border-b"
                : "-top-1.5 border-l border-t"
            }`}
          />

          {/* Header Tooltip */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg shadow-xs ${
                  stapelTooltip.stapel.block === "A"
                    ? "bg-[#FDA4AF] text-[#9F1239]"
                    : stapelTooltip.stapel.block === "B"
                    ? "bg-[#FDE047] text-[#854D0E]"
                    : "bg-[#86EFAC] text-[#166534]"
                }`}
              >
                {stapelTooltip.stapel.block}
                {stapelTooltip.stapel.number}
              </span>
              <div>
                <h4 className="text-xs font-bold text-[#0A1630] leading-tight">
                  Stapel {stapelTooltip.stapel.block}
                  {stapelTooltip.stapel.number}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono">
                  {stapelTooltip.stapel.gudang} • Kompleks CISKID
                </p>
              </div>
            </div>

            {/* Status Pill */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                stapelTooltip.stapel.status === "penuh"
                  ? "bg-red-100 text-red-700 border border-red-200"
                  : stapelTooltip.stapel.status === "kosong"
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : stapelTooltip.stapel.status === "nonaktif"
                  ? "bg-slate-100 text-slate-500"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              {stapelTooltip.stapel.status}
            </span>
          </div>

          {/* Quick Metrics Bar */}
          {(() => {
            const batches = stapelTooltip.stapel.batches || [];
            const totalKoli = batches.reduce((sum, b) => sum + (b.koli || 0), 0);
            const capacity = stapelTooltip.stapel.capacityKoli || 1000;
            const percent = Math.min(100, Math.round((totalKoli / capacity) * 100));
            const totalTonase = batches.reduce(
              (sum, b) => sum + (b.koli * (b.weightPerUnitKg || 50)) / 1000,
              0
            );

            return (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Kapasitas Terisi
                    </span>
                    <span className="font-mono font-bold text-[#1E3D73]">
                      {totalKoli.toLocaleString("id-ID")} / {capacity.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-1">({percent}%)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Estimasi Tonase
                    </span>
                    <span className="font-mono font-bold text-[#0A1630]">
                      {totalTonase.toFixed(2)} Ton
                    </span>
                  </div>
                </div>

                {/* Batch List */}
                <div className="space-y-1.5 max-h-48 overflow-hidden">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Komoditas ({batches.length} Batch)</span>
                    <span>Masa Simpan</span>
                  </div>

                  {batches.length === 0 ? (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/50 rounded-xl text-center">
                      <p className="text-xs font-semibold text-emerald-800">
                        ✨ Tumpukan Kosong
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        Siap menerima muatan inbound (Kapasitas: 1.000 Koli)
                      </p>
                    </div>
                  ) : (
                    batches.map((b) => {
                      const agingDays = calculateAgingDays(b.dateIn);
                      const shelfInfo = getShelfLifeStatus(agingDays);

                      return (
                        <div
                          key={b.id || b.batchNo}
                          className="p-2 bg-slate-50 border border-slate-200/70 rounded-xl space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className="font-bold text-xs text-[#0A1630] truncate max-w-[170px]"
                              title={b.commodityName}
                            >
                              {b.commodityName}
                            </span>
                            <span className="font-mono font-bold text-xs text-[#1E3D73]">
                              {b.koli} {b.unit || "Koli"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-mono">
                              {b.batchNo} • {b.brand || "Bulog"}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] ${shelfInfo.badgeColor}`}
                            >
                              {agingDays} hari
                            </span>
                          </div>

                          {b.origin && (
                            <p className="text-[9px] text-slate-400 truncate">
                              Asal: {b.origin} {b.suratJalan ? `• ${b.suratJalan}` : ""}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-blue-600">
                      touch_app
                    </span>
                    Klik kotak untuk aksi mutasi
                  </span>
                  <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                    Anchored to Grid
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* BASO Document Modal */}
      <BasoModal isOpen={isBasoOpen} onClose={() => setIsBasoOpen(false)} />

      {/* QR Code Generator & Label Print Modal */}
      <QrGeneratorModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        initialStapelId={qrDefaultStapelId}
      />

      {/* Physical Stock Opname & Calculator Modal */}
      <StockOpnameModal
        isOpen={isOpnameModalOpen}
        onClose={() => setIsOpnameModalOpen(false)}
        initialGudang={selectedGudang === "ALL" ? "Gudang 1" : selectedGudang}
        onOpenBaso={() => setIsBasoOpen(true)}
      />
    </div>
  );
};
