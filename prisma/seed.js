// prisma/seed.js
// Seeding Master Data Kompleks Pergudangan Cisaranten Kidul (CISKID)
// dan Akun Resmi Perum BULOG

import { PrismaClient } from "@prisma/client";
import {
  INITIAL_WAREHOUSE,
  COMMODITIES,
  INITIAL_STAPELS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from "../src/data/initialWarehouseData.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌾 Memulai proses seeding data master SIGAP BULOG...");

  // 1. Seed Warehouse
  console.log("-> Seeding Kompleks Pergudangan CISKID...");
  await prisma.warehouse.upsert({
    where: { id: INITIAL_WAREHOUSE.id },
    update: {
      code: INITIAL_WAREHOUSE.code,
      name: INITIAL_WAREHOUSE.name,
      singkatan: INITIAL_WAREHOUSE.singkatan,
      kanwil: INITIAL_WAREHOUSE.kanwil,
      kancab: INITIAL_WAREHOUSE.kancab,
      address: INITIAL_WAREHOUSE.address,
      street: INITIAL_WAREHOUSE.street,
      kelurahan: INITIAL_WAREHOUSE.kelurahan,
      kecamatan: INITIAL_WAREHOUSE.kecamatan,
      city: INITIAL_WAREHOUSE.city,
      province: INITIAL_WAREHOUSE.province,
      postalCode: INITIAL_WAREHOUSE.postalCode,
      latitude: INITIAL_WAREHOUSE.latitude,
      longitude: INITIAL_WAREHOUSE.longitude,
      kepalaGudang: INITIAL_WAREHOUSE.kepalaGudang,
      nipKepalaGudang: INITIAL_WAREHOUSE.nipKepalaGudang,
      totalCapacityTon: INITIAL_WAREHOUSE.totalCapacityTonase,
      activeGudang: INITIAL_WAREHOUSE.activeGudang,
    },
    create: {
      id: INITIAL_WAREHOUSE.id,
      code: INITIAL_WAREHOUSE.code,
      name: INITIAL_WAREHOUSE.name,
      singkatan: INITIAL_WAREHOUSE.singkatan,
      kanwil: INITIAL_WAREHOUSE.kanwil,
      kancab: INITIAL_WAREHOUSE.kancab,
      address: INITIAL_WAREHOUSE.address,
      street: INITIAL_WAREHOUSE.street,
      kelurahan: INITIAL_WAREHOUSE.kelurahan,
      kecamatan: INITIAL_WAREHOUSE.kecamatan,
      city: INITIAL_WAREHOUSE.city,
      province: INITIAL_WAREHOUSE.province,
      postalCode: INITIAL_WAREHOUSE.postalCode,
      latitude: INITIAL_WAREHOUSE.latitude,
      longitude: INITIAL_WAREHOUSE.longitude,
      kepalaGudang: INITIAL_WAREHOUSE.kepalaGudang,
      nipKepalaGudang: INITIAL_WAREHOUSE.nipKepalaGudang,
      totalCapacityTon: INITIAL_WAREHOUSE.totalCapacityTonase,
      activeGudang: INITIAL_WAREHOUSE.activeGudang,
    },
  });

  // 2. Seed Warehouse Units (Gudang 1 - 5)
  console.log("-> Seeding Unit Gedung Gudang 1 - 5...");
  for (const unit of INITIAL_WAREHOUSE.units) {
    await prisma.warehouseUnit.upsert({
      where: { id: unit.id },
      update: {
        warehouseId: INITIAL_WAREHOUSE.id,
        name: unit.name,
        layoutType: unit.layout,
        capacityTonase: unit.capacityTonase,
      },
      create: {
        id: unit.id,
        warehouseId: INITIAL_WAREHOUSE.id,
        name: unit.name,
        layoutType: unit.layout,
        capacityTonase: unit.capacityTonase,
      },
    });
  }

  // 3. Seed Commodities
  console.log("-> Seeding Master Komoditas Pangan Pokok...");
  for (const item of COMMODITIES) {
    await prisma.commodity.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        category: item.category,
        defaultUnit: item.defaultUnit,
        defaultWeight: item.defaultWeight,
        maxShelfLifeDays: item.maxShelfLifeDays,
        icon: item.icon,
        color: item.color,
      },
      create: {
        id: item.id,
        name: item.name,
        category: item.category,
        defaultUnit: item.defaultUnit,
        defaultWeight: item.defaultWeight,
        maxShelfLifeDays: item.maxShelfLifeDays,
        icon: item.icon,
        color: item.color,
      },
    });
  }

  // 4. Seed Users
  console.log("-> Seeding Akun Pengguna Resmi Bulog...");
  for (const u of INITIAL_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        nip: u.nip,
        password: u.password,
        role: u.role,
        unitGudang: u.unitGudang,
        status: u.status,
      },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        nip: u.nip,
        password: u.password,
        role: u.role,
        unitGudang: u.unitGudang,
        status: u.status,
      },
    });
  }

  // 5. Seed Stapels & Initial Batches
  console.log("-> Seeding 60 Titik Stapel Matriks 4x3 & Fisik Batch...");
  for (const st of INITIAL_STAPELS) {
    const unitId = st.id.split("-")[0]; // e.g. "G1" from "G1-A1"

    await prisma.stapel.upsert({
      where: { id: st.id },
      update: {
        warehouseId: INITIAL_WAREHOUSE.id,
        unitId,
        gudang: st.gudang,
        block: st.block,
        number: st.number,
        name: st.name,
        capacityKoli: st.capacityKoli,
        status: st.status,
      },
      create: {
        id: st.id,
        warehouseId: INITIAL_WAREHOUSE.id,
        unitId,
        gudang: st.gudang,
        block: st.block,
        number: st.number,
        name: st.name,
        capacityKoli: st.capacityKoli,
        status: st.status,
      },
    });

    // Seed Batches jika ada di stapel ini
    if (st.batches && st.batches.length > 0) {
      for (const b of st.batches) {
        await prisma.batch.upsert({
          where: { id: b.id },
          update: {
            stapelId: st.id,
            commodityId: b.commodityId,
            batchNo: b.batchNo,
            brand: b.brand,
            koli: b.koli,
            unit: b.unit,
            weightPerUnitKg: b.weightPerUnitKg,
            dateIn: new Date(b.dateIn),
            expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
            origin: b.origin,
            suratJalan: b.suratJalan,
            kondisi: b.kondisi,
          },
          create: {
            id: b.id,
            stapelId: st.id,
            commodityId: b.commodityId,
            batchNo: b.batchNo,
            brand: b.brand,
            koli: b.koli,
            unit: b.unit,
            weightPerUnitKg: b.weightPerUnitKg,
            dateIn: new Date(b.dateIn),
            expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
            origin: b.origin,
            suratJalan: b.suratJalan,
            kondisi: b.kondisi,
          },
        });
      }
    }
  }

  // 6. Seed Initial Transactions
  console.log("-> Seeding Histori Mutasi Barang Masuk/Keluar...");
  for (const trx of INITIAL_TRANSACTIONS) {
    await prisma.transaction.upsert({
      where: { id: trx.id },
      update: {},
      create: {
        id: trx.id,
        type: trx.type,
        stapelId: trx.stapelId,
        gudang: trx.gudang,
        commodityName: trx.commodityName,
        brand: trx.brand,
        koli: trx.koli,
        unit: trx.unit,
        weightPerUnitKg: trx.weightPerUnitKg,
        totalKg: trx.totalKg,
        operator: trx.operator,
        suratJalan: trx.suratJalan,
        sourceOrDest: trx.sourceOrDest,
        timestamp: new Date(trx.timestamp),
        isOffline: trx.isOffline,
        notes: trx.notes,
      },
    });
  }

  // 7. Seed Initial Audit Logs
  console.log("-> Seeding Log Audit Awal...");
  const initialAuditLogs = [
    {
      id: "AUD-SEED-01",
      timestamp: new Date("2026-11-15T08:00:12Z"),
      user: "Budi Santoso",
      role: "operator",
      nip: "19930820 201802 1 003",
      action: "INBOUND_ENTRY",
      target: "G1-A2",
      details: "Penerimaan 400 Karung Beras Medium SPHP dari Subang, Jabar (SJ/PBR/2026/0525-01)",
      ipAddress: "192.168.0.115",
    },
    {
      id: "AUD-SEED-02",
      timestamp: new Date("2026-11-15T09:14:30Z"),
      user: "Hendra Wijaya, S.T.",
      role: "kepala_gudang",
      nip: "19820415 200801 1 004",
      action: "SYSTEM_INIT",
      target: "Kompleks CISKID",
      details: "Inisialisasi sistem database SIGAP BULOG Kompleks CISKID Kancab Bandung",
      ipAddress: "192.168.0.101",
    },
  ];

  for (const log of initialAuditLogs) {
    await prisma.auditLog.upsert({
      where: { id: log.id },
      update: {},
      create: log,
    });
  }

  console.log("✅ Seeding master data SIGAP BULOG selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
