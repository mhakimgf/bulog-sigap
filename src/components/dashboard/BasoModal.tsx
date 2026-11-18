"use client";

import React, { useState } from "react";
import { useWarehouse } from "../../context/WarehouseContext";

export interface BasoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BasoModal: React.FC<BasoModalProps> = ({ isOpen, onClose }) => {
  const { warehouse, stapels, warehouseStats } = useWarehouse();
  const [nomorBaso] = useState<string>("BA-SO/04/CISKID-01/XI/2026");
  const [tanggalOpname] = useState<string>("15 November 2026");
  const [petugasOpname] = useState<string>("Budi Santoso");
  const [catatanUmum] = useState<string>(
    "Hasil penghitungan fisik tumpukan (stapel) menunjukkan kesesuaian fisik dengan kartu gudang dan mutasi digital SIGAP. Tidak ditemukan selisih rusak atau kehilangan."
  );

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Modal Toolbar */}
        <div className="bg-[#1E3D73] text-white p-3 sm:p-4 flex items-center justify-between flex-shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-2xl text-[#F0A516] flex-shrink-0">
              description
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">
                Berita Acara Stock Opname (BASO)
              </h3>
              <p className="text-[10px] sm:text-xs text-blue-200 truncate">
                Format Resmi Pertanggungjawaban Bulog
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={handlePrint}
              className="px-2.5 sm:px-3 py-1.5 bg-[#F0A516] hover:bg-[#D4900F] text-[#0F2040] rounded-lg text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span className="hidden sm:inline">Cetak / Simpan</span> PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 font-serif text-slate-900 bg-white print:p-0">
          {/* Header Kop Bulog */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="font-sans font-black text-2xl tracking-tighter text-[#1E3D73]">
                perum <span className="text-[#1E3D73]">bulog</span>
              </span>
            </div>
            <h2 className="font-bold text-sm tracking-widest uppercase">
              PERUSAHAAN UMUM (PERUM) BULOG
            </h2>
            <h3 className="text-xs font-semibold uppercase text-slate-700">
              {warehouse?.kanwil?.toUpperCase()} — {warehouse?.kancab?.toUpperCase()}
            </h3>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Unit Pergudangan: {warehouse?.name} ({warehouse?.code}) • {warehouse?.address}
            </p>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-base font-bold uppercase underline tracking-wide">
              BERITA ACARA HASIL STOCK OPNAME FISIK KOMODITAS PANGAN
            </h1>
            <p className="font-mono text-xs text-slate-600 mt-1">
              Nomor: {nomorBaso}
            </p>
          </div>

          {/* Opening Paragraph */}
          <p className="text-xs leading-relaxed mb-4 text-justify font-sans">
            Pada hari ini, <strong>Minggu</strong> tanggal <strong>{tanggalOpname}</strong>, telah dilakukan pemeriksaan dan perhitungan fisik (Stock Opname) persediaan komoditas pangan yang tersimpan di dalam <strong>{warehouse?.name}</strong>, dengan rincian hasil pencatatan fisik dan rekonsiliasi pembukuan sistem digital SIGAP sebagai berikut:
          </p>

          {/* Reconciliation Table */}
          <div className="overflow-x-auto no-scrollbar mb-6">
            <table className="min-w-[620px] w-full text-xs border-collapse border border-slate-300 font-sans">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 p-2 text-center w-8">No</th>
                  <th className="border border-slate-300 p-2 text-left">Komoditas & Merk</th>
                  <th className="border border-slate-300 p-2 text-center">Stapel</th>
                  <th className="border border-slate-300 p-2 text-center">Satuan</th>
                  <th className="border border-slate-300 p-2 text-right">Stok Pembukuan</th>
                  <th className="border border-slate-300 p-2 text-right">Stok Fisik</th>
                  <th className="border border-slate-300 p-2 text-right">Selisih</th>
                  <th className="border border-slate-300 p-2 text-center">Kondisi</th>
                </tr>
              </thead>
              <tbody>
                {stapels
                  .filter((s) => s.batches.length > 0)
                  .map((stapel, sIdx) =>
                    stapel.batches.map((b, bIdx) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 text-center font-mono text-[11px]">
                          {sIdx + 1}.{bIdx + 1}
                        </td>
                        <td className="border border-slate-300 p-2">
                          <strong className="block text-slate-900">{b.commodityName}</strong>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {b.batchNo} ({b.brand})
                          </span>
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono font-bold text-[#1E3D73]">
                          {stapel.id}
                        </td>
                        <td className="border border-slate-300 p-2 text-center">{b.unit}</td>
                        <td className="border border-slate-300 p-2 text-right font-mono">
                          {b.koli.toLocaleString("id-ID")}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-900">
                          {b.koli.toLocaleString("id-ID")}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono text-emerald-700 font-bold">
                          0 (NIHIL)
                        </td>
                        <td className="border border-slate-300 p-2 text-center">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {b.kondisi || "Baik"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={4} className="border border-slate-300 p-2 text-right uppercase">
                    Total Fisik Gudang
                  </td>
                  <td className="border border-slate-300 p-2 text-right font-mono">
                    {(warehouseStats?.totalOccupiedKoli || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="border border-slate-300 p-2 text-right font-mono text-[#1E3D73]">
                    {(warehouseStats?.totalOccupiedKoli || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="border border-slate-300 p-2 text-right font-mono text-emerald-700">
                    NIHIL
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-mono">
                    {warehouseStats?.totalOccupiedTonase || 0} Ton
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          <div className="font-sans text-xs mb-8 space-y-1">
            <h4 className="font-bold text-slate-800">Catatan Pemeriksa & Rekomendasi:</h4>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
              {catatanUmum}
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 text-center font-sans text-xs pt-4 border-t border-slate-200">
            <div>
              <p className="text-slate-500 mb-1">Petugas Opname / Operator,</p>
              <div className="h-16 flex items-center justify-center font-serif italic text-slate-400">
                [Tertanda Digital]
              </div>
              <p className="font-bold underline text-slate-900">{petugasOpname}</p>
              <p className="text-[10px] text-slate-500 font-mono">NIP. 19940822 201902 1 002</p>
            </div>

            <div>
              <p className="text-slate-500 mb-1">Pemeriksa / Pengawas Mutu,</p>
              <div className="h-16 flex items-center justify-center font-serif italic text-slate-400">
                [Tertanda Digital]
              </div>
              <p className="font-bold underline text-slate-900">Dr. Ir. Suryadi, M.Si.</p>
              <p className="text-[10px] text-slate-500 font-mono">NIP. 19780512 200312 1 001</p>
            </div>

            <div>
              <p className="text-slate-500 mb-1">Mengetahui, Kepala Gudang,</p>
              <div className="h-16 flex items-center justify-center font-serif italic text-slate-400">
                [Tertanda Digital]
              </div>
              <p className="font-bold underline text-slate-900">{warehouse?.kepalaGudang || "Hendra Wijaya"}</p>
              <p className="text-[10px] text-slate-500 font-mono">NIP. {warehouse?.nipKepalaGudang || "-"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
