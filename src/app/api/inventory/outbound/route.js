// src/app/api/inventory/outbound/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit";
import { checkIsFreezeMode } from "../../opname/freeze/route";

function getStapelStatus(totalKoli, capacity = 1000) {
  if (totalKoli <= 0) return "kosong";
  if (totalKoli >= capacity * 0.8) return "penuh";
  return "sebagian";
}

export async function POST(request) {
  try {
    if (checkIsFreezeMode()) {
      return NextResponse.json(
        {
          success: false,
          message: "Pengeluaran barang ditolak: Kompleks Pergudangan sedang dalam sesi pembekuan mutasi fisik (Freeze Mode) untuk Stock Opname.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      stapelId,
      batchId,
      koliToRelease,
      destination = "Distribusi Pangan Bulog",
      suratJalan,
      operator = "Budi Santoso",
      operatorRole = "operator",
      operatorNip = "-",
      notes = "",
      isOffline = false,
      bypassFifo = false,
      bypassReason = "",
    } = body;

    const koliNum = parseInt(koliToRelease, 10);
    if (!stapelId || !batchId || !koliNum || koliNum <= 0) {
      return NextResponse.json(
        { success: false, message: "Parameter stapelId, batchId, dan koliToRelease wajib valid" },
        { status: 400 }
      );
    }

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        commodity: true,
        stapel: true,
      },
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch tidak ditemukan" },
        { status: 404 }
      );
    }

    if (batch.koli < koliNum) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok pada batch (${batch.koli} koli) tidak mencukupi permintaan pengeluaran (${koliNum} koli)`,
        },
        { status: 400 }
      );
    }

    const remainingKoli = batch.koli - koliNum;
    if (remainingKoli === 0) {
      await prisma.batch.delete({ where: { id: batchId } });
    } else {
      await prisma.batch.update({
        where: { id: batchId },
        data: { koli: remainingKoli },
      });
    }

    // Update status stapel
    const remainingBatches = await prisma.batch.findMany({ where: { stapelId } });
    const currentTotalKoli = remainingBatches.reduce((a, b) => a + b.koli, 0);
    await prisma.stapel.update({
      where: { id: stapelId },
      data: {
        status: getStapelStatus(currentTotalKoli, batch.stapel.capacityKoli),
      },
    });

    const finalSuratJalan = suratJalan || `DO-${Date.now().toString().slice(-6)}`;

    // Catat Transaksi Keluar
    const transaction = await prisma.transaction.create({
      data: {
        type: "KELUAR",
        stapelId,
        gudang: batch.stapel.gudang,
        commodityName: batch.commodity.name,
        brand: batch.brand,
        koli: koliNum,
        unit: batch.unit,
        weightPerUnitKg: batch.weightPerUnitKg,
        totalKg: koliNum * batch.weightPerUnitKg,
        operator,
        suratJalan: finalSuratJalan,
        sourceOrDest: destination,
        isOffline,
        notes: notes || "Pengeluaran komoditas penyaluran",
      },
    });

    // Catat ke Audit Trail
    const fifoNotice = bypassFifo ? ` [BYPASS FIFO OTORISASI: ${bypassReason}]` : "";
    await createAuditLog({
      action: "OUTBOUND_RELEASE",
      target: stapelId,
      details: `Penyaluran ${koliNum} ${batch.unit} ${batch.commodity.name} (${batch.brand}) dari ${stapelId}. No. DO: ${finalSuratJalan}, Tujuan: ${destination}.${fifoNotice} Keterangan: ${notes || "-"}`,
      user: operator,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Sukses mengeluarkan ${koliNum} ${batch.unit} ${batch.commodity.name} dari ${stapelId}`,
      data: {
        remainingKoli,
        transaction,
      },
    });
  } catch (error) {
    console.error("POST /api/inventory/outbound error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memproses pengeluaran barang", error: error.message },
      { status: 500 }
    );
  }
}
