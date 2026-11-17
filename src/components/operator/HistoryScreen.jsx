"use client";

import React, { useState } from "react";
import { useWarehouse } from "../../context/WarehouseContext";
import { OperatorHeader } from "./OperatorHeader";
import { OperatorBottomNav } from "./OperatorBottomNav";

export const HistoryScreen = () => {
  const { transactions, setOperatorScreen, setSelectedStapelId } = useWarehouse();
  const [filterType, setFilterType] = useState("ALL"); // 'ALL' | 'MASUK' | 'KELUAR'

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === "ALL") return true;
    return t.type === filterType;
  });

  const totalMasuk = transactions
    .filter((t) => t.type === "MASUK")
    .reduce((sum, t) => sum + (t.koli || 0), 0);

  const totalKeluar = transactions
    .filter((t) => t.type === "KELUAR")
    .reduce((sum, t) => sum + (t.koli || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0D1C2E] flex flex-col pb-24">
      <OperatorHeader
        title="Riwayat Mutasi"
        showBack={true}
        onBack={() => setOperatorScreen("home")}
      />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-20 space-y-4">
        {/* Summary Card */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Rekap Transaksi Keseluruhan
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">move_to_inbox</span>
                Total Masuk
              </span>
              <p className="text-lg font-bold font-mono text-emerald-950 mt-1">
                {totalMasuk.toLocaleString("id-ID")}{" "}
                <span className="text-xs font-normal text-emerald-700">koli</span>
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">outbox</span>
                Total Keluar
              </span>
              <p className="text-lg font-bold font-mono text-blue-950 mt-1">
                {totalKeluar.toLocaleString("id-ID")}{" "}
                <span className="text-xs font-normal text-blue-700">koli</span>
              </p>
            </div>
          </div>
        </section>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {["ALL", "MASUK", "KELUAR"].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                filterType === type
                  ? "bg-[#1E3D73] text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {type === "ALL" ? "Semua Mutasi" : type === "MASUK" ? "Barang Masuk" : "Barang Keluar"}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
              Tidak ada catatan transaksi dengan filter ini.
            </div>
          ) : (
            filteredTransactions.map((trx) => (
              <div
                key={trx.id}
                onClick={() => {
                  setSelectedStapelId(trx.stapelId);
                  setOperatorScreen("stapel-detail");
                }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] space-y-2 cursor-pointer hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
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
                    <div>
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
                        <span className="font-mono text-xs font-bold text-[#0A1630]">
                          {trx.stapelId}
                        </span>
                        {trx.isOffline && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-bold">
                            Offline Sync
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mt-0.5">
                        {trx.commodityName}
                      </h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-bold font-mono ${
                        trx.type === "MASUK" ? "text-emerald-700" : "text-blue-700"
                      }`}
                    >
                      {trx.type === "MASUK" ? "+" : "-"}
                      {trx.koli} {trx.unit}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {((trx.totalKg || 0) / 1000).toFixed(2)} Ton
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div>
                    <span>Asal/Tujuan: </span>
                    <strong className="text-slate-700">{trx.sourceOrDest}</strong>
                  </div>
                  <div className="text-right">
                    <span>Surat Jalan: </span>
                    <strong className="text-slate-700 font-mono">{trx.suratJalan}</strong>
                  </div>
                </div>

                {trx.notes && (
                  <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                    "{trx.notes}"
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <span>Petugas: {trx.operator}</span>
                  <span>{new Date(trx.timestamp).toLocaleString("id-ID")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <OperatorBottomNav />
    </div>
  );
};
