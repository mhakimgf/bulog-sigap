// src/app/api/inventory/batches/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit";

// Helper status keterisian stapel
function getStapelStatus(totalKoli, capacity = 1000) {
  if (totalKoli <= 0) return "kosong";
  if (totalKoli >= capacity * 0.8) return "penuh";
  return "sebagian";
}

// GET: Ambil seluruh batch barang yang ada di gudang
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stapelId = searchParams.get("stapelId");
    const commodityId = searchParams.get("commodityId");
    const gudang = searchParams.get("gudang");
    const kondisi = searchParams.get("kondisi");

    const where = {
      ...(stapelId && { stapelId }),
      ...(commodityId && { commodityId }),
      ...(kondisi && { kondisi }),
      ...(gudang && {
        stapel: {
          gudang,
        },
      }),
    };

    const batches = await prisma.batch.findMany({
      where,
      include: {
        commodity: true,
        stapel: {
          select: {
            id: true,
            gudang: true,
            block: true,
            number: true,
            name: true,
            capacityKoli: true,
            status: true,
          },
        },
      },
      orderBy: { dateIn: "asc" }, // Prioritas FIFO tertua di atas
    });

    // Perkaya data dengan perhitungan umur simpan (aging)
    const now = new Date("2026-11-15T00:00:00Z");
    const enriched = batches.map((b) => {
      const inDate = new Date(b.dateIn);
      const diffTime = Math.max(0, now - inDate);
      const agingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const maxDays = b.commodity?.maxShelfLifeDays || 180;

      let shelfLifeStatus = "optimal";
      if (agingDays > maxDays) shelfLifeStatus = "kritis";
      else if (agingDays >= 150) shelfLifeStatus = "prioritas";
      else if (agingDays >= 90) shelfLifeStatus = "waspada";

      return {
        ...b,
        agingDays,
        shelfLifeStatus,
        totalKg: b.koli * b.weightPerUnitKg,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("GET /api/inventory/batches error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data batch gudang", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Tambah batch barang baru secara langsung & catat ke Audit Log
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      stapelId,
      commodityId,
      batchNo,
      brand,
      koli,
      unit = "Karung",
      weightPerUnitKg = 50,
      dateIn,
      expiryDate,
      origin = "Pusat Pengadaan Bulog",
      suratJalan = "",
      kondisi = "Baik",
      notes = "",
      operatorName = "Petugas Gudang",
      operatorRole = "operator",
      operatorNip = "-",
      reason = "Pencatatan saldo awal / koreksi manual",
    } = body;

    if (!stapelId || !commodityId || !koli) {
      return NextResponse.json(
        { success: false, message: "Stapel, komoditas, dan jumlah koli wajib diisi" },
        { status: 400 }
      );
    }

    const stapel = await prisma.stapel.findUnique({
      where: { id: stapelId },
      include: { batches: true },
    });

    if (!stapel) {
      return NextResponse.json(
        { success: false, message: `Stapel "${stapelId}" tidak ditemukan` },
        { status: 404 }
      );
    }

    const commodity = await prisma.commodity.findUnique({
      where: { id: commodityId },
    });

    if (!commodity) {
      return NextResponse.json(
        { success: false, message: `Komoditas "${commodityId}" tidak ditemukan` },
        { status: 404 }
      );
    }

    const koliNum = parseInt(koli, 10);
    const weightNum = parseFloat(weightPerUnitKg) || commodity.defaultWeight || 50;
    const finalBatchNo = batchNo || `Batch #${Math.floor(Math.random() * 90) + 10}`;

    const newBatch = await prisma.batch.create({
      data: {
        stapelId,
        commodityId,
        batchNo: finalBatchNo,
        brand: brand || commodity.name,
        koli: koliNum,
        unit,
        weightPerUnitKg: weightNum,
        dateIn: dateIn ? new Date(dateIn) : new Date("2026-11-15T00:00:00Z"),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        origin,
        suratJalan: suratJalan || `SJ-MANUAL-${Date.now().toString().slice(-6)}`,
        kondisi,
        notes,
      },
    });

    // Update status keterisian stapel
    const allBatches = await prisma.batch.findMany({ where: { stapelId } });
    const currentTotalKoli = allBatches.reduce((acc, curr) => acc + curr.koli, 0);
    await prisma.stapel.update({
      where: { id: stapelId },
      data: {
        status: getStapelStatus(currentTotalKoli, stapel.capacityKoli),
      },
    });

    // Buat riwayat transaksi penyesuaian
    await prisma.transaction.create({
      data: {
        type: "PENYESUAIAN",
        stapelId,
        gudang: stapel.gudang,
        commodityName: commodity.name,
        brand: newBatch.brand,
        koli: koliNum,
        unit,
        weightPerUnitKg: weightNum,
        totalKg: koliNum * weightNum,
        operator: operatorName,
        suratJalan: newBatch.suratJalan,
        sourceOrDest: origin,
        isOffline: false,
        notes: `Penambahan batch manual: ${reason}`,
      },
    });

    // Catat ke Audit Trail (Kepatuhan BUMN)
    await createAuditLog({
      action: "BATCH_CREATE",
      target: `${stapelId} / ${newBatch.id}`,
      details: `Penambahan batch baru di ${stapelId}: ${newBatch.batchNo} (${koliNum} ${unit} ${commodity.name}, Merek: ${newBatch.brand}, Asal: ${origin}). Alasan: ${reason}.`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Batch ${newBatch.batchNo} berhasil ditambahkan di ${stapelId}`,
      data: newBatch,
    });
  } catch (error) {
    console.error("POST /api/inventory/batches error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan batch", error: error.message },
      { status: 500 }
    );
  }
}
