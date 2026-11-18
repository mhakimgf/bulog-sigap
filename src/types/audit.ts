// src/types/audit.ts
// Definisi Tipe Audit Trail GRC BUMN Perum BULOG

export type AuditAction =
  | "INBOUND_ENTRY"
  | "OUTBOUND_RELEASE"
  | "COMMODITY_CREATE"
  | "COMMODITY_UPDATE"
  | "COMMODITY_DELETE"
  | "BATCH_CREATE"
  | "BATCH_ADJUSTMENT"
  | "BATCH_RELOCATION"
  | "BATCH_DELETE"
  | "STAPEL_UPDATE"
  | "FREEZE_MODE_ACTIVATED"
  | "FREEZE_MODE_DEACTIVATED"
  | "OPNAME_STAPEL_VERIFY"
  | "OPNAME_SESSION_RESET"
  | "BASO_GENERATE"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_STATUS_CHANGE"
  | "USER_DELETE"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "SYSTEM_INIT";

export interface AuditLog {
  id: string;
  timestamp: string | Date;
  userId?: string | null;
  user: string;
  role: string;
  nip: string;
  action: AuditAction | string;
  target: string;
  details: string;
  ipAddress?: string | null;
  createdAt?: string | Date;
}
