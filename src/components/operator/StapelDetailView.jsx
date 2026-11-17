"use client";

import React, { useState } from "react";
import {
  useWarehouse,
  calculateAgingDays,
  getShelfLifeStatus,
} from "../../context/WarehouseContext";
import { OperatorHeader } from "./OperatorHeader";
import { OperatorBottomNav } from "./OperatorBottomNav";

export const StapelDetailView = ({ stapelId: propStapelId }) => {
  const {
    stapels,
    transactions,
    selectedStapelId,
    setSelectedStapelId,
    setOperatorScreen,
  } = useWarehouse();

  const activeStapelId = propStapelId || selectedStapelId || "G1-A2";

  React.useEffect(() => {
    if (propStapelId && propStapelId !== selectedStapelId) {
      setSelectedStapelId(propStapelId);
    }
  }, [propStapelId, selectedStapelId, setSelectedStapelId]);

  const [activeTab, setActiveTab] = useState("batches"); // 'batches' | 'mutasi'

  const currentStapel =
    stapels.find((s) => s.id.toLowerCase() === activeStapelId.toLowerCase()) || stapels[0];

  const totalKoli = currentStapel.batches.reduce((sum, b) => sum + b.koli, 0);
  const capacity = currentStapel.capacityKoli || 1000;
  const occupancyPercent = Math.min(100, Math.round((totalKoli / capacity) * 100));

  const totalTonase = currentStapel.batches.reduce((sum, b) => {
    return sum + (b.koli * (b.weightPerUnitKg || 50)) / 1000;
  }, 0);

  // Riwayat mutasi khusus stapel ini
  const stapelTransactions = transactions.filter(
    (t) => t.stapelId === currentStapel.id
  );

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0D1C2E] flex flex-col pb-24">
      <OperatorHeader
        title="Detail Stapel"
        showBack={true}
        onBack={() => setOperatorScreen("home")}
      />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-20">
        {/* Quick Stapel Switcher Strip */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2">
          {stapels.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStapelId(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                s.id === currentStapel.id
                  ? "bg-[#1E3D73] text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  s.status === "kosong"
                    ? "bg-emerald-500"
                    : s.status === "penuh"
                    ? "bg-red-500"
                    : s.status === "nonaktif"
                    ? "bg-slate-400"
                    : "bg-[#F0A516]"
                }`}
              ></span>
              {s.id}
            </button>
          ))}
        </div>

        {/* Stapel Main Overview Card */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold font-mono text-[#0A1630]">
                  {currentStapel.id}
                </h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    currentStapel.status === "kosong"
                      ? "bg-[#DCFCE7] text-[#15803D]"
                      : currentStapel.status === "penuh"
                      ? "bg-[#FEE2E2] text-[#DC2626]"
                      : currentStapel.status === "nonaktif"
                      ? "bg-slate-100 text-slate-600"
                      : "bg-[#FFF8E7] text-[#8C5D08]"
                  }`}
                >
                  {currentStapel.status === "kosong"
                    ? "Kosong / Siaga"
                    : currentStapel.status === "penuh"
                    ? "Kapasitas Penuh"
                    : currentStapel.status === "nonaktif"
                    ? "Sanitasi / PHGT"
                    : "Terisi Sebagian"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {currentStapel.gudang} • Blok {currentStapel.block || currentStapel.row}, No. {currentStapel.number || currentStapel.col} • Kompleks CISKID
              </p>
            </div>

            <div className="w-12 h-12 rounded-xl bg-[#EEF2F9] text-[#1E3D73] flex items-center justify-center flex-shrink-0 border border-[#D0DAF0]">
              <span className="material-symbols-outlined text-[26px]">warehouse</span>
            </div>
          </div>

          {/* Metric Row */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-slate-100 mb-3">
            <div>
              <span className="text-[11px] text-slate-500 block">Total Koli / Jerigen</span>
              <p className="text-lg font-bold font-mono text-[#0A1630]">
                {totalKoli.toLocaleString("id-ID")}{" "}
                <span className="text-xs font-normal text-slate-500">/ {capacity}</span>
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Estimasi Tonase</span>
              <p className="text-lg font-bold font-mono text-[#1E3D73]">
                {totalTonase.toFixed(2)}{" "}
                <span className="text-xs font-normal text-slate-500">Ton</span>
              </p>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Tingkat Kepenuhan</span>
              <span className="font-bold font-mono">{occupancyPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancyPercent > 80
                    ? "bg-red-500"
                    : occupancyPercent > 50
                    ? "bg-[#F0A516]"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${occupancyPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => setOperatorScreen("inbound")}
              className="py-2.5 px-3 bg-[#1E3D73] hover:bg-[#142A51] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add_box</span>
              Tambah Muatan
            </button>
            <button
              onClick={() => setOperatorScreen("outbound")}
              disabled={currentStapel.batches.length === 0}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                currentStapel.batches.length === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-white border-2 border-[#1E3D73] text-[#1E3D73] hover:bg-[#EEF2F9]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">outbox</span>
              Keluarkan Stok
            </button>
          </div>
        </section>

        {/* Tab Navigation: Batches vs Riwayat Mutasi */}
        <div className="flex border-b border-slate-200 mb-3">
          <button
            onClick={() => setActiveTab("batches")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "batches"
                ? "border-[#1E3D73] text-[#1E3D73]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">layers</span>
            Daftar Batch Muatan ({currentStapel.batches.length})
          </button>
          <button
            onClick={() => setActiveTab("mutasi")}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "mutasi"
                ? "border-[#1E3D73] text-[#1E3D73]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            Riwayat Mutasi ({stapelTransactions.length})
          </button>
        </div>

        {/* Tab Content: Batches */}
        {activeTab === "batches" && (
          <div className="space-y-3">
            {currentStapel.batches.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
                  inventory_2
                </span>
                <p className="text-xs font-medium">Stapel ini saat ini kosong.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Gunakan tombol "Tambah Muatan" untuk mencatat barang masuk.
                </p>
              </div>
            ) : (
              currentStapel.batches.map((batch) => {
                const agingDays = calculateAgingDays(batch.dateIn);
                const shelfLife = getShelfLifeStatus(agingDays);

                return (
                  <div
                    key={batch.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold bg-[#EEF2F9] text-[#1E3D73] px-2 py-0.5 rounded">
                            {batch.batchNo}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${shelfLife.badgeColor}`}
                          >
                            {shelfLife.label}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#0A1630]">
                          {batch.commodityName}
                        </h4>
                        <p className="text-xs text-slate-500">{batch.brand}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-bold font-mono text-[#0A1630]">
                          {batch.koli} {batch.unit}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {((batch.koli * (batch.weightPerUnitKg || 50)) / 1000).toFixed(2)} Ton
                        </p>
                      </div>
                    </div>

                    {/* Shelf Life Progress Bar */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">timer</span>
                          Masa Simpan di Gudang:
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {agingDays} Hari ({batch.dateIn})
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${shelfLife.barColor}`}
                          style={{
                            width: `${Math.min(100, Math.round((agingDays / 180) * 100))}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>0 hari</span>
                        <span>90 hari</span>
                        <span>150 hari (Prioritas Salur)</span>
                        <span>180+ hari</span>
                      </div>
                    </div>

                    {/* Batch Metadata Details */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Asal Pasokan</span>
                        <span className="font-medium truncate block">{batch.origin}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Surat Jalan</span>
                        <span className="font-mono font-medium truncate block">
                          {batch.suratJalan}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab Content: Mutasi */}
        {activeTab === "mutasi" && (
          <div className="space-y-2">
            {stapelTransactions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
                Belum ada catatan mutasi untuk stapel ini.
              </div>
            ) : (
              stapelTransactions.map((trx) => (
                <div
                  key={trx.id}
                  className="bg-white rounded-xl p-3.5 shadow-sm border border-[#E2E8F0] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        trx.type === "MASUK"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-[#1E3D73]"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {trx.type === "MASUK" ? "move_to_inbox" : "outbox"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#0A1630]">{trx.type}</span>
                        <span className="text-[11px] text-slate-600 truncate">
                          {trx.suratJalan}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {trx.sourceOrDest} • Oleh {trx.operator}
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
                      {trx.timestamp.slice(0, 10)} {trx.timestamp.slice(11, 16)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <OperatorBottomNav />
    </div>
  );
};
