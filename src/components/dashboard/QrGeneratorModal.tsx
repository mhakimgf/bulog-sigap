"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { useWarehouse } from "../../context/WarehouseContext";
import { CustomSelect } from "../common/CustomSelect";
import { Stapel } from "@/types/warehouse";

export interface QrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultStapelId?: string;
  initialStapelId?: string;
}

export const QrGeneratorModal: React.FC<QrGeneratorModalProps> = ({
  isOpen,
  onClose,
  defaultStapelId = "G1-A2",
  initialStapelId,
}) => {
  const initialId = initialStapelId || defaultStapelId;
  const { stapels, logAuditEvent } = useWarehouse();
  const [selectedStapelId, setSelectedStapelId] = useState<string>(initialId);
  const [qrMode, setQrMode] = useState<"single" | "gudang" | "all">("single");
  const [selectedGudangFilter, setSelectedGudangFilter] = useState<string>("Gudang 1");
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [isLoadingQr, setIsLoadingQr] = useState<boolean>(true);

  // Sync defaultStapelId when prop changes
  useEffect(() => {
    if (initialId) setSelectedStapelId(initialId);
  }, [initialId]);

  // Generate QR Codes via 'qrcode' package
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingQr(true);

    const generateQrs = async () => {
      const urls: Record<string, string> = {};
      try {
        if (qrMode === "single") {
          const target = stapels.find((s) => s.id === selectedStapelId) || stapels[0];
          if (target) {
            const payload = target.id;
            const url = await QRCode.toDataURL(payload, {
              width: 320,
              margin: 2,
              color: {
                dark: "#0A1630",
                light: "#FFFFFF",
              },
            });
            urls[target.id] = url;
          }
        } else if (qrMode === "gudang") {
          const targetStapels = stapels.filter((s) => s.gudang === selectedGudangFilter);
          for (const s of targetStapels) {
            const url = await QRCode.toDataURL(s.id, {
              width: 280,
              margin: 2,
              color: { dark: "#0A1630", light: "#FFFFFF" },
            });
            urls[s.id] = url;
          }
        } else {
          // Generate for all 60 stapels
          for (const s of stapels) {
            const url = await QRCode.toDataURL(s.id, {
              width: 240,
              margin: 2,
              color: { dark: "#0A1630", light: "#FFFFFF" },
            });
            urls[s.id] = url;
          }
        }

        if (isMounted) {
          setQrCodeDataUrls(urls);
          setIsLoadingQr(false);
        }
      } catch (err) {
        console.error("Error generating QR Code:", err);
        if (isMounted) setIsLoadingQr(false);
      }
    };

    generateQrs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, qrMode, selectedStapelId, selectedGudangFilter, stapels]);

  if (!isOpen) return null;

  const currentStapel =
    stapels.find((s) => s.id === selectedStapelId) || stapels[0];

  const handlePrintLabels = () => {
    logAuditEvent({
      action: "QR_LABEL_PRINT",
      target: qrMode === "single" ? selectedStapelId : `${qrMode.toUpperCase()} (${selectedGudangFilter})`,
      details: `Pencetakan label identitas fisik tumpukan (stapel) untuk pemasangan pada tiang gudang.`,
    });
    window.print();
  };

  const handleDownloadPng = (stapelId: string, dataUrl: string) => {
    const link = document.createElement("a");
    link.download = `LABEL-QR-STAPEL-${stapelId}.png`;
    link.href = dataUrl;
    link.click();
  };

  const getBlockTheme = (block: string) => {
    if (block === "A") {
      return {
        bg: "bg-[#FFE4E6]",
        border: "border-[#FDA4AF]",
        text: "text-[#9F1239]",
        badge: "bg-[#FDA4AF]",
        comm: "Beras Medium SPHP (CBP)",
      };
    }
    if (block === "B") {
      return {
        bg: "bg-[#FEF9C3]",
        border: "border-[#FDE047]",
        text: "text-[#854D0E]",
        badge: "bg-[#FDE047]",
        comm: "Beras Premium Kita & Gula Pasir",
      };
    }
    return {
      bg: "bg-[#DCFCE7]",
      border: "border-[#86EFAC]",
      text: "text-[#166534]",
      badge: "bg-[#86EFAC]",
      comm: "Minyakita Jerigen 5L & Tepung",
    };
  };

  // Render a Single Printable Bulog Label Card
  const renderLabelCard = (stapel: Stapel) => {
    const theme = getBlockTheme(stapel.block);
    const qrUrl = qrCodeDataUrls[stapel.id];

    return (
      <div
        key={stapel.id}
        className="bg-white border-2 border-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm text-slate-900 flex flex-col justify-between print:border-2 print:border-black print:rounded-lg print:p-4 print:page-break-inside-avoid print:shadow-none min-h-[360px]"
      >
        {/* Kop Label Resmi Bulog */}
        <div className="border-b-2 border-slate-900 pb-2 mb-3 text-center">
          <div className="flex items-center justify-between">
            <span className="font-sans font-black text-sm tracking-tight text-[#1E3D73]">
              PERUM BULOG
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              GBB CISKID • KANCAB BANDUNG
            </span>
          </div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 mt-0.5">
            Kartu Label Identitas Fisik Tumpukan (Stapel)
          </h4>
        </div>

        {/* Big Code & Block Badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Lokasi Gudang
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-[#0A1630]">
              {stapel.gudang}
            </span>
          </div>
          <div
            className={`px-3 py-1 rounded-xl border font-mono font-black text-sm sm:text-base shadow-xs ${theme.badge} ${theme.text} ${theme.border}`}
          >
            BLOK {stapel.block} • NO. {stapel.number}
          </div>
        </div>

        {/* Center QR Code Image */}
        <div className="my-2 flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-200">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt={`QR Code ${stapel.id}`}
              className="w-40 h-40 sm:w-44 sm:h-44 object-contain shadow-xs bg-white p-1 rounded-lg"
            />
          ) : (
            <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
              <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <span className="mt-2 font-mono text-xs sm:text-sm font-black text-[#1E3D73] tracking-widest">
            {stapel.id}
          </span>
        </div>

        {/* Specifications Table */}
        <div className="space-y-1 text-[11px] font-sans border-t border-slate-200 pt-2">
          <div className="flex justify-between">
            <span className="text-slate-500">Peruntukan:</span>
            <span className="font-bold text-slate-800 text-right truncate max-w-[190px]">
              {theme.comm}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Kapasitas Maks:</span>
            <span className="font-mono font-bold text-slate-800">
              {stapel.capacityKoli || 1000} Koli / 50 Ton
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Arah Loading:</span>
            <span className="font-semibold text-slate-700">
              {stapel.number >= 3 ? "Pintu Barat (Dermaga 1)" : "Pintu Timur (Dermaga 2)"}
            </span>
          </div>
        </div>

        {/* Footer Instruction */}
        <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-500">
          <span>Pindai QR ini via HP Operator SIGAP</span>
          <span className="font-mono">Perum Bulog © 2026</span>
        </div>
      </div>
    );
  };

  const labelsToRender =
    qrMode === "single"
      ? currentStapel ? [currentStapel] : []
      : qrMode === "gudang"
      ? stapels.filter((s) => s.gudang === selectedGudangFilter)
      : stapels;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[94vh] flex flex-col">
        {/* Header Toolbar */}
        <div className="bg-[#1E3D73] text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0A516] text-[#0A1630] flex items-center justify-center font-bold shadow-md">
              <span className="material-symbols-outlined text-[24px]">qr_code_2</span>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Generator QR Code & Label Tumpukan (Stapel)
              </h3>
              <p className="text-[11px] text-blue-200">
                Penerbitan label barcode fisik standar Perum Bulog untuk tiang tumpukan
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintLabels}
              className="px-3.5 py-2 bg-[#F0A516] hover:bg-[#D4900F] text-[#0A1630] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              <span>Cetak Label ({labelsToRender.length})</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Filter Controls (Sticky below header) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setQrMode("single")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                qrMode === "single"
                  ? "bg-[#1E3D73] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tumpukan Tunggal
            </button>
            <button
              onClick={() => setQrMode("gudang")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                qrMode === "gudang"
                  ? "bg-[#1E3D73] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Satu Gedung (12 Stapel)
            </button>
            <button
              onClick={() => setQrMode("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                qrMode === "all"
                  ? "bg-[#1E3D73] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua (60 Stapel)
            </button>
          </div>

          {/* Conditional Dropdown Filter */}
          <div className="flex items-center gap-2">
            {qrMode === "single" && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 text-xs whitespace-nowrap">Pilih Stapel:</span>
                <div className="w-48 sm:w-56">
                  <CustomSelect
                    value={selectedStapelId}
                    onChange={(e) => setSelectedStapelId(e.target.value)}
                    size="sm"
                    fontMono={true}
                    options={stapels.map((s) => ({
                      value: s.id,
                      label: `${s.id} — ${s.gudang}`,
                      sublabel: `Blok ${s.block}${s.number}`,
                    }))}
                  />
                </div>
              </div>
            )}

            {qrMode === "gudang" && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-500 text-xs whitespace-nowrap">Pilih Gedung:</span>
                <div className="w-44 sm:w-52">
                  <CustomSelect
                    value={selectedGudangFilter}
                    onChange={(e) => setSelectedGudangFilter(e.target.value)}
                    size="sm"
                    options={["Gudang 1", "Gudang 2", "Gudang 3", "Gudang 4", "Gudang 5"].map((g) => ({
                      value: g,
                      label: g,
                      sublabel: "12 Stapel A1-C4",
                    }))}
                  />
                </div>
              </div>
            )}

            {qrMode === "single" && qrCodeDataUrls[selectedStapelId] && (
              <button
                onClick={() =>
                  handleDownloadPng(selectedStapelId, qrCodeDataUrls[selectedStapelId])
                }
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Download Gambar QR PNG"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>PNG</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Printable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100">
          {isLoadingQr ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <span className="w-8 h-8 border-3 border-[#1E3D73] border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs font-semibold">Menghasilkan barcode QR resolusi tinggi...</p>
            </div>
          ) : (
            <div
              className={`grid gap-4 sm:gap-6 ${
                qrMode === "single"
                  ? "max-w-md mx-auto grid-cols-1"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
              }`}
            >
              {labelsToRender.map((s) => renderLabelCard(s))}
            </div>
          )}
        </div>

        {/* Bottom Bar Info */}
        <div className="p-3 bg-white border-t border-slate-200 px-5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-blue-600">info</span>
            <span>
              Format QR kompatibel dengan scanner HP Android/iOS dan camera barcode reader SIGAP.
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Total {labelsToRender.length} Label
          </span>
        </div>
      </div>
    </div>
  );
};
