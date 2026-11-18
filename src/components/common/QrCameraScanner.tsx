"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export interface QrCameraScannerProps {
  onScanSuccess?: (decodedText: string) => void;
  onClose?: () => void;
  activeStapelId?: string | null;
}

export const QrCameraScanner: React.FC<QrCameraScannerProps> = ({
  onScanSuccess,
  onClose,
  activeStapelId = "G1-A2",
}) => {
  const [cameraState, setCameraState] = useState<"initializing" | "scanning" | "error" | "stopped">("initializing");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "bulog-html5-qr-reader";

  // Initializing Camera Scanner
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        setCameraState("initializing");
        setErrorMessage("");

        // Check if running on mobile over insecure HTTP (browsers block camera on insecure origins)
        if (
          typeof window !== "undefined" &&
          window.isSecureContext === false &&
          window.location.hostname !== "localhost" &&
          window.location.hostname !== "127.0.0.1"
        ) {
          setCameraState("error");
          setErrorMessage(
            "Browser membatasi akses kamera di jaringan HTTP lokal tanpa HTTPS. Jalankan 'npm run dev:https' untuk mengaktifkan HTTPS, atau gunakan tombol simulasi / input manual di bawah."
          );
          return;
        }

        // Check if camera devices exist
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!devices || devices.length === 0) {
          setCameraState("error");
          setErrorMessage("Tidak ada perangkat kamera yang terdeteksi di perangkat Anda.");
          return;
        }

        setCameras(devices);
        // Prefer back / environment camera on mobile phones
        const backCamera = devices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
        );
        const chosenCameraId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(chosenCameraId);

        html5QrCode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 12,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minDim * 0.72),
              height: Math.floor(minDim * 0.72),
            };
          },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          chosenCameraId,
          config,
          (decodedText: string) => {
            handleCodeScanned(decodedText);
          },
          () => {
            // Ignore ongoing frame decode misses
          }
        );

        if (isMounted) {
          setCameraState("scanning");
        }
      } catch (err: any) {
        console.warn("Camera start failed, falling back to manual/simulation:", err);
        if (isMounted) {
          setCameraState("error");
          setErrorMessage(
            err.message ||
              "Izin akses kamera ditolak atau kamera sedang digunakan aplikasi lain."
          );
        }
      }
    };

    // Small delay to ensure DOM element is ready
    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current
              .stop()
              .then(() => {
                scannerRef.current?.clear();
              })
              .catch(() => {});
          }
        } catch (e) {
          console.warn("Error stopping scanner:", e);
        }
      }
    };
  }, []);

  const handleCodeScanned = (rawCode: string) => {
    let cleanCode = (rawCode || "").trim().toUpperCase();

    // Normalisasi jika input berupa format URL atau JSON
    if (cleanCode.includes("/")) {
      const parts = cleanCode.split("/");
      cleanCode = parts[parts.length - 1];
    }
    if (cleanCode.startsWith("STAPEL-") || cleanCode.startsWith("BULOG-")) {
      cleanCode = cleanCode.replace("STAPEL-", "").replace("BULOG-", "");
    }

    // Haptic feedback jika didukung perangkat
    try {
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([40, 60, 40]);
      }
    } catch {}

    // Audio click feedback
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5)
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch {}

    if (onScanSuccess) {
      onScanSuccess(cleanCode);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleCodeScanned(manualInput);
    }
  };

  const quickStapels = ["G1-A1", "G1-A2", "G1-A3", "G1-B2", "G1-C1", "G2-A1"];

  return (
    <div className="bg-[#0A1630] text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-blue-900/60 overflow-hidden relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#F0A516] text-[#0A1630] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Pindai QR Label Tumpukan
            </h3>
            <p className="text-[10px] text-blue-200">
              Arahkan kamera ke stiker QR tiang stapel Bulog
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Main Viewfinder Box */}
      <div className="relative w-full aspect-square max-w-[340px] mx-auto rounded-2xl overflow-hidden bg-black border-2 border-white/20 shadow-inner flex items-center justify-center">
        {/* HTML5 QR Code Mount Element */}
        <div id={scannerContainerId} className="w-full h-full" />

        {/* Viewfinder Target Frame Overlay */}
        {cameraState === "scanning" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Darkened Vignette Outside Target */}
            <div className="w-[72%] h-[72%] border-2 border-[#F0A516] rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              {/* Corner Indicators */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-[#F0A516] rounded-tl" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-[#F0A516] rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-[#F0A516] rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-[#F0A516] rounded-br" />

              {/* Animated Laser Scanning Line */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#F0A516] to-transparent shadow-[0_0_8px_#F0A516] animate-pulse top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}

        {/* Loading / Initializing State */}
        {cameraState === "initializing" && (
          <div className="absolute inset-0 bg-[#0A1630]/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <span className="w-8 h-8 border-3 border-[#F0A516]/30 border-t-[#F0A516] rounded-full animate-spin mb-3" />
            <p className="text-xs font-bold text-white">Menghubungkan ke Kamera HP...</p>
            <p className="text-[10px] text-blue-200 mt-1">
              Mohon izinkan akses kamera pada browser Anda jika muncul notifikasi izin.
            </p>
          </div>
        )}

        {/* Error / Fallback State */}
        {cameraState === "error" && (
          <div className="absolute inset-0 bg-[#0F2040]/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-xs space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-[24px]">videocam_off</span>
            </div>
            <p className="font-bold text-white">Kamera Belum Aktif</p>
            <p className="text-[10px] text-slate-300 max-w-[260px] leading-relaxed">
              {errorMessage || "Kamera tidak terdeteksi atau izin belum diberikan."}
            </p>
            <p className="text-[10px] text-amber-300 font-semibold">
              Gunakan simulasi tombol stapel di bawah:
            </p>
          </div>
        )}
      </div>

      {/* Camera Status Strip & Quick Shortcuts */}
      <div className="mt-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-blue-200 px-1">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                cameraState === "scanning"
                  ? "bg-emerald-400 animate-pulse"
                  : cameraState === "initializing"
                  ? "bg-amber-400 animate-ping"
                  : "bg-red-400"
              }`}
            />
            <span>
              {cameraState === "scanning"
                ? "Kamera Aktif • Siap Scan"
                : cameraState === "initializing"
                ? "Menyiapkan Kamera..."
                : "Mode Input Manual"}
            </span>
          </span>
          <span className="font-mono text-[10px] bg-white/10 px-2 py-0.5 rounded text-white">
            {activeStapelId}
          </span>
        </div>

        {/* Quick Stapel Simulation Chips (Ensures testing works anywhere) */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Uji Coba Scan Cepat (Simulasi Lapangan):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickStapels.map((sid) => (
              <button
                key={sid}
                type="button"
                onClick={() => handleCodeScanned(sid)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  sid === activeStapelId
                    ? "bg-[#F0A516] text-[#0A1630] shadow-sm scale-105"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {sid}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Code Input Bar */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-white/10 flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2">
              qr_code
            </span>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Atau ketik ID Stapel (misal: G1-A2)"
              className="w-full pl-8 pr-3 py-1.5 bg-white/10 rounded-xl text-xs text-white placeholder:text-slate-400 border border-white/15 focus:outline-none focus:border-[#F0A516] font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-[#1E3D73] hover:bg-[#162D55] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            Pilih
          </button>
        </form>
      </div>
    </div>
  );
};
