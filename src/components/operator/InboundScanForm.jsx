"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { useWarehouse } from "../../context/WarehouseContext";
import { OperatorHeader } from "./OperatorHeader";
import { QrCameraScanner } from "../common/QrCameraScanner";
import { CustomSelect } from "../common/CustomSelect";

export const InboundScanForm = () => {
  const {
    stapels,
    commodities,
    addInboundGoods,
    setOperatorScreen,
    selectedStapelId,
    setSelectedStapelId,
    isFreezeMode,
  } = useWarehouse();

  // Selected stapel for scanning
  const [currentStapelId, setCurrentStapelId] = useState(selectedStapelId || "G1-A2");
  const [scannerMode, setScannerMode] = useState("camera"); // 'camera' | 'simulation'

  // Form states
  const [commodityId, setCommodityId] = useState("beras-medium");
  const [brand, setBrand] = useState("SPHP Bulog CBP");
  const [unit, setUnit] = useState("Karung");
  const [weightPerUnitKg, setWeightPerUnitKg] = useState("50");
  const [koli, setKoli] = useState("200");
  const [dateIn, setDateIn] = useState("2026-11-15");
  const [expiryDate, setExpiryDate] = useState("");
  const [origin, setOrigin] = useState("Pusat Pengadaan Karawang");
  const [suratJalan, setSuratJalan] = useState("SJ-CBP-2026-1115-09");
  const [kondisi, setKondisi] = useState("Baik");
  const [notes, setNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const selectedStapel = stapels.find((s) => s.id === currentStapelId) || stapels[0];
  const currentTotalKoli = selectedStapel.batches.reduce((sum, b) => sum + b.koli, 0);
  const capacity = selectedStapel.capacityKoli || 1000;
  const occupancyPercent = Math.min(100, Math.round((currentTotalKoli / capacity) * 100));

  // Change commodity defaults
  const handleCommodityChange = (e) => {
    const selectedId = e.target.value;
    setCommodityId(selectedId);
    const comm = commodities.find((c) => c.id === selectedId);
    if (comm) {
      setUnit(comm.defaultUnit);
      setWeightPerUnitKg(comm.defaultWeight.toString());
      if (comm.id === "beras-medium") setBrand("SPHP Bulog CBP");
      else if (comm.id === "beras-premium") setBrand("Beras Kita Premium 50kg");
      else if (comm.id === "minyakita-jerigen") setBrand("Minyakita Jerigen 5L");
      else if (comm.id === "gula-maniskita") setBrand("Manis Kita 50kg");
      else if (comm.id === "tepung-terigukita") setBrand("Kita Terigu Serbaguna");
    }
  };

  const handleSimulateScan = (stapelId) => {
    setCurrentStapelId(stapelId);
    setSelectedStapelId(stapelId);
    try {
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    } catch {}
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFreezeMode) {
      alert("Mutasi barang masuk ditangguhkan sementara karena Sesi Stock Opname sedang berlangsung.");
      return;
    }

    if (!koli || parseInt(koli, 10) <= 0) {
      alert("Masukkan jumlah koli yang valid.");
      return;
    }

    addInboundGoods({
      stapelId: currentStapelId,
      commodityId,
      brand,
      koli,
      unit,
      weightPerUnitKg,
      dateIn,
      expiryDate,
      origin,
      suratJalan,
      kondisi,
      notes,
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

  const totalCalculatedKg = (parseInt(koli, 10) || 0) * (parseFloat(weightPerUnitKg) || 0);

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#0D1C2E] flex flex-col pb-12">
      <OperatorHeader
        title="Form Input Masuk"
        showBack={true}
        onBack={() => setOperatorScreen("home")}
      />

      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-20 pb-8">
        {/* Freeze Mode Warning Banner */}
        {isFreezeMode && (
          <div className="mb-4 p-3 bg-red-600 text-white rounded-2xl shadow-md flex items-center gap-3 text-xs font-bold animate-pulse">
            <span className="material-symbols-outlined text-[24px] flex-shrink-0">lock</span>
            <div>
              <p>Sesi Stock Opname Aktif (Mutasi Dibekukan)</p>
              <p className="text-[10px] font-normal text-red-100">
                Penerimaan barang baru sementara dikunci sampai penghitungan fisik opname selesai.
              </p>
            </div>
          </div>
        )}

        {/* Mode Switcher: Kamera Asli vs Simulasi Cepat */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Deteksi QR Stapel:
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
          <div className="mb-4">
            <QrCameraScanner
              activeStapelId={currentStapelId}
              onScanSuccess={(code) => handleSimulateScan(code)}
            />
          </div>
        ) : (
          <section className="relative w-full rounded-2xl overflow-hidden bg-slate-900 shadow-md mb-4 aspect-[16/10] flex items-center justify-center">
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
                  SIMULASI SCAN STAPEL
                </span>
              </div>
            </div>

            {/* Quick Stapel Simulation Selector */}
            <div className="absolute bottom-2.5 px-3 py-1 bg-[#0A1630]/90 backdrop-blur rounded-full flex items-center gap-2 border border-slate-700/60 max-w-[90%] overflow-x-auto no-scrollbar">
              <span className="text-[10px] text-[#FFE08A] font-bold uppercase whitespace-nowrap">
                Pilih:
              </span>
              {["G1-A1", "G1-A2", "G1-A3", "G1-B1", "G1-B3", "G1-C2"].map((sid) => (
                <button
                  key={sid}
                  type="button"
                  onClick={() => handleSimulateScan(sid)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap transition-colors ${
                    currentStapelId === sid
                      ? "bg-[#F0A516] text-[#0F2040]"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {sid}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Detected Stapel Card (Scan Result) */}
        <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] mb-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                <span className="material-symbols-outlined text-[22px]">inventory_2</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Lokasi Stapel Terdeteksi
                </span>
                <h2 className="text-base font-bold text-[#0A1630] flex items-center gap-2">
                  Stapel{" "}
                  <span className="font-mono text-sm px-2 py-0.5 rounded bg-[#EEF2F9] text-[#1E3D73] font-bold">
                    {selectedStapel.id}
                  </span>
                </h2>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedStapel.status === "kosong"
                    ? "bg-[#DCFCE7] text-[#15803D]"
                    : selectedStapel.status === "penuh"
                    ? "bg-[#FEE2E2] text-[#DC2626]"
                    : "bg-[#FFF8E7] text-[#8C5D08]"
                }`}
              >
                {selectedStapel.status === "kosong"
                  ? "Kosong / Siap Muat"
                  : selectedStapel.status === "penuh"
                  ? "Kapasitas Penuh"
                  : "Terisi Sebagian"}
              </span>
              <p className="font-mono text-xs text-slate-500 mt-1">
                {currentTotalKoli} / {capacity} koli ({occupancyPercent}%)
              </p>
            </div>
          </div>

          {/* Capacity Progress Bar */}
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
          <p className="text-[11px] text-slate-500 mt-2">
            Lokasi: {selectedStapel.gudang} • Blok {selectedStapel.block || selectedStapel.row}, No. {selectedStapel.number || selectedStapel.col} • Kompleks CISKID
          </p>
        </section>

        {/* Inbound Entry Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-[#0A1630] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#1E3D73]">
                edit_note
              </span>
              Rincian Muatan Baru
            </h3>
            <span className="text-[11px] text-slate-400">* Wajib Diisi</span>
          </div>

          {/* Komoditas Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Jenis Komoditas Bulog *
            </label>
            <CustomSelect
              value={commodityId}
              onChange={handleCommodityChange}
              options={commodities.map((c) => ({
                value: c.id,
                label: c.name,
                badge: c.defaultUnit,
              }))}
              icon="inventory_2"
              placeholder="Pilih Komoditas..."
            />
          </div>

          {/* Merk / Brand */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Merk / Varian Kemasan *
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Contoh: SPHP Bulog CBP / Beras Kita"
              required
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3D73] focus:border-transparent"
            />
          </div>

          {/* Satuan & Berat */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Satuan</label>
              <CustomSelect
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                options={[
                  { value: "Karung", label: "Karung (Bag)" },
                  { value: "Jerigen", label: "Jerigen" },
                  { value: "Dos", label: "Dos / Box" },
                ]}
                icon="straighten"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Berat / Unit (Kg)
              </label>
              <input
                type="number"
                step="0.5"
                value={weightPerUnitKg}
                onChange={(e) => setWeightPerUnitKg(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3D73]"
              />
            </div>
          </div>

          {/* Jumlah Koli & Instant Tonase Calc */}
          <div className="bg-[#EEF2F9] rounded-xl p-3 border border-[#D0DAF0]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#142A51]">
                Jumlah Muatan Diterima ({unit}) *
              </label>
              <span className="text-[11px] font-mono font-bold text-[#1E3D73]">
                Total: {(totalCalculatedKg / 1000).toFixed(2)} Ton
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setKoli(Math.max(1, (parseInt(koli, 10) || 0) - 50).toString())}
                className="w-11 h-11 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95 flex items-center justify-center"
              >
                -50
              </button>
              <input
                type="number"
                min="1"
                value={koli}
                onChange={(e) => setKoli(e.target.value)}
                required
                className="flex-1 h-12 px-3 rounded-xl border border-slate-300 text-center text-lg font-mono font-bold text-[#0A1630] focus:outline-none focus:ring-2 focus:ring-[#1E3D73]"
              />
              <button
                type="button"
                onClick={() => setKoli(((parseInt(koli, 10) || 0) + 50).toString())}
                className="w-11 h-11 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 active:scale-95 flex items-center justify-center"
              >
                +50
              </button>
            </div>
            <p className="text-[11px] text-slate-600 mt-2">
              Kapasitas sisa stapel:{" "}
              <strong className="text-slate-900">
                {Math.max(0, capacity - currentTotalKoli)} {unit}
              </strong>
            </p>
          </div>

          {/* Tanggal Masuk & Tanggal Kadaluarsa (Opsional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tanggal Masuk *
              </label>
              <input
                type="date"
                value={dateIn}
                onChange={(e) => setDateIn(e.target.value)}
                required
                className="w-full h-12 px-3 rounded-xl border border-slate-300 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3D73]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Exp. Date (Opsional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full h-12 px-3 rounded-xl border border-slate-300 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3D73]"
              />
            </div>
          </div>

          {/* Asal Barang & No. Surat Jalan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Asal / Pemasok *
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Pemasok / Sentra"
                required
                className="w-full h-12 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3D73]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                No. Surat Jalan *
              </label>
              <input
                type="text"
                value={suratJalan}
                onChange={(e) => setSuratJalan(e.target.value)}
                placeholder="SJ-XXXX-XXXX"
                required
                className="w-full h-12 px-3 rounded-xl border border-slate-300 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3D73]"
              />
            </div>
          </div>

          {/* Kondisi Komoditas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Kondisi Fisik</label>
            <div className="grid grid-cols-3 gap-2">
              {["Baik", "Turun Mutu", "Rusak"].map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKondisi(k)}
                  className={`h-11 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                    kondisi === k
                      ? k === "Baik"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : k === "Turun Mutu"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-red-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Catatan Muatan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Nomor polisi truk, hasil uji kadar air laboratorium, kondisi kemasan..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3D73]"
            ></textarea>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitted}
            className="w-full h-14 bg-[#1E3D73] hover:bg-[#142A51] active:scale-[0.99] text-white rounded-xl font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isSubmitted ? "check_circle" : "save"}
            </span>
            {isSubmitted ? "Data Berhasil Disimpan!" : "SIMPAN DATA MASUK KE STAPEL"}
          </button>
        </form>
      </main>
    </div>
  );
};
