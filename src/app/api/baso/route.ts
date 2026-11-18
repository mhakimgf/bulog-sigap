// src/app/api/baso/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET: Ambil daftar seluruh dokumen resmi BASO
export async function GET(): Promise<NextResponse> {
  try {
    const reports = await prisma.basoReport.findMany({
      include: {
        warehouse: true,
        createdBy: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error: any) {
    console.error("GET /api/baso error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar dokumen BASO", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Terbitkan & simpan Berita Acara Stock Opname (BASO) baru
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      reportNumber,
      warehouseId = "wh-ciskid",
      periodDate,
      totalTonase,
      totalKoli,
      stapelCount,
      accuracyRate = 100.0,
      signedBy = "Hendra Wijaya, S.T.",
      signerNip = "19820415 200801 1 004",
      createdById,
      operatorName = "Hendra Wijaya, S.T.",
      operatorRole = "kepala_gudang",
    } = body;

    const finalReportNo =
      reportNumber ||
      `BA-SO/CISKID/${new Date().getFullYear()}/${new Date().toLocaleDateString("id-ID", { month: "2-digit" })}/${Date.now().toString().slice(-4)}`;

    const newBaso = await prisma.basoReport.create({
      data: {
        reportNumber: finalReportNo,
        warehouseId,
        periodDate: periodDate ? new Date(periodDate) : new Date(),
        totalTonase: parseFloat(totalTonase) || 0,
        totalKoli: parseInt(totalKoli, 10) || 0,
        stapelCount: parseInt(stapelCount, 10) || 0,
        accuracyRate: parseFloat(accuracyRate) || 100.0,
        signedBy,
        signerNip,
        createdById: createdById || null,
      },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "BASO_GENERATE",
      target: finalReportNo,
      details: `Penerbitan Dokumen Resmi Berita Acara Stock Opname: ${finalReportNo} (Total: ${newBaso.totalKoli} koli, ${newBaso.totalTonase} Ton, Akurasi: ${newBaso.accuracyRate}%). Ditandatangani oleh: ${signedBy} (NIP: ${signerNip}).`,
      user: operatorName,
      role: operatorRole,
      nip: signerNip,
    });

    return NextResponse.json({
      success: true,
      message: `Dokumen BASO ${finalReportNo} berhasil diterbitkan dan diarsipkan`,
      data: newBaso,
    });
  } catch (error: any) {
    console.error("POST /api/baso error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menerbitkan dokumen BASO", error: error.message },
      { status: 500 }
    );
  }
}
