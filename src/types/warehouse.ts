// src/types/warehouse.ts
// Definisi Tipe Domain Pergudangan & Stock Opname SIGAP BULOG

export type ShelfLifeStatusType = "optimal" | "waspada" | "prioritas" | "kritis";

export type StapelStatusType = "kosong" | "sebagian" | "penuh" | "nonaktif";
export type StapelStatus = StapelStatusType;

export type TransactionType = "MASUK" | "KELUAR" | "PENYESUAIAN";

export interface WarehouseUnit {
  id: string; // "G1", "G2", etc.
  name: string; // "Gudang 1"
  layout: "vertical" | "horizontal";
  capacityTonase: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  singkatan: string;
  kanwil: string;
  kancab: string;
  address: string;
  street: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  kepalaGudang: string;
  nipKepalaGudang: string;
  totalCapacityTonase?: number;
  totalCapacityTon?: number;
  activeGudang: string;
  units?: WarehouseUnit[];
}

export interface Commodity {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  defaultWeight: number;
  maxShelfLifeDays: number;
  icon?: string;
  color?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  _count?: {
    batches?: number;
  };
}

export interface Batch {
  id: string;
  stapelId: string;
  commodityId: string;
  commodityName?: string;
  batchNo: string;
  brand: string;
  koli: number;
  unit: string;
  weightPerUnitKg: number;
  dateIn: string | Date;
  expiryDate?: string | Date | null;
  origin: string;
  suratJalan: string;
  kondisi: string;
  notes?: string | null;
  agingDays?: number;
  shelfLifeStatus?: ShelfLifeStatusType;
  isFifoPriority?: boolean;
  commodity?: Commodity;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Stapel {
  id: string; // "G1-A1"
  gudang: string; // "Gudang 1"
  block: string; // "A", "B", "C"
  number: number; // 1, 2, 3, 4
  row?: string;
  col?: number;
  name: string; // "Stapel A1"
  capacityKoli: number;
  status: StapelStatusType;
  blockColor?: string;
  baseColor?: string;
  batches: Batch[];
  totalKoli?: number;
  totalTonase?: number;
  oldestDateIn?: string | Date | null;
  occupancyPct?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  stapelId: string;
  gudang: string;
  commodityName: string;
  brand: string;
  koli: number;
  unit: string;
  weightPerUnitKg: number;
  totalKg: number;
  operator: string;
  userId?: string | null;
  suratJalan: string;
  sourceOrDest: string;
  timestamp: string | Date;
  isOffline?: boolean;
  notes?: string | null;
}

export interface OpnameRecord {
  id?: string;
  stapelId: string;
  gudang: string;
  block: string;
  number: number;
  bookKoli: number;
  physicalKoli: number;
  variance: number;
  varianceStatus: "match" | "shortage" | "surplus";
  layerCount: number;
  perLayerKoli: number;
  peakKoli: number;
  damagedKoli: number;
  note?: string | null;
  verifiedAt: string | Date;
  verifiedBy: string;
  verifiedNip: string;
  stapel?: Partial<Stapel>;
}

export interface BasoReport {
  id: string;
  reportNumber: string;
  warehouseId: string;
  periodDate: string | Date;
  totalTonase: number;
  totalKoli: number;
  stapelCount: number;
  accuracyRate: number;
  signedBy: string;
  signerNip: string;
  createdById?: string | null;
  pdfUrl?: string | null;
  createdAt?: string | Date;
  warehouse?: Warehouse;
}
