// src/types/auth.ts
// Definisi Tipe Autentikasi & RBAC (Role-Based Access Control) Bulog

export type UserRole = "superadmin" | "kepala_gudang" | "operator";

export type AccountStatus = "aktif" | "nonaktif";
export type UserStatus = AccountStatus;

export interface User {
  id: string;
  name: string;
  email: string;
  nip: string;
  password?: string;
  role: UserRole;
  unitGudang: string;
  status: AccountStatus;
  lastLogin?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface UserSession {
  id: string;
  role: UserRole;
}
