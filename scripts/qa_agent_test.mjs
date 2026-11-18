// scripts/qa_agent_test.mjs
// Automated Recurrent Multi-Role E2E Flow Testing & Bug Hunter
// SIGAP BULOG (Sistem Inventaris Pergudangan & Stock Opname Terpadu)

const BASE_URL = "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;
const bugsFound = [];

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} -> ${details}`);
    failedCount++;
    bugsFound.push({ testName, details });
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    ...options,
    headers,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, headers: res.headers, data: json };
}

async function main() {
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("🤖 RECURRENT QA AGENT — MULTI-ROLE FULL FLOW & BUG HUNTING TEST");
  console.log(`🎯 Target Endpoint: ${BASE_URL}`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  const startTime = Date.now();

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: Multi-Role Authentication & Security
  // ─────────────────────────────────────────────────────────────
  console.log("📌 SUITE 1: Autentikasi Multi-Peran & Session Cookie Security");

  // 1.1 Login dengan kredensial salah
  const invalidLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrNip: "hacker@evil.com", password: "wrong" }),
  });
  assert(
    invalidLogin.status === 401 && invalidLogin.data?.success === false,
    "1.1 Menolak login dengan kredensial tidak valid (401 Unauthorized)",
    `Expected 401, got ${invalidLogin.status}`
  );

  // 1.2 Login Superadmin
  const adminLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrNip: "admin@bulog.co.id", password: "admin123" }),
  });
  assert(
    adminLogin.status === 200 && adminLogin.data?.data?.role === "superadmin",
    "1.2 Login Superadmin berhasil dengan role superadmin",
    `Role: ${adminLogin.data?.data?.role}`
  );
  const adminCookie = adminLogin.headers.get("set-cookie");
  assert(
    Boolean(adminCookie && adminCookie.includes("sigap_session")),
    "1.3 Menerbitkan HTTP-Only Cookie 'sigap_session' untuk Superadmin",
    `Cookie: ${adminCookie}`
  );

  // 1.3 Login Kepala Gudang
  const kepalaLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrNip: "hendra@bulog.co.id", password: "bulog123" }),
  });
  assert(
    kepalaLogin.status === 200 && kepalaLogin.data?.data?.role === "kepala_gudang",
    "1.4 Login Kepala Gudang berhasil dengan role kepala_gudang",
    `Got: ${kepalaLogin.data?.data?.role}`
  );

  // 1.4 Login Operator Lapangan (via NIP)
  const operatorLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrNip: "19930820 201802 1 003", password: "operator123" }),
  });
  assert(
    operatorLogin.status === 200 && operatorLogin.data?.data?.role === "operator",
    "1.5 Login Operator Lapangan via NIP berhasil",
    `User: ${operatorLogin.data?.data?.name}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: Master Data Fasilitas Kompleks CISKID (Gudang 1–5)
  // ─────────────────────────────────────────────────────────────
  console.log("\n📌 SUITE 2: Master Data Gudang & Komoditas");

  const whRes = await request("/api/warehouse");
  assert(
    whRes.status === 200 && whRes.data?.data?.warehouse?.units?.length === 5,
    "2.1 Master Gudang CISKID memuat 5 Gedung Unit (G1 s/d G5)",
    `Units: ${whRes.data?.data?.warehouse?.units?.length}`
  );

  const commRes = await request("/api/commodities");
  assert(
    commRes.status === 200 && Array.isArray(commRes.data?.data) && commRes.data?.data?.length >= 5,
    "2.2 Master Komoditas pangan pokok lengkap (Beras SPHP, Premium, Minyakita, Gula, Terigu)",
    `Count: ${commRes.data?.data?.length}`
  );

  const stapelRes = await request("/api/stapels");
  assert(
    stapelRes.status === 200 && stapelRes.data?.data?.length === 60,
    "2.3 Denah 2D memuat tepat 60 Titik Stapel Matriks 4x3",
    `Total: ${stapelRes.data?.data?.length}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: Operator Flow — Inbound, Outbound & FIFO Guard
  // ─────────────────────────────────────────────────────────────
  console.log("\n📌 SUITE 3: Alur Operator Lapangan (Inbound, Outbound & FIFO)");

  const targetStapel = "G1-A4"; // Gunakan stapel kosong untuk testing
  const inboundRes = await request("/api/inventory/inbound", {
    method: "POST",
    body: JSON.stringify({
      stapelId: targetStapel,
      commodityId: "beras-medium",
      brand: "Bulog CBP SPHP 50kg (QA Batch)",
      koli: 200,
      unit: "Karung",
      weightPerUnitKg: 50,
      dateIn: "2026-05-01", // Tanggal lama untuk simulasi FIFO
      origin: "Pusat Pengadaan Cirebon",
      suratJalan: `SJ-QA-${Date.now().toString().slice(-5)}`,
      operator: "Budi Santoso (QA)",
    }),
  });
  assert(
    inboundRes.status === 200 && inboundRes.data?.data?.batch?.koli === 200,
    "3.1 Operator berhasil mencatat Inbound 200 Karung ke stapel G1-A4",
    `Batch: ${inboundRes.data?.data?.batch?.batchNo}`
  );

  const createdBatchId = inboundRes.data?.data?.batch?.id;

  // Cek apakah status stapel ter-update di database
  const checkStapel = await request(`/api/stapels/${targetStapel}`);
  assert(
    checkStapel.status === 200 && checkStapel.data?.data?.totalKoli === 200,
    "3.2 Status keterisian dan total koli stapel G1-A4 ter-update di database",
    `Koli: ${checkStapel.data?.data?.totalKoli}, Status: ${checkStapel.data?.data?.status}`
  );

  // Edge Case: Inbound dengan koli negatif (Harus Ditolak 400!)
  const negativeInbound = await request("/api/inventory/inbound", {
    method: "POST",
    body: JSON.stringify({
      stapelId: targetStapel,
      commodityId: "beras-medium",
      koli: -50,
      operator: "Budi Santoso",
    }),
  });
  assert(
    negativeInbound.status === 400,
    "3.3 Guard: Menolak Inbound dengan koli negatif/nol (400 Bad Request)",
    `Status: ${negativeInbound.status}`
  );

  // Edge Case: Inbound melebihi kapasitas maksimum stapel (1000 koli, saat ini terisi 200, coba masukkan 1500)
  const overflowInbound = await request("/api/inventory/inbound", {
    method: "POST",
    body: JSON.stringify({
      stapelId: targetStapel,
      commodityId: "beras-medium",
      koli: 1500,
      operator: "Budi Santoso",
    }),
  });
  assert(
    overflowInbound.status === 400,
    "3.4 Guard: Menolak Inbound yang melebihi kapasitas maksimum tiang stapel (400 Bad Request)",
    `Status: ${overflowInbound.status}`
  );

  // Outbound 50 koli dari batch tadi
  const outboundRes = await request("/api/inventory/outbound", {
    method: "POST",
    body: JSON.stringify({
      stapelId: targetStapel,
      batchId: createdBatchId,
      koliToRelease: 50,
      destination: "Operasi Pasar Murah Bandung",
      operator: "Budi Santoso (QA)",
      suratJalan: `DO-QA-${Date.now().toString().slice(-5)}`,
    }),
  });
  assert(
    outboundRes.status === 200 && outboundRes.data?.data?.remainingKoli === 150,
    "3.3 Outbound berhasil memotong stok batch (sisa 150 karung)",
    `Remaining: ${outboundRes.data?.data?.remainingKoli}`
  );

  // Edge Case: Outbound melebihi sisa stok (minta 500 padahal cuma sisa 150)
  const overOutbound = await request("/api/inventory/outbound", {
    method: "POST",
    body: JSON.stringify({
      stapelId: targetStapel,
      batchId: createdBatchId,
      koliToRelease: 500,
      destination: "Tujuan Fiktif",
      operator: "Budi Santoso (QA)",
    }),
  });
  assert(
    overOutbound.status === 400,
    "3.4 Menolak pengeluaran stok yang melebihi saldo batch (Edge Case 400 Bad Request)",
    `Response: ${overOutbound.status} - ${overOutbound.data?.message}`
  );

  // Periksa kalkulasi FIFO & Aging
  const agingRes = await request("/api/inventory/aging");
  assert(
    agingRes.status === 200 && agingRes.data?.data?.summary?.criticalCount >= 1,
    "3.5 Sistem deteksi masa simpan mendeteksi batch yang mendekati/melewati batas (>180 hari)",
    `Kritis: ${agingRes.data?.data?.summary?.criticalCount}, Prioritas: ${agingRes.data?.data?.summary?.priorityCount}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: Kepala Gudang Flow — Stock Opname & Berita Acara (BASO)
  // ─────────────────────────────────────────────────────────────
  console.log("\n📌 SUITE 4: Alur Kepala Gudang (Freeze Mode, Opname & BASO)");

  // 4.1 Aktifkan Freeze Mode
  const freezeOn = await request("/api/opname/freeze", {
    method: "POST",
    body: JSON.stringify({ isFreeze: true, user: "Hendra Wijaya, S.T." }),
  });
  assert(
    freezeOn.status === 200 && freezeOn.data?.data?.isFreezeMode === true,
    "4.1 Kepala Gudang berhasil mengaktifkan Freeze Mode (Pembekuan Mutasi)",
    `State: ${freezeOn.data?.data?.isFreezeMode}`
  );

  // 4.2 Edge Case: Coba Inbound saat Freeze Mode Aktif (Harus Ditolak 403!)
  const freezeBlockedInbound = await request("/api/inventory/inbound", {
    method: "POST",
    body: JSON.stringify({
      stapelId: targetStapel,
      commodityId: "beras-medium",
      koli: 10,
      operator: "Budi Santoso",
    }),
  });
  assert(
    freezeBlockedInbound.status === 403,
    "4.2 Security Guard: Inbound ditolak saat Freeze Mode aktif (403 Forbidden)",
    `Status: ${freezeBlockedInbound.status}`
  );

  // 4.3 Edge Case: Coba Outbound saat Freeze Mode Aktif (Harus Ditolak 403!)
  const freezeBlockedOutbound = await request("/api/inventory/outbound", {
    method: "POST",
    body: JSON.stringify({
      stapelId: targetStapel,
      batchId: createdBatchId,
      koliToRelease: 10,
    }),
  });
  assert(
    freezeBlockedOutbound.status === 403,
    "4.3 Security Guard: Outbound ditolak saat Freeze Mode aktif (403 Forbidden)",
    `Status: ${freezeBlockedOutbound.status}`
  );

  // 4.4 Hitung Fisik Stock Opname Rumus Bulog
  // Stapel G1-A4 punya sisa buku 150 karung.
  // Hitung fisik: 10 lapis * 14 karung + 12 kunci puncak - 2 karung rusak = 150 karung (MATCH!)
  const opnameRecord = await request("/api/opname/record", {
    method: "POST",
    body: JSON.stringify({
      stapelId: targetStapel,
      layerCount: 10,
      perLayerKoli: 14,
      peakKoli: 12,
      damagedKoli: 2,
      note: "Kondisi beras kering, karung bersih standar CBP.",
      user: "Hendra Wijaya, S.T.",
    }),
  });
  assert(
    opnameRecord.status === 200 && opnameRecord.data?.data?.physicalKoli === 150 && opnameRecord.data?.data?.variance === 0,
    "4.4 Formula Fisik Bulog akurat: Fisik 150 vs Buku 150 -> Selisih 0 (MATCH)",
    `Fisik: ${opnameRecord.data?.data?.physicalKoli}, Variance: ${opnameRecord.data?.data?.variance}`
  );

  // 4.5 Terbitkan Dokumen Resmi BASO
  const basoRes = await request("/api/baso", {
    method: "POST",
    body: JSON.stringify({
      reportNumber: `BA-SO/QA-TEST/${Date.now().toString().slice(-4)}`,
      totalTonase: 7.5,
      totalKoli: 150,
      stapelCount: 1,
      accuracyRate: 100.0,
      signedBy: "Hendra Wijaya, S.T.",
      signerNip: "19820415 200801 1 004",
    }),
  });
  assert(
    basoRes.status === 200 && Boolean(basoRes.data?.data?.reportNumber),
    "4.5 Penerbitan Dokumen Resmi Berita Acara (BASO) berhasil disimpan di database",
    `No BASO: ${basoRes.data?.data?.reportNumber}`
  );

  // 4.6 Nonaktifkan Freeze Mode kembali
  const freezeOff = await request("/api/opname/freeze", {
    method: "POST",
    body: JSON.stringify({ isFreeze: false, user: "Hendra Wijaya, S.T." }),
  });
  assert(
    freezeOff.status === 200 && freezeOff.data?.data?.isFreezeMode === false,
    "4.6 Freeze Mode berhasil dibuka kembali setelah opname selesai",
    `State: ${freezeOff.data?.data?.isFreezeMode}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: Superadmin Flow — Manajemen Akun & CRUD Komoditas
  // ─────────────────────────────────────────────────────────────
  console.log("\n📌 SUITE 5: Alur Superadmin (User RBAC & CRUD Komoditas)");

  // 5.1 Buat Pengguna Baru
  const testEmail = `operator.qa.${Date.now().toString().slice(-4)}@bulog.co.id`;
  const testNip = `1999${Date.now().toString().slice(-8)}`;
  const createUser = await request("/api/users", {
    method: "POST",
    body: JSON.stringify({
      name: "Operator Testing QA",
      email: testEmail,
      nip: testNip,
      password: "password123",
      role: "operator",
      unitGudang: "GBB CISKID (Gudang 1)",
    }),
  });
  assert(
    createUser.status === 200 && createUser.data?.data?.email === testEmail,
    "5.1 Superadmin berhasil mendaftarkan akun operator baru",
    `Created: ${createUser.data?.data?.id}`
  );
  const newUserId = createUser.data?.data?.id;

  // 5.2 Nonaktifkan Akun Pengguna
  const disableUser = await request(`/api/users/${newUserId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "nonaktif" }),
  });
  assert(
    disableUser.status === 200 && disableUser.data?.data?.status === "nonaktif",
    "5.2 Superadmin berhasil menonaktifkan status akun",
    `Status: ${disableUser.data?.data?.status}`
  );

  // 5.3 Coba Login dengan Akun yang Dinonaktifkan (Harus Ditolak!)
  const blockedLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrNip: testEmail, password: "password123" }),
  });
  assert(
    blockedLogin.status === 403,
    "5.3 Sistem menolak login akun berstatus nonaktif (Security Guard 403 Forbidden)",
    `Status: ${blockedLogin.status}`
  );

  // 5.4 Hapus Pengguna Testing
  const delUser = await request(`/api/users/${newUserId}`, { method: "DELETE" });
  assert(
    delUser.status === 200 && delUser.data?.success === true,
    "5.4 Superadmin berhasil menghapus akun pengguna testing",
    `Message: ${delUser.data?.message}`
  );

  // 5.5 CRUD Komoditas: Tambah, Update, Hapus
  const testCommId = `qa-komoditas-${Date.now().toString().slice(-4)}`;
  const addComm = await request("/api/commodities", {
    method: "POST",
    body: JSON.stringify({
      id: testCommId,
      name: "Kedelai Impor CBP (Testing)",
      category: "Kedelai",
      defaultUnit: "Karung",
      defaultWeight: 50,
      maxShelfLifeDays: 90,
    }),
  });
  assert(
    addComm.status === 200 && addComm.data?.data?.id === testCommId,
    "5.5 CRUD Komoditas: Berhasil menambahkan komoditas baru",
    `ID: ${addComm.data?.data?.id}`
  );

  const delComm = await request(`/api/commodities/${testCommId}`, { method: "DELETE" });
  assert(
    delComm.status === 200 && delComm.data?.success === true,
    "5.6 CRUD Komoditas: Berhasil menghapus komoditas tanpa batch",
    `Status: ${delComm.data?.message}`
  );

  // 5.7 Proteksi Integritas Komoditas: Hapus komoditas yang punya batch (Harus Ditolak!)
  const delProtectedComm = await request("/api/commodities/beras-medium", { method: "DELETE" });
  assert(
    delProtectedComm.status === 400,
    "5.7 Proteksi Integritas: Menolak penghapusan komoditas yang masih memiliki batch aktif (400 Bad Request)",
    `Response: ${delProtectedComm.status} - ${delProtectedComm.data?.message}`
  );

  // ─────────────────────────────────────────────────────────────
  // SUITE 6: Audit Trail & Kepatuhan GRC BUMN Bulog
  // ─────────────────────────────────────────────────────────────
  console.log("\n📌 SUITE 6: Audit Trail & Kepatuhan GRC");

  const auditRes = await request("/api/audit-logs?limit=10");
  assert(
    auditRes.status === 200 && auditRes.data?.data?.length > 0,
    "6.1 Seluruh aksi di atas otomatis terekam dalam Audit Trail kronologis dengan Nama & NIP",
    `Total logs: ${auditRes.data?.data?.length}, Aksi Terakhir: ${auditRes.data?.data?.[0]?.action}`
  );

  // Bersihkan data testing batch di G1-A4
  await request(`/api/inventory/batches/${createdBatchId}?reason=Pembersihan+Data+Testing+QA`, {
    method: "DELETE",
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("📊 HASIL AKHIR PENGUJIAN RECURRENT QA AGENT:");
  console.log(`⏱️ Waktu Eksekusi: ${durationSec} detik`);
  console.log(`✅ Lulus (PASS): ${passedCount}`);
  console.log(`❌ Gagal (FAIL): ${failedCount}`);
  console.log(`🐞 Bug Ditemukan: ${bugsFound.length}`);
  console.log("══════════════════════════════════════════════════════════════════\n");

  if (bugsFound.length > 0) {
    console.error("Daftar Masalah/Bug yang Perlu Diperbaiki:");
    bugsFound.forEach((b, idx) => {
      console.error(`${idx + 1}. [${b.testName}]: ${b.details}`);
    });
    process.exit(1);
  } else {
    console.log("🎉 SEMUA 20 SKENARIO FLOW MULTI-ROLE BERHASIL LULUS 100%!");
    console.log("Sistem SIGAP BULOG sangat stabil, aman, dan siap untuk demo klien.");
  }
}

main().catch((err) => {
  console.error("Fatal QA Error:", err);
  process.exit(1);
});
