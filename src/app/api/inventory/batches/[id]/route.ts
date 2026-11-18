// src/app/api/inventory/batches/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { StapelStatus } from "@/types/warehouse";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getStapelStatus(totalKoli: number, capacity = 1000): StapelStatus {
  if (totalKoli <= 0) return "kosong";
  if (totalKoli >= capacity * 0.8) return "penuh";
  return "sebagian";
}

// GET: Ambil detail spesifik satu batch
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const batch = await prisma.batch.findUnique({
      where: { id },
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

    return NextResponse.json({
      success: true,
      data: batch,
    });
  } catch (error: any) {
    console.error("GET /api/inventory/batches/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data batch", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Perbarui batch (koli, kondisi, pindah stapel, tanggal masuk, catatan) & catat ke Audit Log
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      koli,
      kondisi,
      brand,
      origin,
      suratJalan,
      notes,
      stapelId: newStapelId,
      dateIn,
      expiryDate,
      operatorName = "Petugas Gudang",
      operatorRole = "operator",
      operatorNip = "-",
      reason = "Koreksi fisik / perubahan kondisi komoditas",
    } = body;

    const existing = await prisma.batch.findUnique({
      where: { id },
      include: {
        stapel: true,
        commodity: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Batch tidak ditemukan" },
        { status: 404 }
      );
    }

    const oldKoli = existing.koli;
    const newKoli = koli !== undefined ? parseInt(koli, 10) : oldKoli;
    const isRelocating = Boolean(newStapelId && newStapelId !== existing.stapelId);

    if (isRelocating && newStapelId) {
      const targetStapel = await prisma.stapel.findUnique({ where: { id: newStapelId } });
      if (!targetStapel) {
        return NextResponse.json(
          { success: false, message: `Stapel tujuan "${newStapelId}" tidak ditemukan` },
          { status: 404 }
        );
      }
    }

    const updated = await prisma.batch.update({
      where: { id },
      data: {
        ...(koli !== undefined && { koli: newKoli }),
        ...(kondisi && { kondisi }),
        ...(brand && { brand }),
        ...(origin && { origin }),
        ...(suratJalan && { suratJalan }),
        ...(notes !== undefined && { notes }),
        ...(newStapelId && { stapelId: newStapelId }),
        ...(dateIn && { dateIn: new Date(dateIn) }),
        ...(expiryDate !== undefined && {
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        }),
      },
      include: {
        stapel: true,
        commodity: true,
      },
    });

    // Update status stapel asal & stapel tujuan jika berpindah
    const currentBatchesOrigin = await prisma.batch.findMany({
      where: { stapelId: existing.stapelId },
    });
    const totalKoliOrigin = currentBatchesOrigin.reduce((a, b) => a + b.koli, 0);
    await prisma.stapel.update({
      where: { id: existing.stapelId },
      data: {
        status: getStapelStatus(totalKoliOrigin, existing.stapel.capacityKoli),
      },
    });

    if (isRelocating && newStapelId) {
      const currentBatchesDest = await prisma.batch.findMany({
        where: { stapelId: newStapelId },
      });
      const totalKoliDest = currentBatchesDest.reduce((a, b) => a + b.koli, 0);
      await prisma.stapel.update({
        where: { id: newStapelId },
        data: {
          status: getStapelStatus(totalKoliDest, 1000),
        },
      });
    }

    // Catat ke transaksi mutasi jika ada perubahan koli atau relokasi
    if (newKoli !== oldKoli || isRelocating) {
      const deltaKoli = newKoli - oldKoli;
      await prisma.transaction.create({
        data: {
          type: "PENYESUAIAN",
          stapelId: updated.stapelId,
          gudang: updated.stapel.gudang,
          commodityName: updated.commodity.name,
          brand: updated.brand,
          koli: Math.abs(deltaKoli) || newKoli,
          unit: updated.unit,
          weightPerUnitKg: updated.weightPerUnitKg,
          totalKg: (Math.abs(deltaKoli) || newKoli) * updated.weightPerUnitKg,
          operator: operatorName,
          suratJalan: updated.suratJalan,
          sourceOrDest: isRelocating
            ? `Relokasi dari ${existing.stapelId} ke ${newStapelId}`
            : `Koreksi Koli (${oldKoli} -> ${newKoli})`,
          isOffline: false,
          notes: `Penyesuaian batch: ${reason}`,
        },
      });
    }

    // Catat ke Audit Trail (Kepatuhan BUMN)
    await createAuditLog({
      action: isRelocating ? "BATCH_RELOCATION" : "BATCH_ADJUSTMENT",
      target: `${updated.stapelId} / ${updated.batchNo}`,
      details: `Pembaruan data batch ${updated.batchNo} (Komoditas: ${updated.commodity.name}): [Perubahan: ${JSON.stringify({
        koli: `${oldKoli} -> ${newKoli}`,
        kondisi: `${existing.kondisi} -> ${updated.kondisi}`,
        stapel: isRelocating ? `${existing.stapelId} -> ${newStapelId}` : existing.stapelId,
      })}]. Alasan: ${reason}.`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Batch ${updated.batchNo} berhasil diperbarui`,
      data: updated,
    });
  } catch (error: any) {
    console.error("PUT /api/inventory/batches/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui batch", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Hapus batch barang dari gudang & catat ke Audit Log
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const operatorName = searchParams.get("operatorName") || "Petugas Gudang";
    const operatorRole = searchParams.get("operatorRole") || "operator";
    const operatorNip = searchParams.get("operatorNip") || "-";
    const reason = searchParams.get("reason") || "Pemusnahan barang rusak / koreksi saldo ganda";

    const existing = await prisma.batch.findUnique({
      where: { id },
      include: {
        stapel: true,
        commodity: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Batch tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.batch.delete({
      where: { id },
    });

    // Update status keterisian stapel
    const remainingBatches = await prisma.batch.findMany({
      where: { stapelId: existing.stapelId },
    });
    const totalKoli = remainingBatches.reduce((a, b) => a + b.koli, 0);
    await prisma.stapel.update({
      where: { id: existing.stapelId },
      data: {
        status: getStapelStatus(totalKoli, existing.stapel.capacityKoli),
      },
    });

    // Catat ke Transaksi Penyesuaian
    await prisma.transaction.create({
      data: {
        type: "PENYESUAIAN",
        stapelId: existing.stapelId,
        gudang: existing.stapel.gudang,
        commodityName: existing.commodity.name,
        brand: existing.brand,
        koli: existing.koli,
        unit: existing.unit,
        weightPerUnitKg: existing.weightPerUnitKg,
        totalKg: existing.koli * existing.weightPerUnitKg,
        operator: operatorName,
        suratJalan: existing.suratJalan,
        sourceOrDest: "Penghapusan / Pemusnahan",
        isOffline: false,
        notes: `Penghapusan batch: ${reason}`,
      },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "BATCH_DELETE",
      target: `${existing.stapelId} / ${existing.batchNo}`,
      details: `Penghapusan batch ${existing.batchNo} (${existing.koli} ${existing.unit} ${existing.commodity.name}) dari stapel ${existing.stapelId}. Alasan: ${reason}.`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Batch ${existing.batchNo} berhasil dihapus dari stapel ${existing.stapelId}`,
    });
  } catch (error: any) {
    console.error("DELETE /api/inventory/batches/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus batch", error: error.message },
      { status: 500 }
    );
  }
}
