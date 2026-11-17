// src/app/api/stapels/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit";

// GET: Ambil detail lengkap satu stapel
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const stapel = await prisma.stapel.findUnique({
      where: { id },
      include: {
        warehouse: true,
        unit: true,
        batches: {
          include: {
            commodity: true,
          },
          orderBy: { dateIn: "asc" },
        },
        transactions: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
        opnameRecords: {
          orderBy: { verifiedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!stapel) {
      return NextResponse.json(
        { success: false, message: "Stapel tidak ditemukan" },
        { status: 404 }
      );
    }

    const now = new Date("2026-11-15T00:00:00Z");
    let totalKoli = 0;
    let totalKg = 0;

    const enrichedBatches = stapel.batches.map((b) => {
      const inDate = new Date(b.dateIn);
      const diffTime = Math.max(0, now - inDate);
      const agingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const maxDays = b.commodity?.maxShelfLifeDays || 180;

      totalKoli += b.koli;
      totalKg += b.koli * b.weightPerUnitKg;

      return {
        ...b,
        agingDays,
        maxShelfLifeDays: maxDays,
        isFifoPriority: agingDays >= 150,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...stapel,
        batches: enrichedBatches,
        totalKoli,
        totalTonase: parseFloat((totalKg / 1000).toFixed(2)),
        occupancyPct: Math.round((totalKoli / stapel.capacityKoli) * 100),
      },
    });
  } catch (error) {
    console.error("GET /api/stapels/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data detail stapel", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Perbarui kapasitas atau status stapel
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status,
      capacityKoli,
      operatorName = "Kepala Gudang",
      operatorRole = "kepala_gudang",
      operatorNip = "-",
      reason = "Penyesuaian kapasitas fisik tiang stapel",
    } = body;

    const existing = await prisma.stapel.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Stapel tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await prisma.stapel.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(capacityKoli !== undefined && { capacityKoli: parseInt(capacityKoli, 10) }),
      },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "STAPEL_UPDATE",
      target: id,
      details: `Perubahan data stapel ${id}: [Status: ${existing.status} -> ${updated.status}, Kapasitas: ${existing.capacityKoli} -> ${updated.capacityKoli} koli]. Alasan: ${reason}.`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Stapel ${id} berhasil diperbarui`,
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/stapels/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui stapel", error: error.message },
      { status: 500 }
    );
  }
}
