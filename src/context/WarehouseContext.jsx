"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  INITIAL_WAREHOUSE,
  INITIAL_STAPELS,
  INITIAL_TRANSACTIONS,
  COMMODITIES,
  INITIAL_USERS,
} from "../data/initialWarehouseData";

const WarehouseContext = createContext(null);

// Initial Audit Trail Data (sesuai standar tata kelola BUMN Bulog)
const INITIAL_AUDIT_LOGS = [
  {
    id: "AUD-20261115-001",
    timestamp: "2026-11-15T08:00:12",
    user: "Budi Santoso",
    role: "operator",
    nip: "198804122012011002",
    action: "INBOUND_ENTRY",
    target: "G1-A2",
    details: "Penerimaan 200 Karung Beras Medium SPHP dari Pusat Pengadaan Karawang (SJ-CBP-2026-1115-09)",
    ipAddress: "192.168.0.115",
  },
  {
    id: "AUD-20261115-002",
    timestamp: "2026-11-15T09:14:30",
    user: "Budi Santoso",
    role: "operator",
    nip: "198804122012011002",
    action: "OUTBOUND_RELEASE",
    target: "G1-A3",
    details: "Penyaluran 100 Karung Beras SPHP ke Pasar Induk Beras Cipinang (DO-SPHP-2026-1115-12)",
    ipAddress: "192.168.0.115",
  },
  {
    id: "AUD-20261115-003",
    timestamp: "2026-11-15T10:30:00",
    user: "Hendra Wijaya",
    role: "kepala_gudang",
    nip: "197508211998031001",
    action: "BASO_GENERATE",
    target: "BA-SO/04/CISKID-01/XI/2026",
    details: "Penerbitan Dokumen Resmi Berita Acara Stock Opname Fisik Kompleks CISKID",
    ipAddress: "192.168.0.101",
  },
  {
    id: "AUD-20261115-004",
    timestamp: "2026-11-15T11:00:45",
    user: "Ahmad Fauzi",
    role: "superadmin",
    nip: "198203152006041003",
    action: "USER_CREATE",
    target: "usr-1005",
    details: "Pendaftaran akun baru operator lapangan: Siti Rahmawati (siti@bulog.co.id)",
    ipAddress: "10.0.1.5",
  },
];

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error("useWarehouse must be used within a WarehouseProvider");
  }
  return context;
};

// Helper untuk menghitung selisih hari dari tanggal sekarang
export const calculateAgingDays = (dateString) => {
  if (!dateString) return 0;
  const inDate = new Date(dateString);
  const now = new Date("2026-11-15T00:00:00"); // Mengikuti anchor waktu sekarang
  const diffTime = Math.max(0, now - inDate);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Helper status masa simpan Bulog
export const getShelfLifeStatus = (days, maxDays = 180) => {
  if (days > maxDays) {
    return {
      status: "kritis",
      label: "Melewati Batas Simpan",
      badgeColor: "bg-red-100 text-red-700 border-red-200",
      barColor: "bg-red-600",
      textColor: "text-red-700",
      icon: "error",
      isFifoPriority: true,
    };
  }
  if (days >= 150) {
    return {
      status: "prioritas",
      label: "Prioritas Salur",
      badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
      barColor: "bg-orange-500",
      textColor: "text-orange-700",
      icon: "warning",
      isFifoPriority: true,
    };
  }
  if (days >= 90) {
    return {
      status: "waspada",
      label: "Perlu Monitoring",
      badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
      barColor: "bg-amber-500",
      textColor: "text-amber-700",
      icon: "schedule",
      isFifoPriority: false,
    };
  }
  return {
    status: "optimal",
    label: "Optimal",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    barColor: "bg-emerald-500",
    textColor: "text-emerald-700",
    icon: "check_circle",
    isFifoPriority: false,
  };
};

export const WarehouseProvider = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [warehouse, setWarehouse] = useState(INITIAL_WAREHOUSE);
  const [commodities] = useState(COMMODITIES);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [activeView, setActiveView] = useState("dashboard"); // 'operator' | 'dashboard'
  const [operatorScreen, setOperatorScreen] = useState("home"); // 'home' | 'inbound' | 'outbound' | 'stapel-detail' | 'history'
  const [selectedStapelId, setSelectedStapelId] = useState("G1-A2");
  const [notificationCount, setNotificationCount] = useState(3);
  const [toastMessage, setToastMessage] = useState(null);

  // Authentication & User Management State (SSR-safe initialization)
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState(null);
  const [stapels, setStapels] = useState(INITIAL_STAPELS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [isFreezeMode, setIsFreezeMode] = useState(false);
  const [opnameRecords, setOpnameRecords] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved state from LocalStorage on client mount only (eliminates hydration mismatches)
  useEffect(() => {
    try {
      const savedUsers = localStorage.getItem("SIGAP_BULOG_USERS_V1");
      if (savedUsers) setUsers(JSON.parse(savedUsers));

      const savedAuth = localStorage.getItem("SIGAP_BULOG_AUTH_V1");
      if (savedAuth) {
        const parsedUser = JSON.parse(savedAuth);
        setCurrentUser(parsedUser);
        if (parsedUser?.role === "operator") {
          setActiveView("operator");
          setOperatorScreen("home");
        }
      }

      const savedStapels = localStorage.getItem("SIGAP_BULOG_STAPELS_V4");
      if (savedStapels) {
        const parsed = JSON.parse(savedStapels);
        if (Array.isArray(parsed) && parsed.length >= 60 && parsed[0].gudang && parsed[0].block) {
          setStapels(parsed);
        }
      }

      const savedTrans = localStorage.getItem("SIGAP_BULOG_TRANSACTIONS_V4");
      if (savedTrans) setTransactions(JSON.parse(savedTrans));

      const savedAudit = localStorage.getItem("SIGAP_BULOG_AUDIT_LOGS_V1");
      if (savedAudit) setAuditLogs(JSON.parse(savedAudit));

      const savedFreeze = localStorage.getItem("SIGAP_BULOG_FREEZE_MODE_V1");
      if (savedFreeze !== null) setIsFreezeMode(savedFreeze === "true");

      const savedOpname = localStorage.getItem("SIGAP_BULOG_OPNAME_RECORDS_V1");
      if (savedOpname) setOpnameRecords(JSON.parse(savedOpname));
    } catch (e) {
      console.error("Error reading localStorage:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Sync users to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("SIGAP_BULOG_USERS_V1", JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users, isHydrated]);

  // Sync currentUser to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (currentUser) {
        localStorage.setItem("SIGAP_BULOG_AUTH_V1", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("SIGAP_BULOG_AUTH_V1");
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser, isHydrated]);

  // Sync auditLogs to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("SIGAP_BULOG_AUDIT_LOGS_V1", JSON.stringify(auditLogs));
    } catch (e) {
      console.error(e);
    }
  }, [auditLogs, isHydrated]);

  // Sync isFreezeMode & opnameRecords to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("SIGAP_BULOG_FREEZE_MODE_V1", isFreezeMode ? "true" : "false");
      localStorage.setItem("SIGAP_BULOG_OPNAME_RECORDS_V1", JSON.stringify(opnameRecords));
    } catch (e) {
      console.error(e);
    }
  }, [isFreezeMode, opnameRecords, isHydrated]);

  // Log Audit Event Helper
  const logAuditEvent = ({ action, target, details, meta = {} }) => {
    const newLog = {
      id: `AUD-${Date.now().toString().slice(-8)}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || "Sistem / Operator Lapangan",
      role: currentUser?.role || "operator",
      nip: currentUser?.nip || "-",
      action,
      target,
      details,
      ipAddress: meta.ipAddress || "192.168.0.115 (LAN Bulog)",
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    return newLog;
  };

  // Toggle Freeze Mode (Pembekuan Mutasi untuk Stock Opname)
  const toggleFreezeMode = () => {
    setIsFreezeMode((prev) => {
      const nextState = !prev;
      logAuditEvent({
        action: nextState ? "FREEZE_MODE_ACTIVATED" : "FREEZE_MODE_DEACTIVATED",
        target: "Kompleks CISKID (Seluruh Gudang)",
        details: nextState
          ? "Pembekuan mutasi fisik diaktifkan untuk memulai sesi Stock Opname Bulog."
          : "Pembekuan mutasi dinonaktifkan. Mutasi keluar/masuk kembali beroperasi normal.",
      });
      showToast(
        nextState
          ? "Sesi Stock Opname Aktif! Seluruh mutasi barang masuk & keluar dibekukan sementara."
          : "Sesi Stock Opname Selesai. Pembekuan mutasi telah dibuka kembali.",
        nextState ? "warning" : "success"
      );
      return nextState;
    });
  };

  // Record Stapel Opname (Kalkulator Tumpukan Karung Bulog)
  const recordStapelOpname = ({
    stapelId,
    layerCount = 0,
    perLayerKoli = 0,
    peakKoli = 0,
    damagedKoli = 0,
    note = "",
  }) => {
    const stapel = stapels.find((s) => s.id === stapelId);
    const bookKoli = stapel ? stapel.batches.reduce((sum, b) => sum + (b.koli || 0), 0) : 0;
    
    // Formula Kalkulator Bulog:
    // Fisik = (Jumlah Lapis * Isi per Lapis) + Kunci Puncak - Rusak/Ceceran
    const layers = Number(layerCount) || 0;
    const perLayer = Number(perLayerKoli) || 0;
    const peak = Number(peakKoli) || 0;
    const damaged = Number(damagedKoli) || 0;
    const physicalKoli = Math.max(0, (layers * perLayer) + peak - damaged);
    const variance = physicalKoli - bookKoli;
    
    let varianceStatus = "match";
    if (variance < 0) varianceStatus = "shortage"; // Kurang
    else if (variance > 0) varianceStatus = "surplus";  // Lebih

    const record = {
      stapelId,
      gudang: stapel?.gudang || "Gudang 1",
      block: stapel?.block || "A",
      number: stapel?.number || 1,
      bookKoli,
      physicalKoli,
      variance,
      varianceStatus,
      layerCount: layers,
      perLayerKoli: perLayer,
      peakKoli: peak,
      damagedKoli: damaged,
      note,
      verifiedAt: new Date().toISOString(),
      verifiedBy: currentUser?.name || "Budi Santoso",
      verifiedNip: currentUser?.nip || "198804122012011002",
    };

    setOpnameRecords((prev) => ({
      ...prev,
      [stapelId]: record,
    }));

    logAuditEvent({
      action: "OPNAME_STAPEL_VERIFY",
      target: stapelId,
      details: `Penghitungan fisik tumpukan ${stapelId}: Fisik ${physicalKoli} koli vs Buku ${bookKoli} koli (Selisih: ${variance >= 0 ? "+" : ""}${variance}). Status: ${varianceStatus.toUpperCase()}.`,
    });

    showToast(
      `Hasil opname ${stapelId} tercatat: ${physicalKoli} koli (${variance === 0 ? "Sesuai" : variance < 0 ? `Selisih Kurang ${Math.abs(variance)}` : `Selisih Lebih +${variance}`}).`,
      variance === 0 ? "success" : "warning"
    );

    return record;
  };

  // Reset Sesi Stock Opname
  const resetOpnameSession = () => {
    setOpnameRecords({});
    localStorage.removeItem("SIGAP_BULOG_OPNAME_RECORDS_V1");
    logAuditEvent({
      action: "OPNAME_SESSION_RESET",
      target: "Sesi Stock Opname",
      details: "Seluruh catatan hitung fisik opname direset ulang untuk sesi baru.",
    });
    showToast("Catatan sesi stock opname berhasil direset.", "info");
  };

  // Login handler
  const login = (emailOrNip, password) => {
    const trimmed = (emailOrNip || "").trim().toLowerCase();
    const trimmedPass = (password || "").trim();

    const user = users.find((u) => {
      const emailLower = (u.email || "").toLowerCase();
      const nipClean = (u.nip || "").replace(/\s+/g, "");
      const targetClean = trimmed.replace(/\s+/g, "");
      const emailMatch = emailLower === trimmed || emailLower.startsWith(trimmed + "@");
      const nipMatch = nipClean === targetClean;
      const nameMatch = (u.name || "").toLowerCase() === trimmed;
      const passMatch = (u.password || "").trim() === trimmedPass;

      return (emailMatch || nipMatch || nameMatch) && passMatch;
    });

    if (!user) {
      return { success: false, message: "Email/NIP atau kata sandi tidak sesuai." };
    }

    if (user.status === "nonaktif") {
      return {
        success: false,
        message: "Akun ini telah dinonaktifkan. Silakan hubungi Administrator.",
      };
    }

    const updatedUser = {
      ...user,
      lastLogin: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setCurrentUser(updatedUser);

    // Save synchronously to localStorage immediately to avoid navigation race condition
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("SIGAP_BULOG_AUTH_V1", JSON.stringify(updatedUser));
      } catch (e) {
        console.warn("Storage error", e);
      }
    }

    setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));

    logAuditEvent({
      action: "USER_LOGIN",
      target: user.email,
      details: `Pengguna ${user.name} (${user.role}) berhasil masuk ke sistem SIGAP Bulog.`,
    });

    // Set default screen based on role with Next.js router navigation
    if (user.role === "operator") {
      setActiveView("operator");
      setOperatorScreen("home");
      try {
        router.push("/operator");
      } catch (e) {
        console.warn(e);
      }
    } else {
      setActiveView("dashboard");
      try {
        router.push("/dashboard");
      } catch (e) {
        console.warn(e);
      }
    }

    showToast(`Selamat datang kembali, ${user.name}!`, "success");
    return { success: true, user: updatedUser };
  };

  const logout = () => {
    logAuditEvent({
      action: "USER_LOGOUT",
      target: currentUser?.email || "Akun Aktif",
      details: `Pengguna ${currentUser?.name || "User"} (${currentUser?.role || "operator"}) keluar dari sesi.`,
    });
    setCurrentUser(null);
    showToast("Anda telah keluar dari sistem.", "info");
    try {
      router.push("/login");
    } catch (e) {
      console.warn(e);
    }
  };

  // Router-aware screen navigation for operators
  const handleSetOperatorScreen = (screen, stapelId = null) => {
    setOperatorScreen(screen);
    try {
      if (screen === "inbound") router.push("/operator/inbound");
      else if (screen === "outbound") router.push("/operator/outbound");
      else if (screen === "history") router.push("/operator/history");
      else if (screen === "stapel-detail") {
        const id = stapelId || selectedStapelId || "G1-A2";
        router.push(`/operator/stapel/${id}`);
      } else {
        router.push("/operator");
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Router-aware view switcher (dashboard vs operator)
  const handleSetActiveView = (view) => {
    setActiveView(view);
    try {
      if (view === "operator") router.push("/operator");
      else router.push("/dashboard");
    } catch (e) {
      console.warn(e);
    }
  };

  // Sync internal state when URL pathname changes (e.g. browser back/forward or direct link)
  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/operator")) {
      setActiveView("operator");
      if (pathname.includes("/inbound")) setOperatorScreen("inbound");
      else if (pathname.includes("/outbound")) setOperatorScreen("outbound");
      else if (pathname.includes("/history")) setOperatorScreen("history");
      else if (pathname.includes("/stapel")) setOperatorScreen("stapel-detail");
      else setOperatorScreen("home");
    } else if (pathname.startsWith("/dashboard")) {
      setActiveView("dashboard");
    }
  }, [pathname]);

  const addUser = (userData) => {
    const newUser = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      name: userData.name,
      email: userData.email,
      nip: userData.nip || "-",
      password: userData.password || "bulog123",
      role: userData.role || "operator",
      unitGudang: userData.unitGudang || "GBB CISKID",
      status: "aktif",
      lastLogin: "Belum pernah",
    };
    setUsers((prev) => [newUser, ...prev]);
    logAuditEvent({
      action: "USER_CREATE",
      target: newUser.email,
      details: `Pembuatan akun baru: ${newUser.name} (${newUser.role}, NIP: ${newUser.nip}, Unit: ${newUser.unitGudang}).`,
    });
    showToast(`Akun ${newUser.name} berhasil ditambahkan.`, "success");
    return newUser;
  };

  const updateUser = (userId, updates) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => ({ ...prev, ...updates }));
    }
    logAuditEvent({
      action: "USER_UPDATE",
      target: userId,
      details: `Pembaruan data akun: ${JSON.stringify(updates)}.`,
    });
    showToast("Perubahan akun berhasil disimpan.", "success");
  };

  const toggleUserStatus = (userId) => {
    let changedName = "";
    let nextStatus = "";
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          nextStatus = u.status === "aktif" ? "nonaktif" : "aktif";
          changedName = u.name;
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );
    logAuditEvent({
      action: "USER_STATUS_CHANGE",
      target: userId,
      details: `Status akun ${changedName} diubah menjadi: ${nextStatus}.`,
    });
    showToast("Status akun berhasil diperbarui.", "info");
  };

  const deleteUser = (userId) => {
    const targetUser = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    logAuditEvent({
      action: "USER_DELETE",
      target: userId,
      details: `Penghapusan akun: ${targetUser?.name || userId} (${targetUser?.email || "-"}).`,
    });
    showToast("Akun berhasil dihapus.", "info");
  };

  // Sync state to LocalStorage (guarded with isHydrated)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("SIGAP_BULOG_STAPELS_V4", JSON.stringify(stapels));
    } catch (e) {
      console.error(e);
    }
  }, [stapels, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem("SIGAP_BULOG_TRANSACTIONS_V4", JSON.stringify(transactions));
    } catch (e) {
      console.error(e);
    }
  }, [transactions, isHydrated]);

  // Trigger Toast Notification
  const showToast = (message, type = "success") => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Toggle Online/Offline
  const toggleOnlineMode = () => {
    setIsOnline((prev) => {
      const nextState = !prev;
      if (nextState && offlineQueue.length > 0) {
        showToast(
          `Koneksi pulih. Berhasil mensinkronkan ${offlineQueue.length} transaksi offline ke server Bulog!`,
          "success"
        );
        setOfflineQueue([]);
      } else if (!nextState) {
        showToast("Mode Offline aktif. Transaksi akan disimpan di memori lokal HP.", "warning");
      }
      return nextState;
    });
  };

  // Hitung total koli dalam stapel & update status otomatis
  const recalculateStapelStatus = (batches, capacity = 1000) => {
    const totalKoli = batches.reduce((sum, b) => sum + (Number(b.koli) || 0), 0);
    if (totalKoli === 0) return "kosong";
    if (totalKoli >= capacity * 0.8) return "penuh";
    return "sebagian";
  };

  // 1. TAMBAH BARANG MASUK (INBOUND)
  const addInboundGoods = ({
    stapelId,
    commodityId,
    brand,
    koli,
    unit = "Karung",
    weightPerUnitKg = 50,
    dateIn = "2026-11-15",
    expiryDate = "",
    origin = "",
    suratJalan = "",
    kondisi = "Baik",
    notes = "",
    operator = "Budi Santoso",
  }) => {
    const commodity = commodities.find((c) => c.id === commodityId) || {
      name: commodityId,
    };
    const koliNum = parseInt(koli, 10);
    const weightNum = parseFloat(weightPerUnitKg) || 50;

    const newBatch = {
      id: `batch-${Date.now().toString().slice(-4)}`,
      batchNo: `Batch #${Math.floor(Math.random() * 80) + 10}`,
      commodityId,
      commodityName: commodity.name,
      brand: brand || commodity.name,
      koli: koliNum,
      unit,
      weightPerUnitKg: weightNum,
      dateIn: dateIn || "2026-11-15",
      expiryDate,
      origin: origin || "Pusat Pengadaan Bulog",
      suratJalan: suratJalan || `SJ-${Date.now().toString().slice(-6)}`,
      kondisi,
      notes,
    };

    setStapels((prevStapels) =>
      prevStapels.map((stapel) => {
        if (stapel.id === stapelId) {
          const updatedBatches = [...stapel.batches, newBatch];
          return {
            ...stapel,
            batches: updatedBatches,
            status: recalculateStapelStatus(updatedBatches, stapel.capacityKoli),
          };
        }
        return stapel;
      })
    );

    const newTransaction = {
      id: `TRX-${Date.now().toString().slice(-8)}`,
      type: "MASUK",
      stapelId,
      commodityName: commodity.name,
      brand: newBatch.brand,
      koli: koliNum,
      unit,
      weightPerUnitKg: weightNum,
      totalKg: koliNum * weightNum,
      operator,
      suratJalan: newBatch.suratJalan,
      sourceOrDest: origin || "Pemasok Bulog",
      timestamp: new Date().toISOString(),
      isOffline: !isOnline,
      notes: notes || "Penerimaan komoditas gudang",
    };

    setTransactions((prev) => [newTransaction, ...prev]);

    logAuditEvent({
      action: "INBOUND_ENTRY",
      target: stapelId,
      details: `Penerimaan ${koliNum} ${unit} ${commodity.name} (${brand || commodity.name}) di ${stapelId}. Surat Jalan: ${newBatch.suratJalan}, Asal: ${newBatch.origin}. Keterangan: ${notes || "-"}`,
    });

    if (!isOnline) {
      setOfflineQueue((prev) => [...prev, newTransaction]);
      showToast(
        `[Offline] ${koliNum} ${unit} ${commodity.name} dicatat di ${stapelId}. Akan disinkron saat online.`,
        "warning"
      );
    } else {
      showToast(
        `Sukses! ${koliNum} ${unit} ${commodity.name} berhasil disimpan di ${stapelId}.`,
        "success"
      );
    }

    return newBatch;
  };

  // 2. KELUARKAN BARANG (OUTBOUND DENGAN VALIDASI FIFO)
  const releaseOutboundGoods = ({
    stapelId,
    batchId,
    koliToRelease,
    destination = "",
    suratJalan = "",
    operator = "Budi Santoso",
    notes = "",
  }) => {
    const koliNum = parseInt(koliToRelease, 10);
    let releasedCommodity = "";
    let releasedBrand = "";
    let weightPerUnit = 50;
    let releasedUnit = "Karung";

    setStapels((prevStapels) =>
      prevStapels.map((stapel) => {
        if (stapel.id !== stapelId) return stapel;

        const updatedBatches = stapel.batches
          .map((batch) => {
            if (batch.id === batchId) {
              releasedCommodity = batch.commodityName;
              releasedBrand = batch.brand;
              weightPerUnit = batch.weightPerUnitKg;
              releasedUnit = batch.unit;
              const remainingKoli = batch.koli - koliNum;
              return {
                ...batch,
                koli: Math.max(0, remainingKoli),
              };
            }
            return batch;
          })
          .filter((batch) => batch.koli > 0); // Hapus batch jika habis

        return {
          ...stapel,
          batches: updatedBatches,
          status: recalculateStapelStatus(updatedBatches, stapel.capacityKoli),
        };
      })
    );

    const newTransaction = {
      id: `TRX-${Date.now().toString().slice(-8)}`,
      type: "KELUAR",
      stapelId,
      commodityName: releasedCommodity || "Komoditas Bulog",
      brand: releasedBrand,
      koli: koliNum,
      unit: releasedUnit,
      weightPerUnitKg: weightPerUnit,
      totalKg: koliNum * weightPerUnit,
      operator,
      suratJalan: suratJalan || `DO-${Date.now().toString().slice(-6)}`,
      sourceOrDest: destination || "Distribusi Pangan Bulog",
      timestamp: new Date().toISOString(),
      isOffline: !isOnline,
      notes: notes || "Pengeluaran stok penyaluran gudang",
    };

    setTransactions((prev) => [newTransaction, ...prev]);

    logAuditEvent({
      action: "OUTBOUND_RELEASE",
      target: stapelId,
      details: `Penyaluran ${koliNum} ${releasedUnit} ${releasedCommodity} (${releasedBrand || "Bulog"}) dari ${stapelId}. No. DO: ${newTransaction.suratJalan}, Tujuan: ${newTransaction.sourceOrDest}. Keterangan: ${notes || "-"}`,
    });

    if (!isOnline) {
      setOfflineQueue((prev) => [...prev, newTransaction]);
      showToast(
        `[Offline] ${koliNum} ${releasedUnit} dikeluarkan dari ${stapelId}.`,
        "warning"
      );
    } else {
      showToast(
        `Sukses! ${koliNum} ${releasedUnit} ${releasedCommodity} berhasil dikeluarkan dari ${stapelId}.`,
        "success"
      );
    }
  };

  // Reset Data to Factory Default
  const resetToFactoryData = () => {
    setStapels(INITIAL_STAPELS);
    setTransactions(INITIAL_TRANSACTIONS);
    setOfflineQueue([]);
    localStorage.removeItem("SIGAP_BULOG_STAPELS");
    localStorage.removeItem("SIGAP_BULOG_STAPELS_V2");
    localStorage.removeItem("SIGAP_BULOG_STAPELS_V3");
    localStorage.removeItem("SIGAP_BULOG_STAPELS_V4");
    localStorage.removeItem("SIGAP_BULOG_TRANSACTIONS");
    localStorage.removeItem("SIGAP_BULOG_TRANSACTIONS_V3");
    localStorage.removeItem("SIGAP_BULOG_TRANSACTIONS_V4");
    localStorage.setItem("SIGAP_BULOG_STAPELS_V4", JSON.stringify(INITIAL_STAPELS));
    localStorage.setItem("SIGAP_BULOG_TRANSACTIONS_V4", JSON.stringify(INITIAL_TRANSACTIONS));
    setStapels(INITIAL_STAPELS);
    setTransactions(INITIAL_TRANSACTIONS);
    showToast("Data prototype berhasil direset ke data awal Kompleks CISKID.", "info");
  };

  // Ringkasan Agregat Gudang
  const warehouseStats = React.useMemo(() => {
    let totalKoli = 0;
    let totalTonase = 0;
    let stapelOccupied = 0;
    let fifoWarnings = 0;
    let criticalItems = 0;

    const commoditySummary = {};

    stapels.forEach((stapel) => {
      const stapelKoli = stapel.batches.reduce((sum, b) => sum + b.koli, 0);
      if (stapelKoli > 0) {
        stapelOccupied += 1;
      }

      stapel.batches.forEach((b) => {
        const koli = b.koli || 0;
        const weightKg = b.weightPerUnitKg || 50;
        const tonase = (koli * weightKg) / 1000;

        totalKoli += koli;
        totalTonase += tonase;

        // FIFO checks
        const agingDays = calculateAgingDays(b.dateIn);
        if (agingDays >= 150) {
          fifoWarnings += 1;
        }
        if (agingDays > 180) {
          criticalItems += 1;
        }

        // Summary per komoditas
        if (!commoditySummary[b.commodityName]) {
          commoditySummary[b.commodityName] = {
            name: b.commodityName,
            koli: 0,
            tonase: 0,
            unit: b.unit,
          };
        }
        commoditySummary[b.commodityName].koli += koli;
        commoditySummary[b.commodityName].tonase += tonase;
      });
    });

    return {
      totalKoli,
      totalTonase: parseFloat(totalTonase.toFixed(1)),
      stapelOccupied,
      totalStapels: stapels.length,
      occupancyPercentage: Math.round((stapelOccupied / stapels.length) * 100),
      fifoWarnings,
      criticalItems,
      commoditySummary: Object.values(commoditySummary),
    };
  }, [stapels]);

  return (
    <WarehouseContext.Provider
      value={{
        warehouse,
        stapels,
        commodities,
        transactions,
        isOnline,
        offlineQueue,
        activeView,
        setActiveView: handleSetActiveView,
        operatorScreen,
        setOperatorScreen: handleSetOperatorScreen,
        router,
        pathname,
        selectedStapelId,
        setSelectedStapelId,
        notificationCount,
        toastMessage,
        warehouseStats,
        toggleOnlineMode,
        addInboundGoods,
        currentUser,
        users,
        login,
        logout,
        addUser,
        updateUser,
        toggleUserStatus,
        deleteUser,
        releaseOutboundGoods,
        resetToFactoryData,
        showToast,
        auditLogs,
        logAuditEvent,
        isFreezeMode,
        toggleFreezeMode,
        opnameRecords,
        recordStapelOpname,
        resetOpnameSession,
      }}
    >
      {children}
    </WarehouseContext.Provider>
  );
};
