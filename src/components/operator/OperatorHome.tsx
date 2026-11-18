"use client";

import React from "react";
import { useWarehouse, calculateAgingDays } from "../../context/WarehouseContext";
import { OperatorHeader } from "./OperatorHeader";
import { OperatorBottomNav } from "./OperatorBottomNav";
import { Stapel, Batch, Transaction } from "@/types/warehouse";

export const OperatorHome: React.FC = () => {
  const {
    stapels,
    transactions,
    isOnline,
    setOperatorScreen,
    setSelectedStapelId,
  } = useWarehouse();

  // Cari batch yang paling mendekati / melewati batas FIFO
  const fifoAlertItem = React.useMemo(() => {
    let oldestBatch: Batch | null = null;
    let maxDays = 0;
    let targetStapel: Stapel | null = null;

    stapels.forEach((stapel: Stapel) => {
      stapel.batches.forEach((b: Batch) => {
        const days = calculateAgingDays(b.dateIn);
        if (days > maxDays) {
          maxDays = days;
          oldestBatch = b;
          targetStapel = stapel;
        }
      });
    });

    return { oldestBatch, maxDays, targetStapel };
  }, [stapels]);

  // Hitung transaksi shift hari ini
  const shiftStats = React.useMemo(() => {
    const todayTransactions = transactions.filter((t: Transaction) => {
      const ts = typeof t.timestamp === "string" ? t.timestamp : new Date(t.timestamp).toISOString();
      return ts.startsWith("2026-11-15") || ts.startsWith(new Date().toISOString().slice(0, 10));
    });

    const masukKoli = todayTransactions
      .filter((t: Transaction) => t.type === "MASUK")
      .reduce((sum, t) => sum + (t.koli || 0), 0);

    const keluarKoli = todayTransactions
      .filter((t: Transaction) => t.type === "KELUAR")
      .reduce((sum, t) => sum + (t.koli || 0), 0);

    return { masukKoli, keluarKoli, count: todayTransactions.length };
  }, [transactions]);

  const handleOpenFifoOutbound = (stapelId?: string) => {
    if (stapelId) setSelectedStapelId(stapelId);
    setOperatorScreen("outbound");
  };

  const handleOpenStapelDetail = (stapelId: string) => {
    setSelectedStapelId(stapelId);
    setOperatorScreen("stapel-detail");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0D1C2E] flex flex-col pb-24">
      <OperatorHeader title="SIGAP BULOG" />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-20">
        {/* Operator Profile Greeting Strip */}
        <section className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(30,61,115,0.06)] border border-[#E2E8F0] mb-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Selamat Bertugas
              </span>
              <h2 className="text-xl font-bold text-[#0A1630] truncate">
                Halo, Budi Santoso
              </h2>
              <p className="text-xs text-[#1E3D73] font-semibold">
                Operator Lapangan • Regu A
              </p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
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
              <span className="text-[11px]">
                {isOnline ? "Online Bulog Sync" : "Mode Offline Aktif"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-slate-700">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EEF2F9] rounded-lg text-[#142A51] text-xs">
              <span className="material-symbols-outlined text-[15px]">schedule</span>
              <span className="font-mono text-[11px] font-medium">
                Shift Pagi (07:00 - 15:30)
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 text-xs">
              <span className="material-symbols-outlined text-[15px]">location_on</span>
              <span className="font-mono text-[11px] font-medium">Bay Zone Alpha</span>
            </div>
          </div>
        </section>

        {/* High-Priority FIFO Operational Alert */}
        {fifoAlertItem.oldestBatch && (
          <section className="bg-[#FFFBEB] rounded-2xl p-4 shadow-sm border border-[#FDE68A] mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0A516] text-[#0F2040] flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#B45309] uppercase tracking-wider">
                    Masa Simpan Kritis (Perlu Salur)
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 bg-[#FFE08A] text-[#8C5D08] rounded font-bold">
                    {fifoAlertItem.maxDays} Hari
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed mb-2.5">
                  Stapel{" "}
                  <span className="font-mono font-bold text-[#0A1630] bg-white px-1.5 py-0.5 rounded border border-amber-200">
                    {(fifoAlertItem.targetStapel as any)?.id}
                  </span>{" "}
                  {(fifoAlertItem.oldestBatch as any).commodityName} (
                  <span className="font-mono">{(fifoAlertItem.oldestBatch as any).batchNo}</span>) mendekati batas simpan standar Bulog. Prioritaskan untuk penyaluran keluar!
                </p>
                <button
                  onClick={() => handleOpenFifoOutbound((fifoAlertItem.targetStapel as any)?.id)}
                  className="w-full py-2 bg-[#1E3D73] hover:bg-[#193462] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">outbox</span>
                  Proses Penyaluran Barang Sekarang
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Ergonomic Quick Action Cards (Glove-Friendly Touch Targets >= 56px) */}
        <section className="flex flex-col gap-3 mb-5">
          {/* Primary Action: Inbound */}
          <button
            onClick={() => setOperatorScreen("inbound")}
            className="w-full text-left bg-gradient-to-r from-[#1E3D73] to-[#142A51] text-white rounded-2xl p-4 shadow-md active:scale-[0.99] transition-transform min-h-[72px] flex items-center justify-between gap-3 border border-blue-900/30 cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-[#F0A516] text-[#0F2040] flex items-center justify-center flex-shrink-0 shadow-md">
                <span
                  className="material-symbols-outlined text-[30px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  move_to_inbox
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight">BARANG MASUK</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F0A516] text-[#0F2040]">
                    SCAN QR
                  </span>
                </div>
                <p className="text-xs text-blue-200 truncate mt-0.5">
                  Pindai QR tumpukan & catat muatan komoditas
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-white/80 text-[24px]">
              chevron_right
            </span>
          </button>

          {/* Secondary Action: Outbound */}
          <button
            onClick={() => setOperatorScreen("outbound")}
            className="w-full text-left bg-white text-slate-800 rounded-2xl p-4 shadow-[0_2px_10px_rgba(30,61,115,0.06)] active:scale-[0.99] transition-transform min-h-[72px] flex items-center justify-between gap-3 border border-[#E2E8F0] cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-[#EEF2F9] text-[#1E3D73] flex items-center justify-center flex-shrink-0 border border-[#D0DAF0]">
                <span
                  className="material-symbols-outlined text-[30px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  outbox
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-[#0A1630] tracking-tight">
                    BARANG KELUAR
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    PENYALURAN
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  Validasi prioritas masa simpan & alokasi DO
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[24px]">
              chevron_right
            </span>
          </button>

          {/* Secondary Grid (Cari Stapel & Riwayat) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setOperatorScreen("stapel-detail")}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] text-left active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E3D73] flex items-center justify-center mb-2.5">
                <span className="material-symbols-outlined text-[22px]">grid_view</span>
              </div>
              <h3 className="text-sm font-bold text-[#0A1630]">Peta & Stapel</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Cek muatan tumpukan</p>
            </button>

            <button
              onClick={() => setOperatorScreen("history")}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] text-left active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center mb-2.5">
                <span className="material-symbols-outlined text-[22px]">receipt_long</span>
              </div>
              <h3 className="text-sm font-bold text-[#0A1630]">Riwayat Mutasi</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Log transaksi shift</p>
            </button>
          </div>
        </section>

        {/* Ringkasan Shift Hari Ini */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Statistik Shift Saya
            </span>
            <span className="text-[11px] font-mono text-[#1E3D73] bg-[#EEF2F9] px-2 py-0.5 rounded font-medium">
              15 Nov 2026
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                <span className="material-symbols-outlined text-[16px]">south_east</span>
                <span>Masuk Hari Ini</span>
              </div>
              <p className="text-xl font-bold font-mono text-emerald-900">
                {shiftStats.masukKoli.toLocaleString("id-ID")}{" "}
                <span className="text-xs font-normal text-emerald-700">koli</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
              <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold mb-1">
                <span className="material-symbols-outlined text-[16px]">north_east</span>
                <span>Keluar Hari Ini</span>
              </div>
              <p className="text-xl font-bold font-mono text-blue-900">
                {shiftStats.keluarKoli.toLocaleString("id-ID")}{" "}
                <span className="text-xs font-normal text-blue-700">koli</span>
              </p>
            </div>
          </div>
        </section>

        {/* Live Feed Aktivitas Terkini */}
        <section className="space-y-2 mb-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-[#0A1630]">Aktivitas Terkini</h3>
            <button
              onClick={() => setOperatorScreen("history")}
              className="text-xs font-semibold text-[#1E3D73] hover:underline cursor-pointer"
            >
              Lihat Semua →
            </button>
          </div>

          <div className="space-y-2">
            {transactions.slice(0, 3).map((trx: Transaction) => {
              const ts = typeof trx.timestamp === "string" ? trx.timestamp : new Date(trx.timestamp).toISOString();
              return (
                <div
                  key={trx.id}
                  onClick={() => handleOpenStapelDetail(trx.stapelId)}
                  className="bg-white rounded-xl p-3.5 shadow-sm border border-[#E2E8F0] flex items-center justify-between gap-3 cursor-pointer active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        trx.type === "MASUK"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-[#1E3D73]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {trx.type === "MASUK" ? "move_to_inbox" : "outbox"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#0A1630] truncate">
                          {trx.commodityName}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            trx.type === "MASUK"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {trx.stapelId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {trx.sourceOrDest} • {trx.suratJalan}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-xs font-bold font-mono ${
                        trx.type === "MASUK" ? "text-emerald-700" : "text-blue-700"
                      }`}
                    >
                      {trx.type === "MASUK" ? "+" : "-"}
                      {trx.koli} {trx.unit}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {ts.slice(11, 16)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <OperatorBottomNav />
    </div>
  );
};
