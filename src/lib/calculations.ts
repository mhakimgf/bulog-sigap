// src/lib/calculations.ts
// Logika Perhitungan Matematis & Aturan Bisnis Gudang Bulog (Strictly Typed)

import type { ShelfLifeStatusType, StapelStatusType } from "../types/warehouse";

export interface ShelfLifeStatusResult {
  status: ShelfLifeStatusType;
  label: string;
  badgeColor: string;
  barColor: string;
  textColor: string;
  icon: string;
  isFifoPriority: boolean;
}

/**
 * Menghitung umur simpan (aging days) dari tanggal komoditas masuk ke gudang
 */
export function calculateAgingDays(dateString: string | Date | null | undefined): number {
  if (!dateString) return 0;
  const inDate = new Date(dateString);
  const now = new Date("2026-11-15T00:00:00"); // Anchor waktu operasional
  const diffTime = Math.max(0, now.getTime() - inDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Mendapatkan status mutu komoditas beras sesuai standar masa simpan Bulog (maks 180 hari untuk SPHP)
 */
export function getShelfLifeStatus(days: number, maxDays = 180): ShelfLifeStatusResult {
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
}

/**
 * Formula Resmi Stock Opname Bulog:
 * Fisik = (Jumlah Lapis * Isi per Lapis) + Kunci Puncak - Rusak/Ceceran
 */
export function calculateOpnamePhysical(
  layerCount: number,
  perLayerKoli: number,
  peakKoli: number,
  damagedKoli: number
): number {
  const layers = Math.max(0, Number(layerCount) || 0);
  const perLayer = Math.max(0, Number(perLayerKoli) || 0);
  const peak = Math.max(0, Number(peakKoli) || 0);
  const damaged = Math.max(0, Number(damagedKoli) || 0);

  return Math.max(0, layers * perLayer + peak - damaged);
}

/**
 * Menghitung selisih fisik vs saldo buku
 */
export function calculateVariance(
  physicalKoli: number,
  bookKoli: number
): { variance: number; varianceStatus: "match" | "shortage" | "surplus" } {
  const variance = physicalKoli - bookKoli;
  let varianceStatus: "match" | "shortage" | "surplus" = "match";
  if (variance < 0) varianceStatus = "shortage";
  else if (variance > 0) varianceStatus = "surplus";

  return { variance, varianceStatus };
}

/**
 * Menentukan status kapasitas stapel
 */
export function getStapelStatus(totalKoli: number, capacityKoli = 1000): StapelStatusType {
  if (totalKoli <= 0) return "kosong";
  if (totalKoli >= capacityKoli * 0.8) return "penuh";
  return "sebagian";
}
