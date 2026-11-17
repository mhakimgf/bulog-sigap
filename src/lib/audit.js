// src/lib/audit.js
// Utilitas Pencatatan Rekam Jejak (Audit Trail)
// Standar Kepatuhan Governance, Risk & Compliance (GRC) BUMN Perum BULOG

import { prisma } from "./prisma";

/**
 * Mencatat aktivitas sistem atau pengguna ke tabel audit_logs
 * @param {Object} params
 * @param {string} params.action - Kode aksi (e.g. "COMMODITY_CREATE", "BATCH_ADJUSTMENT", "INBOUND_ENTRY")
 * @param {string} params.target - Entitas target (e.g. ID stapel, ID batch, email)
 * @param {string} params.details - Rincian kronologis atau delta perubahan data
 * @param {string} [params.user] - Nama pelaksana aksi
 * @param {string} [params.role] - Peran pelaksana (superadmin / kepala_gudang / operator)
 * @param {string} [params.nip] - NIP resmi Bulog pelaksana
 * @param {string} [params.userId] - ID user di database (jika ada)
 * @param {string} [params.ipAddress] - IP Address klien
 */
export async function createAuditLog({
  action,
  target,
  details,
  user = "Sistem / Operator Lapangan",
  role = "operator",
  nip = "-",
  userId = null,
  ipAddress = "127.0.0.1",
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        action,
        target,
        details,
        user,
        role,
        nip,
        userId,
        ipAddress,
      },
    });
  } catch (error) {
    console.error("[AUDIT_LOG_ERROR] Gagal menyimpan log audit:", error);
    return null;
  }
}
