"use client";

import React, { useState } from "react";
import { useWarehouse } from "../../context/WarehouseContext";

export const LoginPage: React.FC = () => {
  const { login } = useWarehouse();
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage("");

    const cleanId = (identifier || "").trim();
    const cleanPass = (password || "").trim();

    if (!cleanId || !cleanPass) {
      setErrorMessage("Silakan masukkan Email/NIP dan kata sandi.");
      return;
    }

    setIsLoading(true);
    setTimeout(async () => {
      const res = await login(cleanId, cleanPass);
      setIsLoading(false);
      if (!res || !res.success) {
        setErrorMessage(res?.message || "Gagal masuk. Periksa kembali akun Anda.");
      } else {
        const dest = res.user?.role === "operator" ? "/operator" : "/dashboard";
        if (typeof window !== "undefined") {
          window.location.href = dest;
        }
      }
    }, 150);
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setErrorMessage("");
    setIsLoading(true);
    setTimeout(async () => {
      const res = await login(email, pass);
      setIsLoading(false);
      if (res && res.success) {
        const dest = res.user?.role === "operator" ? "/operator" : "/dashboard";
        if (typeof window !== "undefined") {
          window.location.href = dest;
        }
      } else if (res && !res.success) {
        setErrorMessage(res.message);
      }
    }, 150);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#071328] via-[#0A1A3B] to-[#0D2452] flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans text-slate-100">
      {/* Top Bar Branding */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0A516] text-[#0A1630] font-black text-xl flex items-center justify-center font-mono shadow-lg shadow-[#F0A516]/20">
            B
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block">
              SIGAP BULOG
            </span>
            <span className="text-[11px] text-blue-200">
              Sistem Informasi Pergudangan & Stock Opname
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-blue-200/80 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Server Cloud Bulog Aktif</span>
        </div>
      </header>

      {/* Main Login Center Card */}
      <main className="flex-1 flex items-center justify-center my-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-800 border border-slate-100 relative">
          {/* Badge Portal */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#EEF2F9] text-[#1E3D73] mb-3 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">lock</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0A1630] tracking-tight">
              Masuk ke SIGAP
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan NIP atau Email resmi Perum BULOG Anda
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-red-600 flex-shrink-0">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Login */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            action="javascript:void(0)"
            method="POST"
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email atau NIP Bulog
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">
                  badge
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin@bulog.co.id / NIP"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1E3D73] focus:ring-2 focus:ring-[#1E3D73]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Kata Sandi</label>
                <span className="text-[11px] text-slate-400 hover:text-[#1E3D73] cursor-pointer">
                  Lupa sandi?
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">
                  key
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1E3D73] focus:ring-2 focus:ring-[#1E3D73]/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#1E3D73] hover:bg-[#162D55] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#1E3D73]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Picker */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-3">
              Pilihan Login Cepat (Uji Coba Hak Akses):
            </p>
            <div className="grid grid-cols-1 gap-2">
              {/* Superadmin Button */}
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@bulog.co.id", "admin123")}
                className="w-full p-2.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/80 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    SA
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-purple-950">Superadmin</span>
                      <span className="text-[9px] bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded font-mono font-bold">
                        Kelola Akun
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-700">admin@bulog.co.id (Akses Penuh)</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-purple-400 group-hover:text-purple-700 text-[18px]">
                  login
                </span>
              </button>

              {/* Kepala Gudang Button */}
              <button
                type="button"
                onClick={() => handleQuickLogin("hendra@bulog.co.id", "bulog123")}
                className="w-full p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1E3D73] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    KG
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-blue-950">Kepala Gudang</span>
                      <span className="text-[9px] bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded font-mono font-bold">
                        CISKID
                      </span>
                    </div>
                    <p className="text-[10px] text-blue-700">hendra@bulog.co.id (Denah & BASO)</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-blue-400 group-hover:text-blue-700 text-[18px]">
                  login
                </span>
              </button>

              {/* Operator Button */}
              <button
                type="button"
                onClick={() => handleQuickLogin("budi@bulog.co.id", "operator123")}
                className="w-full p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0A516] text-[#0F2040] flex items-center justify-center font-bold text-xs shadow-xs">
                    OP
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-amber-950">Operator Lapangan</span>
                      <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-mono font-bold">
                        Mobile QR
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-700">budi@bulog.co.id (Inbound & Outbound)</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-amber-500 group-hover:text-amber-800 text-[18px]">
                  login
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-blue-200/60 py-2">
        <p>© 2026 Perusahaan Umum (Perum) BULOG. Hak Cipta Dilindungi Undang-Undang.</p>
        <p className="text-[10px] text-blue-200/40 mt-0.5">
          SIGAP BULOG • Terintegrasi Kantor Pusat & Divisi Regional
        </p>
      </footer>
    </div>
  );
};
