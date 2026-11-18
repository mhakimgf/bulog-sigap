// src/lib/audit.ts
// Utilitas Pencatatan Rekam Jejak (Audit Trail)
// Standar Kepatuhan Governance, Risk & Compliance (GRC) BUMN Perum BULOG

import { prisma } from "./prisma";
import type { AuditAction } from "../types/audit";

export interface CreateAuditLogParams {
  action: AuditAction | string;
  target: string;
  details: string;
  user?: string;
  role?: string;
  nip?: string;
  userId?: string | null;
  ipAddress?: string | null;
}

/**
 * Mencatat aktivitas sistem atau pengguna ke tabel audit_logs dengan strict typing
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
}: CreateAuditLogParams) {
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
