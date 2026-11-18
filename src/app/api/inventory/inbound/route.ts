// src/app/api/inventory/inbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { checkIsFreezeMode } from "@/app/api/opname/freeze/route";
import { StapelStatus } from "@/types/warehouse";

function getStapelStatus(totalKoli: number, capacity = 1000): StapelStatus {
  if (totalKoli <= 0) return "kosong";
  if (totalKoli >= capacity * 0.8) return "penuh";
  return "sebagian";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Validasi Freeze Mode
    if (checkIsFreezeMode()) {
      return NextResponse.json(
        {
          success: false,
          message: "Mutasi barang masuk ditolak: Kompleks Pergudangan sedang dalam sesi pembekuan mutasi fisik (Freeze Mode) untuk Stock Opname.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      stapelId,
      commodityId,
      brand,
      koli,
      unit = "Karung",
      weightPerUnitKg = 50,
      dateIn,
      expiryDate,
      origin = "Pusat Pengadaan Bulog",
      suratJalan,
      kondisi = "Baik",
      notes = "",
      operator = "Budi Santoso",
      operatorRole = "operator",
      operatorNip = "-",
      isOffline = false,
    } = body;

    const koliNum = parseInt(koli, 10);
    if (!stapelId || !commodityId || isNaN(koliNum) || koliNum <= 0) {
      return NextResponse.json(
        { success: false, message: "Parameter stapelId, commodityId, dan koli wajib diisi dengan angka positif (> 0)" },
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

    // 2. Validasi Kapasitas Maksimum Stapel
    const currentOccupied = stapel.batches.reduce((sum, b) => sum + b.koli, 0);
    if (currentOccupied + koliNum > stapel.capacityKoli) {
      return NextResponse.json(
        {
          success: false,
          message: `Kapasitas stapel tidak mencukupi (Sisa ruang: ${stapel.capacityKoli - currentOccupied} koli, Permintaan masuk: ${koliNum} koli)`,
        },
        { status: 400 }
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

    const weightNum = parseFloat(weightPerUnitKg) || commodity.defaultWeight || 50;
    const finalSuratJalan = suratJalan || `SJ-INB-${Date.now().toString().slice(-6)}`;
    const batchNo = `Batch #${Math.floor(Math.random() * 80) + 10}`;

    // Buat Batch baru
    const newBatch = await prisma.batch.create({
      data: {
        stapelId,
        commodityId,
        batchNo,
        brand: brand || commodity.name,
        koli: koliNum,
        unit,
        weightPerUnitKg: weightNum,
        dateIn: dateIn ? new Date(dateIn) : new Date("2026-11-15T00:00:00Z"),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        origin,
        suratJalan: finalSuratJalan,
        kondisi,
        notes,
      },
    });

    // Update status stapel
    const allBatches = await prisma.batch.findMany({ where: { stapelId } });
    const totalKoli = allBatches.reduce((a, b) => a + b.koli, 0);
    await prisma.stapel.update({
      where: { id: stapelId },
      data: {
        status: getStapelStatus(totalKoli, stapel.capacityKoli),
      },
    });

    // Buat catatan Transaksi Masuk
    const transaction = await prisma.transaction.create({
      data: {
        type: "MASUK",
        stapelId,
        gudang: stapel.gudang,
        commodityName: commodity.name,
        brand: newBatch.brand,
        koli: koliNum,
        unit,
        weightPerUnitKg: weightNum,
        totalKg: koliNum * weightNum,
        operator,
        suratJalan: finalSuratJalan,
        sourceOrDest: origin,
        isOffline,
        notes: notes || "Penerimaan komoditas gudang",
      },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "INBOUND_ENTRY",
      target: stapelId,
      details: `Penerimaan ${koliNum} ${unit} ${commodity.name} (${newBatch.brand}) di ${stapelId}. Surat Jalan: ${finalSuratJalan}, Asal: ${origin}. Keterangan: ${notes || "-"}`,
      user: operator,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Sukses menerima ${koliNum} ${unit} ${commodity.name} di ${stapelId}`,
      data: {
        batch: newBatch,
        transaction,
      },
    });
  } catch (error: any) {
    console.error("POST /api/inventory/inbound error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses penerimaan barang masuk", error: error.message },
      { status: 500 }
    );
  }
}
