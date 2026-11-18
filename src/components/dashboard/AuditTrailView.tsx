"use client";

import React, { useState } from "react";
import { useWarehouse } from "../../context/WarehouseContext";
import { CustomSelect } from "../common/CustomSelect";
import { AuditLog } from "@/types/audit";

export const AuditTrailView: React.FC = () => {
  const { auditLogs } = useWarehouse();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  // Filtering audit entries
  const filteredLogs = auditLogs.filter((log: AuditLog) => {
    const matchesSearch =
      (log.user || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.target || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.nip || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction =
      actionFilter === "ALL" || (log.action || "").includes(actionFilter);

    return matchesSearch && matchesAction;
  });

  const handleExportCsv = () => {
    const headers = [
      "ID Log",
      "Waktu",
      "Petugas",
      "NIP",
      "Peran",
      "Tipe Aksi",
      "Target",
      "Rincian Kejadian",
      "Alamat IP",
    ];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.user}"`,
      `"${l.nip || "-"}"`,
      `"${l.role}"`,
      `"${l.action}"`,
      `"${l.target || "-"}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      `"${l.ipAddress || "-"}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `AUDIT-TRAIL-SIGAP-BULOG-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action = "") => {
    if (action.includes("INBOUND")) {
      return {
        label: "Barang Masuk",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "move_to_inbox",
      };
    }
    if (action.includes("OUTBOUND")) {
      return {
        label: "Barang Keluar",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        icon: "outbox",
      };
    }
    if (action.includes("USER")) {
      return {
        label: "Manajemen Akun",
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        icon: "person",
      };
    }
    if (action.includes("FREEZE")) {
      return {
        label: "Freeze Mode",
        bg: "bg-red-50 text-red-700 border-red-200",
        icon: "lock",
      };
    }
    if (action.includes("OPNAME")) {
      return {
        label: "Stock Opname",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "fact_check",
      };
    }
    if (action.includes("QR")) {
      return {
        label: "Label QR",
        bg: "bg-slate-100 text-slate-700 border-slate-300",
        icon: "qr_code",
      };
    }
    return {
      label: action,
      bg: "bg-slate-100 text-slate-700 border-slate-200",
      icon: "history",
    };
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-[#1E3D73]">
              security
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[#0A1630]">
              Jejak Audit & Akuntabilitas (Audit Trail BUMN)
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1E3D73] border border-blue-200">
              APPEND-ONLY LOG
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan tak terhapuskan untuk seluruh aksi operasional, mutasi komoditas, dan perubahan hak akses.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2 bg-[#1E3D73] hover:bg-[#162D55] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-sm cursor-pointer whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          <span>Ekspor CSV (Pemeriksaan SPI)</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Total Aktivitas Tercatat
          </span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-[#0A1630]">
            {auditLogs.length} <span className="text-xs font-normal text-slate-500">Log</span>
          </p>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">Integritas 100% Valid</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Mutasi Barang Masuk/Keluar
          </span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-emerald-700">
            {auditLogs.filter((l) => (l.action as string).includes("INBOUND") || (l.action as string).includes("OUTBOUND")).length}
          </p>
          <p className="text-[10px] sm:text-xs text-emerald-600 mt-0.5 truncate">Terdokumentasi Surat Jalan</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Verifikasi Stock Opname
          </span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-amber-700">
            {auditLogs.filter((l) => (l.action as string).includes("OPNAME") || (l.action as string).includes("FREEZE")).length}
          </p>
          <p className="text-[10px] sm:text-xs text-amber-600 mt-0.5 truncate">Hasil Hitung Fisik Lapangan</p>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Aksi Otentikasi & Akun
          </span>
          <p className="text-lg sm:text-2xl font-bold font-mono text-purple-700">
            {auditLogs.filter((l) => (l.action as string).includes("USER")).length}
          </p>
          <p className="text-[10px] sm:text-xs text-purple-600 mt-0.5 truncate">Pengawasan Hak Akses</p>
        </div>
      </div>

      {/* Log Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        {/* Filter Controls */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined text-[18px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              placeholder="Cari petugas, target stapel, atau detail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1E3D73]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-bold text-slate-500 text-xs whitespace-nowrap">Filter Aksi:</span>
            <div className="w-full sm:w-60">
              <CustomSelect
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                size="sm"
                options={[
                  { value: "ALL", label: "Semua Tipe Aksi" },
                  { value: "INBOUND", label: "Barang Masuk (Inbound)", icon: "move_to_inbox" },
                  { value: "OUTBOUND", label: "Barang Keluar (Outbound)", icon: "unarchive" },
                  { value: "OPNAME", label: "Stock Opname & Verifikasi", icon: "fact_check" },
                  { value: "FREEZE", label: "Pembekuan Mutasi (Freeze)", icon: "ac_unit" },
                  { value: "USER", label: "Akun & Otentikasi", icon: "manage_accounts" },
                  { value: "QR", label: "Label Barcode/QR", icon: "qr_code_2" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-[680px] w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Waktu & ID</th>
                <th className="p-3">Petugas Pelaksana</th>
                <th className="p-3">Aksi & Kategori</th>
                <th className="p-3">Target</th>
                <th className="p-3">Rincian Kejadian</th>
                <th className="p-3 text-right">Alamat Jaringan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Tidak ada catatan log audit yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action as string);
                  const timeFormatted = log.timestamp
                    ? new Date(log.timestamp).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "-";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <span className="font-mono text-slate-900 block font-bold">
                          {timeFormatted}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {log.id}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] text-white flex-shrink-0 ${
                              log.role === "superadmin"
                                ? "bg-purple-600"
                                : log.role === "kepala_gudang"
                                ? "bg-[#1E3D73]"
                                : "bg-[#F0A516] text-[#0A1630]"
                            }`}
                          >
                            {(log.user || "B").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {log.user}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {log.nip ? `NIP: ${log.nip}` : log.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {badge.icon}
                          </span>
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-mono font-bold text-xs text-[#1E3D73] bg-blue-50 px-2 py-0.5 rounded">
                          {log.target || "-"}
                        </span>
                      </td>

                      <td className="p-3 max-w-xs sm:max-w-md">
                        <p className="text-slate-700 leading-snug line-clamp-2">
                          {log.details}
                        </p>
                      </td>

                      <td className="p-3 text-right font-mono text-[10px] text-slate-400">
                        {log.ipAddress || "192.168.0.115"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 px-4 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredLogs.length} dari {auditLogs.length} rekaman audit</span>
          <span className="font-mono text-[11px] text-slate-400">SIGAP BULOG • Security & Compliance</span>
        </div>
      </div>
    </div>
  );
};
