"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  INITIAL_WAREHOUSE,
  INITIAL_STAPELS,
  INITIAL_TRANSACTIONS,
  COMMODITIES,
  INITIAL_USERS,
} from "../data/initialWarehouseData";
import {
  calculateAgingDays,
  getShelfLifeStatus,
  calculateOpnamePhysical,
  calculateVariance,
} from "../lib/calculations";

export { calculateAgingDays, getShelfLifeStatus, calculateOpnamePhysical, calculateVariance };

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
];

export const useWarehouse = () => {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error("useWarehouse must be used within a WarehouseProvider");
  }
  return context;
};

export const WarehouseProvider = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [warehouse, setWarehouse] = useState(INITIAL_WAREHOUSE);
  const [commodities, setCommodities] = useState(COMMODITIES);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [activeView, setActiveView] = useState("dashboard");
  const [operatorScreen, setOperatorScreen] = useState("home");
  const [selectedStapelId, setSelectedStapelId] = useState("G1-A2");
  const [notificationCount, setNotificationCount] = useState(3);
  const [toastMessage, setToastMessage] = useState(null);

  // Authentication & Core Data States
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState(null);
  const [stapels, setStapels] = useState(INITIAL_STAPELS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [isFreezeMode, setIsFreezeMode] = useState(false);
  const [opnameRecords, setOpnameRecords] = useState({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncingDb, setIsSyncingDb] = useState(false);

  // 1. Sinkronisasi Data Realtime dari PostgreSQL via REST API
  const refreshWarehouseData = useCallback(async () => {
    setIsSyncingDb(true);
    try {
      const [
        resWh,
        resStapels,
        resCommodities,
        resTrans,
        resAudit,
        resUsers,
        resOpname,
        resFreeze,
      ] = await Promise.allSettled([
        fetch("/api/warehouse").then((r) => r.json()),
        fetch("/api/stapels").then((r) => r.json()),
        fetch("/api/commodities").then((r) => r.json()),
        fetch("/api/inventory/transactions?limit=100").then((r) => r.json()),
        fetch("/api/audit-logs?limit=50").then((r) => r.json()),
        fetch("/api/users").then((r) => r.json()),
        fetch("/api/opname/records").then((r) => r.json()),
        fetch("/api/opname/freeze").then((r) => r.json()),
      ]);

      if (resWh.status === "fulfilled" && resWh.value?.success && resWh.value.data?.warehouse) {
        setWarehouse(resWh.value.data.warehouse);
      }

      if (resCommodities.status === "fulfilled" && resCommodities.value?.success && Array.isArray(resCommodities.value.data)) {
        setCommodities(resCommodities.value.data);
      }

      if (resStapels.status === "fulfilled" && resStapels.value?.success && Array.isArray(resStapels.value.data) && resStapels.value.data.length > 0) {
        setStapels(resStapels.value.data);
      }

      if (resTrans.status === "fulfilled" && resTrans.value?.success && Array.isArray(resTrans.value.data)) {
        setTransactions(resTrans.value.data);
      }

      if (resAudit.status === "fulfilled" && resAudit.value?.success && Array.isArray(resAudit.value.data)) {
        setAuditLogs(resAudit.value.data);
      }

      if (resUsers.status === "fulfilled" && resUsers.value?.success && Array.isArray(resUsers.value.data)) {
        setUsers(resUsers.value.data);
      }

      if (resOpname.status === "fulfilled" && resOpname.value?.success && Array.isArray(resOpname.value.data)) {
        const recordMap = {};
        resOpname.value.data.forEach((r) => {
          recordMap[r.stapelId] = r;
        });
        setOpnameRecords(recordMap);
      }

      if (resFreeze.status === "fulfilled" && resFreeze.value?.success) {
        setIsFreezeMode(Boolean(resFreeze.value.data?.isFreezeMode));
      }
    } catch (e) {
      console.warn("[DB_SYNC_NOTICE] Koneksi API offline, tetap menggunakan cache lokal:", e);
    } finally {
      setIsSyncingDb(false);
    }
  }, []);

  // 2. Inisialisasi awal saat mount
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
      // Panggil sinkronisasi langsung dari database PostgreSQL
      refreshWarehouseData();
    }
  }, [refreshWarehouseData]);

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

  // Log Audit Event Helper (tersimpan ke state dan API database)
  const logAuditEvent = async ({ action, target, details, meta = {} }) => {
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

    // Kirim ke API database secara asynchronous
    try {
      await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog),
      });
    } catch (e) {
      console.warn("Gagal menyimpan audit log ke DB:", e);
    }

    return newLog;
  };

  // Toggle Freeze Mode (Pembekuan Mutasi untuk Stock Opname)
  const toggleFreezeMode = async () => {
    const nextState = !isFreezeMode;
    setIsFreezeMode(nextState);

    showToast(
      nextState
        ? "Sesi Stock Opname Aktif! Seluruh mutasi barang masuk & keluar dibekukan sementara."
        : "Sesi Stock Opname Selesai. Pembekuan mutasi telah dibuka kembali.",
      nextState ? "warning" : "success"
    );

    try {
      await fetch("/api/opname/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFreeze: nextState,
          user: currentUser?.name || "Hendra Wijaya, S.T.",
          role: currentUser?.role || "kepala_gudang",
          nip: currentUser?.nip || "19820415 200801 1 004",
        }),
      });
      // Ambil log audit terbaru
      fetch("/api/audit-logs?limit=50")
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) setAuditLogs(res.data);
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Gagal update freeze mode di DB:", e);
    }
  };

  // Record Stapel Opname (Kalkulator Tumpukan Karung Bulog)
  const recordStapelOpname = async ({
    stapelId,
    layerCount = 0,
    perLayerKoli = 0,
    peakKoli = 0,
    damagedKoli = 0,
    note = "",
  }) => {
    const stapel = stapels.find((s) => s.id === stapelId);
    const bookKoli = stapel ? stapel.batches.reduce((sum, b) => sum + (b.koli || 0), 0) : 0;

    const layers = Number(layerCount) || 0;
    const perLayer = Number(perLayerKoli) || 0;
    const peak = Number(peakKoli) || 0;
    const damaged = Number(damagedKoli) || 0;
    const physicalKoli = Math.max(0, layers * perLayer + peak - damaged);
    const variance = physicalKoli - bookKoli;

    let varianceStatus = "match";
    if (variance < 0) varianceStatus = "shortage";
    else if (variance > 0) varianceStatus = "surplus";

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

    showToast(
      `Hasil opname ${stapelId} tercatat: ${physicalKoli} koli (${
        variance === 0 ? "Sesuai" : variance < 0 ? `Selisih Kurang ${Math.abs(variance)}` : `Selisih Lebih +${variance}`
      }).`,
      variance === 0 ? "success" : "warning"
    );

    // Kirim ke API database
    try {
      await fetch("/api/opname/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stapelId,
          layerCount: layers,
          perLayerKoli: perLayer,
          peakKoli: peak,
          damagedKoli: damaged,
          note,
          user: currentUser?.name || "Budi Santoso",
          role: currentUser?.role || "operator",
          nip: currentUser?.nip || "19930820 201802 1 003",
        }),
      });
      // Sinkronkan audit log
      fetch("/api/audit-logs?limit=50")
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) setAuditLogs(res.data);
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Gagal simpan opname ke DB:", e);
    }

    return record;
  };

  // Reset Sesi Stock Opname
  const resetOpnameSession = async () => {
    setOpnameRecords({});
    localStorage.removeItem("SIGAP_BULOG_OPNAME_RECORDS_V1");
    showToast("Catatan sesi stock opname berhasil direset.", "info");

    try {
      await fetch("/api/opname/records", {
        method: "DELETE",
      });
      fetch("/api/audit-logs?limit=50")
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) setAuditLogs(res.data);
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Gagal reset opname di DB:", e);
    }
  };

  // Login handler terhubung ke API backend + fallback lokal
  const login = async (emailOrNip, password) => {
    const trimmed = (emailOrNip || "").trim().toLowerCase();
    const trimmedPass = (password || "").trim();

    // 1. Coba login ke API database
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrNip: trimmed, password: trimmedPass }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const loggedUser = data.data;
        setCurrentUser(loggedUser);
        if (typeof window !== "undefined") {
          localStorage.setItem("SIGAP_BULOG_AUTH_V1", JSON.stringify(loggedUser));
        }

        if (loggedUser.role === "operator") {
          setActiveView("operator");
          setOperatorScreen("home");
          try {
            router.push("/operator");
          } catch {}
        } else {
          setActiveView("dashboard");
          try {
            router.push("/dashboard");
          } catch {}
        }

        showToast(data.message || `Selamat datang, ${loggedUser.name}!`, "success");
        // Segarkan data dari database
        refreshWarehouseData();
        return { success: true, user: loggedUser };
      } else if (!data.success && res.status !== 500) {
        return { success: false, message: data.message || "Email/NIP atau kata sandi tidak sesuai." };
      }
    } catch (err) {
      console.warn("[AUTH_FALLBACK] Menggunakan pencocokan akun lokal:", err);
    }

    // 2. Fallback pencocokan lokal jika API tidak terjangkau
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
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("SIGAP_BULOG_AUTH_V1", JSON.stringify(updatedUser));
      } catch {}
    }

    setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)));

    if (user.role === "operator") {
      setActiveView("operator");
      setOperatorScreen("home");
      try {
        router.push("/operator");
      } catch {}
    } else {
      setActiveView("dashboard");
      try {
        router.push("/dashboard");
      } catch {}
    }

    showToast(`Selamat datang kembali, ${user.name}!`, "success");
    return { success: true, user: updatedUser };
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}

    setCurrentUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("SIGAP_BULOG_AUTH_V1");
    }
    showToast("Anda telah keluar dari sistem.", "info");
    try {
      router.push("/login");
    } catch {}
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

  // Sync internal state when URL pathname changes
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

  // User Management
  const addUser = async (userData) => {
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

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...userData,
          operatorName: currentUser?.name || "Administrator Pusat",
          operatorRole: currentUser?.role || "superadmin",
          operatorNip: currentUser?.nip || "-",
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUsers((prev) => [data.data, ...prev.filter((u) => u.id !== newUser.id)]);
      }
      fetch("/api/audit-logs?limit=50")
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) setAuditLogs(res.data);
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Gagal simpan user ke DB:", e);
    }

    showToast(`Akun ${newUser.name} berhasil ditambahkan.`, "success");
    return newUser;
  };

  const updateUser = async (userId, updates) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => ({ ...prev, ...updates }));
    }

    try {
      await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updates,
          operatorName: currentUser?.name || "Administrator Pusat",
          operatorRole: currentUser?.role || "superadmin",
          operatorNip: currentUser?.nip || "-",
        }),
      });
      fetch("/api/audit-logs?limit=50")
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) setAuditLogs(res.data);
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Gagal update user di DB:", e);
    }

    showToast("Perubahan akun berhasil disimpan.", "success");
  };

  const toggleUserStatus = async (userId) => {
    let nextStatus = "";
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          nextStatus = u.status === "aktif" ? "nonaktif" : "aktif";
          return { ...u, status: nextStatus };
        }
        return u;
      })
    );

    try {
      await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          operatorName: currentUser?.name || "Administrator Pusat",
          operatorRole: currentUser?.role || "superadmin",
          operatorNip: currentUser?.nip || "-",
        }),
      });
      fetch("/api/audit-logs?limit=50")
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) setAuditLogs(res.data);
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Gagal ubah status user di DB:", e);
    }

    showToast("Status akun berhasil diperbarui.", "info");
  };

  const deleteUser = async (userId) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      fetch("/api/audit-logs?limit=50")
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) setAuditLogs(res.data);
        })
        .catch(() => {});
    } catch (e) {
      console.warn("Gagal hapus user di DB:", e);
    }

    showToast("Akun berhasil dihapus.", "info");
  };

  // Sync state to LocalStorage
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

  const showToast = (message, type = "success") => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const toggleOnlineMode = () => {
    setIsOnline((prev) => {
      const nextState = !prev;
      if (nextState && offlineQueue.length > 0) {
        showToast(
          `Koneksi pulih. Berhasil mensinkronkan ${offlineQueue.length} transaksi offline ke server Bulog!`,
          "success"
        );
        setOfflineQueue([]);
        refreshWarehouseData();
      } else if (!nextState) {
        showToast("Mode Offline aktif. Transaksi akan disimpan di memori lokal HP.", "warning");
      }
      return nextState;
    });
  };

  const recalculateStapelStatus = (batches, capacity = 1000) => {
    const totalKoli = batches.reduce((sum, b) => sum + (Number(b.koli) || 0), 0);
    if (totalKoli === 0) return "kosong";
    if (totalKoli >= capacity * 0.8) return "penuh";
    return "sebagian";
  };

  // 1. TAMBAH BARANG MASUK (INBOUND) - TERHUBUNG KE API DATABASE
  const addInboundGoods = async ({
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

    // Optimistic UI Update
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
      operator: currentUser?.name || operator,
      suratJalan: newBatch.suratJalan,
      sourceOrDest: origin || "Pemasok Bulog",
      timestamp: new Date().toISOString(),
      isOffline: !isOnline,
      notes: notes || "Penerimaan komoditas gudang",
    };

    setTransactions((prev) => [newTransaction, ...prev]);

    // Kirim langsung ke Endpoint API Backend PostgreSQL
    try {
      const res = await fetch("/api/inventory/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stapelId,
          commodityId,
          brand: newBatch.brand,
          koli: koliNum,
          unit,
          weightPerUnitKg: weightNum,
          dateIn: newBatch.dateIn,
          expiryDate: newBatch.expiryDate,
          origin: newBatch.origin,
          suratJalan: newBatch.suratJalan,
          kondisi,
          notes,
          operator: currentUser?.name || operator,
          operatorRole: currentUser?.role || "operator",
          operatorNip: currentUser?.nip || "-",
          isOffline: !isOnline,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Ambil data stapel dan transaksi termutakhir dari database
        const [freshStapels, freshTrans, freshAudit] = await Promise.all([
          fetch("/api/stapels").then((r) => r.json()),
          fetch("/api/inventory/transactions?limit=100").then((r) => r.json()),
          fetch("/api/audit-logs?limit=50").then((r) => r.json()),
        ]);

        if (freshStapels.success && Array.isArray(freshStapels.data)) {
          setStapels(freshStapels.data);
        }
        if (freshTrans.success && Array.isArray(freshTrans.data)) {
          setTransactions(freshTrans.data);
        }
        if (freshAudit.success && Array.isArray(freshAudit.data)) {
          setAuditLogs(freshAudit.data);
        }
      }
    } catch (err) {
      console.warn("Gagal simpan inbound ke API, disimpan lokal:", err);
      if (!isOnline) {
        setOfflineQueue((prev) => [...prev, newTransaction]);
      }
    }

    if (!isOnline) {
      showToast(
        `[Offline] ${koliNum} ${unit} ${commodity.name} dicatat di ${stapelId}. Akan disinkron saat online.`,
        "warning"
      );
    } else {
      showToast(
        `Sukses! ${koliNum} ${unit} ${commodity.name} berhasil disimpan di ${stapelId} (Tersimpan di PostgreSQL).`,
        "success"
      );
    }

    return newBatch;
  };

  // 2. KELUARKAN BARANG (OUTBOUND DENGAN VALIDASI FIFO) - TERHUBUNG KE API DATABASE
  const releaseOutboundGoods = async ({
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

    // Optimistic UI Update
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
          .filter((batch) => batch.koli > 0);

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
      operator: currentUser?.name || operator,
      suratJalan: suratJalan || `DO-${Date.now().toString().slice(-6)}`,
      sourceOrDest: destination || "Distribusi Pangan Bulog",
      timestamp: new Date().toISOString(),
      isOffline: !isOnline,
      notes: notes || "Pengeluaran stok penyaluran gudang",
    };

    setTransactions((prev) => [newTransaction, ...prev]);

    // Kirim ke API database
    try {
      const res = await fetch("/api/inventory/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stapelId,
          batchId,
          koliToRelease: koliNum,
          destination,
          suratJalan: newTransaction.suratJalan,
          operator: currentUser?.name || operator,
          operatorRole: currentUser?.role || "operator",
          operatorNip: currentUser?.nip || "-",
          notes,
          isOffline: !isOnline,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const [freshStapels, freshTrans, freshAudit] = await Promise.all([
          fetch("/api/stapels").then((r) => r.json()),
          fetch("/api/inventory/transactions?limit=100").then((r) => r.json()),
          fetch("/api/audit-logs?limit=50").then((r) => r.json()),
        ]);

        if (freshStapels.success && Array.isArray(freshStapels.data)) {
          setStapels(freshStapels.data);
        }
        if (freshTrans.success && Array.isArray(freshTrans.data)) {
          setTransactions(freshTrans.data);
        }
        if (freshAudit.success && Array.isArray(freshAudit.data)) {
          setAuditLogs(freshAudit.data);
        }
      }
    } catch (err) {
      console.warn("Gagal simpan outbound ke API:", err);
      if (!isOnline) {
        setOfflineQueue((prev) => [...prev, newTransaction]);
      }
    }

    if (!isOnline) {
      showToast(`[Offline] ${koliNum} ${releasedUnit} dikeluarkan dari ${stapelId}.`, "warning");
    } else {
      showToast(
        `Sukses! ${koliNum} ${releasedUnit} ${releasedCommodity} berhasil disalurkan dari ${stapelId} (Tersimpan di DB).`,
        "success"
      );
    }
  };

  // 3. CRUD MASTER KOMODITAS (Bisa dipanggil dari UI)
  const addCommodity = async (commodityData) => {
    try {
      const res = await fetch("/api/commodities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...commodityData,
          operatorName: currentUser?.name || "Superadmin Bulog",
          operatorRole: currentUser?.role || "superadmin",
          operatorNip: currentUser?.nip || "-",
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCommodities((prev) => [...prev, data.data]);
        showToast(`Komoditas "${data.data.name}" berhasil ditambahkan.`, "success");
        return data.data;
      } else {
        showToast(data.message || "Gagal menambah komoditas", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal menghubungi server", "error");
    }
  };

  const updateCommodity = async (id, updates) => {
    try {
      const res = await fetch(`/api/commodities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...updates,
          operatorName: currentUser?.name || "Superadmin Bulog",
          operatorRole: currentUser?.role || "superadmin",
          operatorNip: currentUser?.nip || "-",
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCommodities((prev) => prev.map((c) => (c.id === id ? data.data : c)));
        showToast(`Komoditas "${data.data.name}" berhasil diperbarui.`, "success");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCommodity = async (id) => {
    try {
      const res = await fetch(`/api/commodities/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCommodities((prev) => prev.filter((c) => c.id !== id));
        showToast("Komoditas berhasil dihapus.", "success");
      } else {
        showToast(data.message, "error");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 4. CRUD BATCH GUDANG (Penyesuaian Fisik / Relokasi)
  const updateBatch = async (batchId, batchUpdates) => {
    try {
      const res = await fetch(`/api/inventory/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...batchUpdates,
          operatorName: currentUser?.name || "Petugas Gudang",
          operatorRole: currentUser?.role || "operator",
          operatorNip: currentUser?.nip || "-",
        }),
      });
      const data = await res.json();
      if (data.success) {
        refreshWarehouseData();
        showToast("Data batch berhasil diperbarui di database.", "success");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteBatch = async (batchId, reason = "Koreksi fisik") => {
    try {
      const res = await fetch(
        `/api/inventory/batches/${batchId}?reason=${encodeURIComponent(reason)}&operatorName=${encodeURIComponent(
          currentUser?.name || "Petugas"
        )}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        refreshWarehouseData();
        showToast("Batch berhasil dihapus.", "info");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 5. PENERBITAN BERITA ACARA STOCK OPNAME (BASO)
  const saveBasoReport = async (basoData) => {
    try {
      const res = await fetch("/api/baso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basoData,
          createdById: currentUser?.id,
          operatorName: currentUser?.name || "Hendra Wijaya, S.T.",
          operatorRole: currentUser?.role || "kepala_gudang",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Dokumen BASO ${data.data.reportNumber} berhasil diarsipkan.`, "success");
        return data.data;
      }
    } catch (e) {
      console.error("Gagal simpan BASO ke API:", e);
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
    showToast("Data prototype berhasil direset ke data awal Kompleks CISKID.", "info");
    refreshWarehouseData();
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
      const batches = Array.isArray(stapel.batches) ? stapel.batches : [];
      const stapelKoli = batches.reduce((sum, b) => sum + (Number(b.koli) || 0), 0);
      if (stapelKoli > 0) {
        stapelOccupied += 1;
      }

      batches.forEach((b) => {
        const koli = Number(b.koli) || 0;
        const weightKg = Number(b.weightPerUnitKg) || 50;
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

        const commName = b.commodityName || b.commodity?.name || b.brand || "Beras";
        if (!commoditySummary[commName]) {
          commoditySummary[commName] = {
            name: commName,
            koli: 0,
            tonase: 0,
            unit: b.unit || "Karung",
          };
        }
        commoditySummary[commName].koli += koli;
        commoditySummary[commName].tonase += tonase;
      });
    });

    return {
      totalKoli,
      totalTonase: parseFloat(totalTonase.toFixed(1)),
      stapelOccupied,
      totalStapels: stapels.length,
      occupancyPercentage: stapels.length > 0 ? Math.round((stapelOccupied / stapels.length) * 100) : 0,
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
        isSyncingDb,
        refreshWarehouseData,
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
        addCommodity,
        updateCommodity,
        deleteCommodity,
        updateBatch,
        deleteBatch,
        saveBasoReport,
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
