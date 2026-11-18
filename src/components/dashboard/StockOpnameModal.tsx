"use client";

import React, { useState } from "react";
import { useWarehouse } from "../../context/WarehouseContext";
import { CustomSelect } from "../common/CustomSelect";
import { Stapel } from "../../types/warehouse";

export interface StockOpnameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBaso?: () => void;
  initialGudang?: string;
}

export interface OpnameRecordItem {
  stapelId: string;
  gudang?: string;
  layerCount?: number;
  perLayerKoli?: number;
  peakKoli?: number;
  damagedKoli?: number;
  physicalKoli: number;
  bookKoli: number;
  variance: number;
  note?: string;
  recordedAt?: string;
  operator?: string;
}

export const StockOpnameModal: React.FC<StockOpnameModalProps> = ({
  isOpen,
  onClose,
  onOpenBaso,
}) => {
  const {
    stapels,
    isFreezeMode,
    toggleFreezeMode,
    opnameRecords,
    recordStapelOpname,
    resetOpnameSession,
    currentUser,
  } = useWarehouse();

  const [selectedStapelId, setSelectedStapelId] = useState<string>("G1-A2");

  // Calculator inputs
  const [layerCount, setLayerCount] = useState<string>("10");
  const [perLayerKoli, setPerLayerKoli] = useState<string>("100");
  const [peakKoli, setPeakKoli] = useState<string>("0");
  const [damagedKoli, setDamagedKoli] = useState<string>("0");
  const [opnameNote, setOpnameNote] = useState<string>("");

  if (!isOpen) return null;

  const currentStapel: Stapel =
    stapels.find((s) => s.id === selectedStapelId) ||
    stapels[0] || {
      id: selectedStapelId,
      gudang: "Gudang 1",
      block: "A",
      number: 1,
      name: `Stapel ${selectedStapelId}`,
      capacityKoli: 1000,
      status: "kosong",
      batches: [],
    };

  const bookKoli = currentStapel
    ? (currentStapel.batches || []).reduce((sum, b) => sum + (b.koli || 0), 0)
    : 0;

  // Live calculation
  const layers = Number(layerCount) || 0;
  const perLayer = Number(perLayerKoli) || 0;
  const peak = Number(peakKoli) || 0;
  const damaged = Number(damagedKoli) || 0;
  const calculatedPhysicalKoli = Math.max(0, layers * perLayer + peak - damaged);
  const calculatedVariance = calculatedPhysicalKoli - bookKoli;

  const handleSaveOpnameRecord = (e: React.FormEvent) => {
    e.preventDefault();
    recordStapelOpname({
      stapelId: selectedStapelId,
      layerCount: layers,
      perLayerKoli: perLayer,
      peakKoli: peak,
      damagedKoli: damaged,
      note: opnameNote,
    });
  };

  // Pre-fill calculation when selecting a stapel that already has records or batches
  const handleSelectStapel = (sid: string) => {
    setSelectedStapelId(sid);
    const existing = (opnameRecords || {})[sid];
    if (existing) {
      setLayerCount(existing.layerCount?.toString() || "10");
      setPerLayerKoli(existing.perLayerKoli?.toString() || "100");
      setPeakKoli(existing.peakKoli?.toString() || "0");
      setDamagedKoli(existing.damagedKoli?.toString() || "0");
      setOpnameNote(existing.note || "");
    } else {
      const s = stapels.find((item) => item.id === sid);
      const bKoli = s ? (s.batches || []).reduce((sum, b) => sum + (b.koli || 0), 0) : 0;
      if (bKoli >= 100) {
        setLayerCount("10");
        setPerLayerKoli((bKoli / 10).toString());
        setPeakKoli("0");
        setDamagedKoli("0");
      } else {
        setLayerCount(bKoli > 0 ? "1" : "0");
        setPerLayerKoli(bKoli.toString());
        setPeakKoli("0");
        setDamagedKoli("0");
      }
      setOpnameNote("");
    }
  };

  // Summary Metrics of current opname session
  const verifiedCount = Object.keys(opnameRecords || {}).length;
  const totalStapels = stapels.length;
  const opnameList = Object.values(opnameRecords || {}) as OpnameRecordItem[];
  const matchCount = opnameList.filter((r) => r.variance === 0).length;
  const shortageCount = opnameList.filter((r) => r.variance < 0).length;
  const surplusCount = opnameList.filter((r) => r.variance > 0).length;

  const accuracyRate =
    verifiedCount > 0
      ? Math.max(0, Math.min(100, Math.round((matchCount / verifiedCount) * 100)))
      : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[94vh] flex flex-col">
        {/* Header Toolbar */}
        <div className="bg-[#0A1630] text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0A516] text-[#0A1630] flex items-center justify-center font-bold shadow-md">
              <span className="material-symbols-outlined text-[24px]">fact_check</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Modul Stock Opname Fisik & Rekonsiliasi Otomatis
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  FASE 4 TERPADU
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                Kalkulator tumpukan lapis Bulog, pembekuan mutasi, dan pencocokan fisik vs buku
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Freeze Mode Toggle */}
            <button
              onClick={toggleFreezeMode}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                isFreezeMode
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  : "bg-white/10 hover:bg-white/20 text-slate-200"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isFreezeMode ? "lock" : "lock_open"}
              </span>
              <span>{isFreezeMode ? "Mutasi Dibekukan" : "Bekukan Mutasi"}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Freeze Mode Warning Strip */}
        {isFreezeMode && (
          <div className="bg-amber-500 text-[#0A1630] px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>
                PERIODE PEMBEKUAN MUTASI AKTIF — Mutasi keluar/masuk di seluruh gudang sedang dikunci agar penghitungan fisik tidak bergeser.
              </span>
            </div>
            <span className="font-mono text-[10px] bg-[#0A1630] text-white px-2 py-0.5 rounded">
              FREEZE MODE
            </span>
          </div>
        )}

        {/* Session Progress Stats */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 flex-shrink-0 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Progres Opname
            </span>
            <p className="text-base sm:text-lg font-bold font-mono text-[#0A1630]">
              {verifiedCount}{" "}
              <span className="text-xs font-normal text-slate-500">/ {totalStapels} Stapel</span>
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-[#1E3D73] h-full rounded-full transition-all"
                style={{ width: `${Math.round((verifiedCount / totalStapels) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Akurasi Fisik vs Buku
            </span>
            <p className="text-base sm:text-lg font-bold font-mono text-emerald-700">
              {accuracyRate}%
            </p>
            <span className="text-[10px] text-slate-500 block truncate">
              {matchCount} Stapel Sesuai Sempurna
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Selisih Fisik Terdeteksi
            </span>
            <p className="text-base sm:text-lg font-bold font-mono text-slate-900">
              {shortageCount > 0 ? (
                <span className="text-red-600 font-bold mr-1">-{shortageCount} Kurang</span>
              ) : null}
              {surplusCount > 0 ? (
                <span className="text-blue-600 font-bold">+{surplusCount} Lebih</span>
              ) : null}
              {shortageCount === 0 && surplusCount === 0 && (
                <span className="text-emerald-600">Nihil (0 Selisih)</span>
              )}
            </p>
            <span className="text-[10px] text-slate-500 block truncate">
              Variance Engine Aktif
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Tindakan Laporan
            </span>
            <div className="flex gap-1.5 mt-1">
              {onOpenBaso && (
                <button
                  onClick={onOpenBaso}
                  className="flex-1 py-1 px-2 bg-[#1E3D73] hover:bg-[#162D55] text-white rounded-lg text-[11px] font-bold transition-colors shadow-xs cursor-pointer"
                >
                  Ekspor BASO
                </button>
              )}
              <button
                onClick={resetOpnameSession}
                className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                title="Reset Sesi Opname"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area: Split View (Calculator & Verified List) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100">
          {/* Left Column: Bulog Stapel Tier Calculator (7 Cols) */}
          <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#1E3D73]">
                  calculate
                </span>
                <h4 className="font-bold text-sm text-[#0A1630]">
                  Kalkulator Tumpukan Karung (Bulog Tier & Layer)
                </h4>
              </div>

              {/* Stapel Quick Picker */}
              <div className="w-48 sm:w-56">
                <CustomSelect
                  value={selectedStapelId}
                  onChange={(e) => handleSelectStapel(e.target.value)}
                  size="sm"
                  fontMono={true}
                  placeholder="Pilih Stapel..."
                  options={stapels.map((s) => ({
                    value: s.id,
                    label: `${s.id} — ${s.gudang}`,
                    badge: (opnameRecords || {})[s.id] ? "✓ Terhitung" : "Belum",
                  }))}
                />
              </div>
            </div>

            {/* Selected Stapel Info Card */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-black text-sm text-[#1E3D73] block">
                  {currentStapel.id} ({currentStapel.name})
                </span>
                <span className="text-[11px] text-slate-600">
                  {currentStapel.gudang} • Blok {currentStapel.block || currentStapel.row}, No. {currentStapel.number || currentStapel.col}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Saldo Buku Sistem:</span>
                <span className="font-mono font-bold text-base text-[#0A1630]">
                  {bookKoli} <span className="text-xs font-normal text-slate-500">Koli</span>
                </span>
              </div>
            </div>

            {/* Tier Formula Form */}
            <form onSubmit={handleSaveOpnameRecord} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    1. Jumlah Lapis Susunan (Tinggi)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={layerCount}
                    onChange={(e) => setLayerCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1E3D73]"
                    placeholder="misal: 10 lapis"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Standar tumpukan: 10–12 lapis
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    2. Isi Karung per Lapis
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={perLayerKoli}
                    onChange={(e) => setPerLayerKoli(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1E3D73]"
                    placeholder="misal: 100 karung"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Kunci formasi susunan karung
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    3. Tumpukan Kunci Puncak (+)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={peakKoli}
                    onChange={(e) => setPeakKoli(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1E3D73]"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Sisa karung di atas susunan rata
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    4. Karung Rusak / Ceceran (-)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={damagedKoli}
                    onChange={(e) => setDamagedKoli(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1E3D73]"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Karung rusak / tidak layak hitung
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catatan Pemeriksaan Fisik Stapel
                </label>
                <input
                  type="text"
                  value={opnameNote}
                  onChange={(e) => setOpnameNote(e.target.value)}
                  placeholder="Kondisi palet, kebersihan lorong, ventilasi..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#1E3D73]"
                />
              </div>

              {/* Live Formula Display Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600 font-mono text-[11px]">
                  <span>Formula Standar Bulog:</span>
                  <span>(Lapis × Isi) + Puncak - Rusak</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-700">Hasil Hitung Fisik:</span>
                  <span className="font-mono font-black text-base text-[#1E3D73]">
                    ({layers} × {perLayer}) + {peak} - {damaged} ={" "}
                    <strong className="text-xl text-[#0A1630]">
                      {calculatedPhysicalKoli.toLocaleString("id-ID")}
                    </strong>{" "}
                    Koli
                  </span>
                </div>

                {/* Variance Engine Indicator */}
                <div
                  className={`p-2.5 rounded-xl flex items-center justify-between font-bold text-xs border ${
                    calculatedVariance === 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : calculatedVariance < 0
                      ? "bg-red-50 text-red-800 border-red-200"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">
                      {calculatedVariance === 0
                        ? "check_circle"
                        : calculatedVariance < 0
                        ? "remove_circle"
                        : "add_circle"}
                    </span>
                    <span>
                      {calculatedVariance === 0
                        ? "Status: Sesuai Sempurna (Match 100%)"
                        : calculatedVariance < 0
                        ? `Status: Selisih Kurang (${Math.abs(calculatedVariance)} Koli)`
                        : `Status: Selisih Lebih (+${calculatedVariance} Koli)`}
                    </span>
                  </div>
                  <span className="font-mono">
                    Buku: {bookKoli} vs Fisik: {calculatedPhysicalKoli}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#1E3D73] hover:bg-[#162D55] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>Simpan Verifikasi Fisik Stapel {selectedStapelId}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Verified Stapels & Variance Audit List (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h4 className="font-bold text-sm text-[#0A1630] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">
                    task_alt
                  </span>
                  Daftar Tumpukan Terhitung ({verifiedCount})
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  CISKID
                </span>
              </div>

              <div className="mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {verifiedCount === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <span className="material-symbols-outlined text-3xl mb-1 text-slate-300 block">
                      inventory
                    </span>
                    Belum ada stapel yang diverifikasi pada sesi ini.
                    <br />
                    Gunakan kalkulator di sebelah kiri untuk mulai menghitung.
                  </div>
                ) : (
                  opnameList.map((rec) => (
                    <div
                      key={rec.stapelId}
                      onClick={() => handleSelectStapel(rec.stapelId)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                        rec.stapelId === selectedStapelId
                          ? "ring-2 ring-blue-500 bg-blue-50/50"
                          : "bg-slate-50 hover:bg-slate-100"
                      } ${
                        rec.variance === 0
                          ? "border-emerald-200"
                          : rec.variance < 0
                          ? "border-red-200"
                          : "border-blue-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {rec.stapelId}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({rec.gudang || "Gudang"})
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                            rec.variance === 0
                              ? "bg-emerald-100 text-emerald-800"
                              : rec.variance < 0
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {rec.variance === 0
                            ? "SESUAI"
                            : rec.variance < 0
                            ? `-${Math.abs(rec.variance)}`
                            : `+${rec.variance}`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1 font-mono">
                        <span>Fisik: {rec.physicalKoli} koli</span>
                        <span className="text-slate-400">Buku: {rec.bookKoli} koli</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Petugas: {currentUser?.name || "Budi Santoso"}</span>
              <span className="font-mono">{new Date().toISOString().slice(0, 10)}</span>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-3 bg-white border-t border-slate-200 px-5 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#1E3D73]">
              verified
            </span>
            <span>
              Standar Prosedur Operasional (SOP) Stock Opname Komoditas Pangan Bulog.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
