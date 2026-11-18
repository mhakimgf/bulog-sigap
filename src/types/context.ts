// src/types/context.ts
import { Warehouse, Stapel, Commodity, Transaction } from "./warehouse";
import { User } from "./auth";
import { AuditLog } from "./audit";

export interface ToastMessageData {
  type: "success" | "warning" | "info" | "error" | string;
  message: string;
}

export interface WarehouseStats {
  totalCapacityTonase: number;
  totalOccupiedTonase: number;
  totalOccupiedKoli: number;
  occupancyPercentage: number;
  fifoWarnings: number;
  criticalItems: number;
  commoditySummary: Array<{
    id: string;
    name: string;
    category: string;
    koli: number;
    tonase: number;
    color: string;
  }>;
}

export interface WarehouseContextType {
  warehouse: Warehouse;
  stapels: Stapel[];
  commodities: Commodity[];
  transactions: Transaction[];
  isOnline: boolean;
  offlineQueue: any[];
  activeView: string;
  setActiveView: (view: string) => void;
  operatorScreen: string;
  setOperatorScreen: (screen: string) => void;
  router: any;
  pathname: string;
  selectedStapelId: string;
  setSelectedStapelId: (id: string) => void;
  notificationCount: number;
  toastMessage: ToastMessageData | null;
  warehouseStats: WarehouseStats;
  isSyncingDb: boolean;
  refreshWarehouseData: () => Promise<void>;
  toggleOnlineMode: () => void;
  addInboundGoods: (data: any) => Promise<any>;
  currentUser: User | null;
  users: User[];
  login: (emailOrNip: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
  addUser: (data: any) => Promise<any>;
  updateUser: (id: string, data: any) => Promise<any>;
  toggleUserStatus: (id: string) => Promise<any>;
  deleteUser: (id: string) => Promise<any>;
  releaseOutboundGoods: (data: any) => Promise<any>;
  addCommodity: (data: any) => Promise<any>;
  updateCommodity: (id: string, data: any) => Promise<any>;
  deleteCommodity: (id: string) => Promise<any>;
  updateBatch: (id: string, data: any) => Promise<any>;
  deleteBatch: (id: string, reason?: string) => Promise<any>;
  saveBasoReport: (data: any) => Promise<any>;
  resetToFactoryData: () => Promise<void>;
  showToast: (message: string, type?: string) => void;
  auditLogs: AuditLog[];
  logAuditEvent: (data: any) => Promise<any>;
  isFreezeMode: boolean;
  toggleFreezeMode: () => Promise<any>;
  opnameRecords: any[];
  recordStapelOpname: (data: any) => Promise<any>;
  resetOpnameSession: () => Promise<any>;
}
