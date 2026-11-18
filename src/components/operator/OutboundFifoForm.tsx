"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { useWarehouse } from "../../context/WarehouseContext";
import { calculateAgingDays } from "../../lib/calculations";
import { OperatorHeader } from "./OperatorHeader";
import { QrCameraScanner } from "../common/QrCameraScanner";
import { Stapel, Batch } from "../../types/warehouse";

export const OutboundFifoForm: React.FC = () => {
  const {
    stapels,
    releaseOutboundGoods,
    setOperatorScreen,
    selectedStapelId,
    setSelectedStapelId,
    isFreezeMode,
    showToast,
  } = useWarehouse();

  // Active stapel for release
  const [currentStapelId, setCurrentStapelId] = useState<string>(selectedStapelId || "G1-A2");
  // Wajib scan QR tiang tumpukan terlebih dahulu sebelum membuka form penyaluran
  const [isStapelScanned, setIsStapelScanned] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<"camera" | "simulation">("camera");
  const [manualCodeInput, setManualCodeInput] = useState<string>("");

  const currentStapel: Stapel =
    stapels.find((s) => s.id === currentStapelId) ||
    stapels.find((s) => (s.batches || []).length > 0) ||
    stapels[0] || {
      id: currentStapelId,
      gudang: "Gudang 1",
      block: "A",
      number: 1,
      name: `Stapel ${currentStapelId}`,
      capacityKoli: 1000,
      status: "kosong",
      batches: [],
    };

  // Cari batch tertua di stapel ini untuk acuan FIFO
  const sortedBatches: Batch[] = React.useMemo(() => {
    return [...(currentStapel?.batches || [])].sort((a, b) => {
      return new Date(a.dateIn).getTime() - new Date(b.dateIn).getTime();
    });
  }, [currentStapel]);

  const oldestBatch: Batch | null = sortedBatches[0] || null;

  // Selected batch state
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => {
    return oldestBatch ? oldestBatch.id : "";
  });

  // Sync selectedBatchId if currentStapel changes
  React.useEffect(() => {
    if (oldestBatch) {
      setSelectedBatchId(oldestBatch.id);
    }
  }, [currentStapelId, oldestBatch]);

  const activeBatch: Batch | null =
    currentStapel?.batches?.find((b) => b.id === selectedBatchId) || oldestBatch;

  // Form states
  const [koliToRelease, setKoliToRelease] = useState<string>("100");
  const [destination, setDestination] = useState<string>("Pasar Induk Beras Cipinang (PIBC)");
  const [suratJalan, setSuratJalan] = useState<string>("DO-SPHP-2026-1115-12");
  const [fifoOverrideConfirmed, setFifoOverrideConfirmed] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Cek apakah batch yang dipilih BUKAN batch tertua
  const isFifoViolation = Boolean(
    activeBatch && oldestBatch && activeBatch.id !== oldestBatch.id
  );

  const currentTotalKoli = currentStapel?.batches?.reduce((sum, b) => sum + (b.koli || 0), 0) || 0;
  const capacity = currentStapel?.capacityKoli || 1000;
  const occupancyPercent = Math.min(100, Math.round((currentTotalKoli / capacity) * 100));

  // Handler saat scan QR berhasil (dari kamera atau simulasi)
  const handleScanStapel = (scannedCode: string) => {
    if (!scannedCode) return;
    const cleanCode = scannedCode.trim().toUpperCase();
    const foundStapel = stapels.find(
      (s) =>
        s.id.toUpperCase() === cleanCode ||
        s.name.toUpperCase() === cleanCode ||
        s.id.toUpperCase().replace("-", "") === cleanCode.replace("-", "")
    );

    if (!foundStapel) {
      alert(`Stapel dengan kode "${scannedCode}" tidak ditemukan di master gudang.`);
      return;
    }

    const totalKoli = (foundStapel.batches || []).reduce((sum, b) => sum + (b.koli || 0), 0);
    if (totalKoli <= 0) {
      alert(`Peringatan: Tumpukan ${foundStapel.id} Kosong! Tidak ada stok komoditas untuk dikeluarkan.`);
      return;
    }

    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {}

    setCurrentStapelId(foundStapel.id);
    setSelectedStapelId(foundStapel.id);
    setIsStapelScanned(true);
    setFifoOverrideConfirmed(false);
    if (showToast) {
      showToast(`✓ Tumpukan ${foundStapel.id} terverifikasi fisik! Formulir penyaluran dibuka.`, "success");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFreezeMode) {
      alert("Penyaluran barang keluar ditangguhkan sementara karena Sesi Stock Opname sedang berlangsung.");
      return;
    }

    if (!isStapelScanned) {
      alert("Wajib memindai QR code tiang tumpukan fisik terlebih dahulu sebelum mengeluarkan barang.");
      return;
    }

    if (!activeBatch) {
      alert("Pilih batch barang yang akan dikeluarkan.");
      return;
    }
    const releaseNum = parseInt(koliToRelease, 10);
    if (!releaseNum || releaseNum <= 0 || releaseNum > activeBatch.koli) {
      alert(`Jumlah koli tidak boleh melebihi sisa batch (${activeBatch.koli} koli).`);
      return;
    }

    if (isFifoViolation && !fifoOverrideConfirmed) {
      alert("Harap berikan konfirmasi alasan jika tidak mendahulukan batch yang disimpan paling lama.");
      return;
    }

    releaseOutboundGoods({
      stapelId: currentStapelId,
      batchId: activeBatch.id,
      koliToRelease: releaseNum,
      destination,
      suratJalan,
      notes: isFifoViolation
        ? `[Penyaluran Khusus] Alasan: ${overrideReason || "Kebutuhan SPK Khusus"}`
        : "Pengeluaran stok reguler urutan masa simpan",
    });

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}

    setIsSubmitted(true);
    setTimeout(() => {
      setOperatorScreen("home");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0D1C2E] flex flex-col pb-12">
      <OperatorHeader
        title="Barang Keluar (Penyaluran)"
        showBack={true}
        onBack={() => setOperatorScreen("home")}
      />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-20 pb-8 space-y-4">
        {/* Freeze Mode Warning Banner */}
        {isFreezeMode && (
          <div className="p-3 bg-red-600 text-white rounded-2xl shadow-md flex items-center gap-3 text-xs font-bold animate-pulse">
            <span className="material-symbols-outlined text-[24px] flex-shrink-0">lock</span>
            <div>
              <p>Sesi Stock Opname Aktif (Mutasi Dibekukan)</p>
              <p className="text-[10px] font-normal text-red-100">
                Penyaluran komoditas keluar sementara dikunci sampai penghitungan fisik opname selesai.
              </p>
            </div>
          </div>
        )}

        {/* Stepper Indicator */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0"></div>

            {/* Step 1: Pindai Stapel */}
            <div className="flex flex-col items-center gap-1 z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isStapelScanned
                    ? "bg-[#16A34A] text-white shadow-sm"
                    : "bg-[#1E3D73] text-white ring-4 ring-[#1E3D73]/20 shadow-md"
                }`}
              >
                {isStapelScanned ? (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                )}
              </div>
              <span
                className={`text-[11px] font-bold ${
                  isStapelScanned ? "text-emerald-700" : "text-[#1E3D73]"
                }`}
              >
                1. Scan QR Stapel
              </span>
            </div>

            {/* Step 2: Pilih Batch & Masa Simpan */}
            <div className="flex flex-col items-center gap-1 z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                  isStapelScanned
                    ? "bg-[#1E3D73] text-white shadow-md ring-4 ring-[#1E3D73]/20"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                2
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  isStapelScanned ? "text-[#1E3D73]" : "text-slate-400"
                }`}
              >
                2. Pilih Batch
              </span>
            </div>

            {/* Step 3: Konfirmasi DO */}
            <div className="flex flex-col items-center gap-1 z-10">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <span className="font-mono text-xs font-medium">3</span>
              </div>
              <span className="text-[11px] text-slate-400">3. Konfirmasi DO</span>
            </div>
          </div>
        </section>

        {/* STEP 1: SCAN QR TIANG TUMPUKAN (JIKA BELUM DISCAN) */}
        {!isStapelScanned ? (
          <div className="space-y-3">
            {/* Banner Kewajiban Scan Fisik */}
            <div className="p-3.5 bg-gradient-to-r from-[#1E3D73] to-[#0A1630] text-white rounded-2xl shadow-sm border border-blue-900/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#F0A516] text-[#0A1630] flex items-center justify-center flex-shrink-0 font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Wajib Pindai QR Tiang Stapel</p>
                  <p className="text-[10px] text-blue-200">
                    Arahkan kamera ke barcode stiker tiang tumpukan fisik
                  </p>
                </div>
              </div>
            </div>

            {/* Mode Switcher: Kamera Asli vs Simulasi Cepat */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Metode Pemindaian:
              </span>
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setScannerMode("camera")}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                    scannerMode === "camera"
                      ? "bg-[#1E3D73] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                  <span>Kamera HP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScannerMode("simulation")}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
                    scannerMode === "simulation"
                      ? "bg-[#1E3D73] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  <span>Simulasi Cepat</span>
                </button>
              </div>
            </div>

            {/* Viewfinder Scanner Section */}
            {scannerMode === "camera" ? (
              <div className="mb-2">
                <QrCameraScanner
                  activeStapelId={null}
                  onScanSuccess={(code) => handleScanStapel(code)}
                />
              </div>
            ) : (
              <section className="relative w-full rounded-2xl overflow-hidden bg-slate-900 shadow-md mb-2 aspect-[16/10] flex items-center justify-center">
                {/* Background illustration warehouse */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80')",
                  }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-900/80"></div>

                {/* Viewfinder HUD / Reticle with Gold Corners */}
                <div className="relative w-52 h-36 flex items-center justify-center">
                  <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#F0A516] rounded-tl"></span>
                  <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#F0A516] rounded-tr"></span>
                  <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#F0A516] rounded-bl"></span>
                  <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#F0A516] rounded-br"></span>

                  {/* Moving Laser Beam */}
                  <div className="absolute w-full h-0.5 bg-[#F0A516] shadow-[0_0_12px_#F0A516] animate-laser"></div>

                  <div className="flex flex-col items-center justify-center gap-1">
                    <span
                      className="material-symbols-outlined text-[#F0A516] text-3xl opacity-90"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      qr_code_scanner
                    </span>
                    <span className="font-mono text-xs text-[#FFE08A] tracking-wider font-semibold">
                      SIMULASI SCAN TUMPUKAN
                    </span>
                  </div>
                </div>

                {/* Quick Stapel Simulation Selector (Only Stapels With Stock) */}
                <div className="absolute bottom-2.5 px-3 py-1 bg-[#0A1630]/90 backdrop-blur rounded-full flex items-center gap-2 border border-slate-700/60 max-w-[95%] overflow-x-auto no-scrollbar">
                  <span className="text-[10px] text-[#FFE08A] font-bold uppercase whitespace-nowrap">
                    Pilih Stok:
                  </span>
                  {stapels
                    .filter((s) => s.batches && s.batches.length > 0)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleScanStapel(s.id)}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap transition-colors bg-white/10 hover:bg-[#F0A516] hover:text-[#0F2040] text-slate-200 cursor-pointer"
                      >
                        {s.id}
                      </button>
                    ))}
                </div>
              </section>
            )}

            {/* Input Manual Kode Stapel Fallback */}
            <div className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400 text-[20px]">
                qr_code
              </span>
              <input
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder="Atau ketik ID Stapel (misal: G1-A2)"
                className="flex-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none uppercase font-mono font-semibold"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleScanStapel(manualCodeInput);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleScanStapel(manualCodeInput)}
                className="px-3 py-1.5 bg-[#1E3D73] hover:bg-[#142A51] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Pindai
              </button>
            </div>

            {/* Locked Notice Banner */}
            <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl text-center space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[22px]">lock</span>
              </div>
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Formulir Penyaluran Terkunci
              </h4>
              <p className="text-[11px] text-amber-800 leading-relaxed max-w-sm mx-auto">
                SOP Bulog: Operator lapangan wajib berdiri di depan tiang tumpukan dan memindai QR fisik untuk memastikan komoditas yang dikeluarkan tidak tertukar.
              </p>
            </div>
          </div>
        ) : (
          /* STEP 2 & 3: FORMULIR TERBUKA KARENA QR SUDAH TERVERIFIKASI FISIK */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Verified Stapel Physical Card */}
            <section className="bg-emerald-50 rounded-2xl p-4 border-2 border-emerald-300 shadow-sm space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[22px]">verified</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-950">
                        {currentStapel.id}
                      </span>
                      <span className="px-2 py-0.2 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                        Terverifikasi Fisik
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 truncate">
                      {currentStapel.gudang} • Blok {currentStapel.block || currentStapel.row || "A"}, No. {currentStapel.number || currentStapel.col || "1"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsStapelScanned(false)}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-[11px] font-bold whitespace-nowrap flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span>
                  <span>Ganti Stapel</span>
                </button>
              </div>

              <div className="pt-2 border-t border-emerald-200/70 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">Stok Tersimpan di Stapel:</span>
                <span className="font-mono font-bold text-emerald-950">
                  {currentTotalKoli.toLocaleString("id-ID")} Koli ({occupancyPercent}% Kapasitas)
                </span>
              </div>
            </section>

            {/* Batch Selection with FIFO Engine */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-[#0A1630]">Pilih Batch Pengeluaran</h3>
                  <p className="text-[11px] text-slate-500">
                    Sistem otomatis merekomendasikan batch yang disimpan paling lama
                  </p>
                </div>
              </div>

              {(currentStapel.batches || []).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Tidak ada muatan barang di stapel ini.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sortedBatches.map((batch, index) => {
                    const agingDays = calculateAgingDays(batch.dateIn);
                    const isOldest = index === 0;
                    const isSelected = selectedBatchId === batch.id;

                    return (
                      <div
                        key={batch.id}
                        onClick={() => {
                          setSelectedBatchId(batch.id);
                          setFifoOverrideConfirmed(false);
                        }}
                        className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative ${
                          isSelected
                            ? "border-[#1E3D73] bg-[#EEF2F9]/70 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        {/* Oldest Batch Badge */}
                        {isOldest && (
                          <div className="absolute -top-2.5 right-3 bg-[#16A34A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <span className="material-symbols-outlined text-[12px]">star</span>
                            <span>Prioritas Utama (Simpan Terlama)</span>
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="font-bold text-xs text-[#0A1630] block">
                              {batch.commodityName || batch.brand}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {batch.batchNo} • {batch.brand}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold font-mono text-sm text-[#1E3D73] block">
                              {batch.koli} {batch.unit}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {(((batch.koli || 0) * (batch.weightPerUnitKg || 50)) / 1000).toFixed(1)} Ton
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                          <span className="text-slate-500 font-mono">Masuk: {String(batch.dateIn)}</span>
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                              agingDays >= 150
                                ? "bg-red-100 text-red-800 font-bold"
                                : agingDays >= 90
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {agingDays} hari simpan
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* FIFO Violation Warning */}
              {isFifoViolation && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2 text-red-700">
                    <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">
                      warning
                    </span>
                    <div className="space-y-1">
                      <p className="text-xs font-bold">Peringatan: Melewati Urutan Masa Simpan</p>
                      <p className="text-[11px] text-red-600 leading-relaxed">
                        Anda memilih <strong className="font-mono">{activeBatch?.batchNo}</strong>{" "}
                        ({calculateAgingDays(activeBatch?.dateIn)} hari simpan), padahal terdapat{" "}
                        <strong className="font-mono">{oldestBatch?.batchNo}</strong> yang lebih lama
                        disimpan ({calculateAgingDays(oldestBatch?.dateIn)} hari simpan). Prioritaskan stok lama untuk menghindari penurunan mutu pangan.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={fifoOverrideConfirmed}
                          onChange={(e) => setFifoOverrideConfirmed(e.target.checked)}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                        />
                        <span className="text-[11px] font-bold text-red-900">
                          Konfirmasi: Saya memahami risiko & tetap ingin mendahului batch ini
                        </span>
                      </label>
                      {fifoOverrideConfirmed && (
                        <input
                          type="text"
                          placeholder="Masukkan alasan otorisasi Kepala Gudang..."
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="w-full mt-2 p-2 rounded-lg border border-red-300 text-xs bg-white text-slate-800"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Outbound Detail Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] space-y-4">
              <h3 className="text-sm font-bold text-[#0A1630] pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#1E3D73]">
                  local_shipping
                </span>
                Detail Surat Perintah Muat / DO Penyaluran
              </h3>

              {/* Jumlah Koli Keluar */}
              <div className="bg-[#EEF2F9] rounded-xl p-3 border border-[#D0DAF0]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#142A51]">
                    Jumlah Koli Dikeluarkan ({activeBatch?.unit || "Karung"}) *
                  </label>
                  <span className="text-[11px] font-mono font-bold text-[#1E3D73]">
                    Maksimal: {activeBatch?.koli || 0} {activeBatch?.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setKoliToRelease(
                        Math.max(1, (parseInt(koliToRelease, 10) || 0) - 50).toString()
                      )
                    }
                    className="w-11 h-11 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    -50
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={activeBatch?.koli || 1000}
                    value={koliToRelease}
                    onChange={(e) => setKoliToRelease(e.target.value)}
                    required
                    className="flex-1 h-12 px-3 rounded-xl border border-slate-300 text-center text-lg font-mono font-bold text-[#0A1630] focus:outline-none focus:ring-2 focus:ring-[#1E3D73] bg-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setKoliToRelease(
                        Math.min(
                          activeBatch?.koli || 1000,
                          (parseInt(koliToRelease, 10) || 0) + 50
                        ).toString()
                      )
                    }
                    className="w-11 h-11 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95 flex items-center justify-center cursor-pointer"
                  >
                    +50
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 mt-2">
                  Total Tonase Keluar:{" "}
                  <strong>
                    {(
                      ((parseInt(koliToRelease, 10) || 0) * (activeBatch?.weightPerUnitKg || 50)) /
                      1000
                    ).toFixed(2)}{" "}
                    Ton
                  </strong>
                </p>
              </div>

              {/* Tujuan Distribusi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tujuan Penyaluran / Konsumen *
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Contoh: RPK Tambun / Operasi Pasar Murah"
                  required
                  className="w-full h-12 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3D73] bg-white"
                />
              </div>

              {/* Nomor DO */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor Surat Jalan DO / SPM *
                </label>
                <input
                  type="text"
                  value={suratJalan}
                  onChange={(e) => setSuratJalan(e.target.value)}
                  placeholder="DO-XXXX-XXXX"
                  required
                  className="w-full h-12 px-3 rounded-xl border border-slate-300 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3D73] bg-white"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitted || (isFifoViolation && !fifoOverrideConfirmed)}
                className={`w-full h-14 rounded-xl font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isFifoViolation && !fifoOverrideConfirmed
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-[#1E3D73] hover:bg-[#142A51] active:scale-[0.99] text-white"
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">
                  {isSubmitted ? "check_circle" : "task_alt"}
                </span>
                {isSubmitted
                  ? "Barang Berhasil Dikeluarkan!"
                  : "KONFIRMASI PENGELUARAN STOK (DO)"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
