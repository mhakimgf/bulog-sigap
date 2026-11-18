// src/app/api/opname/record/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      stapelId,
      layerCount = 0,
      perLayerKoli = 0,
      peakKoli = 0,
      damagedKoli = 0,
      note = "",
      user = "Budi Santoso",
      role = "operator",
      nip = "19930820 201802 1 003",
    } = body;

    if (!stapelId) {
      return NextResponse.json(
        { success: false, message: "stapelId wajib disertakan" },
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

    const bookKoli = stapel.batches.reduce((sum, b) => sum + (b.koli || 0), 0);

    // Formula Standar Bulog: Fisik = (Lapis * perLapis) + Kunci Puncak - Rusak
    const layers = Number(layerCount) || 0;
    const perLayer = Number(perLayerKoli) || 0;
    const peak = Number(peakKoli) || 0;
    const damaged = Number(damagedKoli) || 0;
    const physicalKoli = Math.max(0, layers * perLayer + peak - damaged);
    const variance = physicalKoli - bookKoli;

    let varianceStatus = "match";
    if (variance < 0) varianceStatus = "shortage";
    else if (variance > 0) varianceStatus = "surplus";

    // Simpan ke OpnameRecord
    const record = await prisma.opnameRecord.create({
      data: {
        stapelId,
        gudang: stapel.gudang,
        block: stapel.block,
        number: stapel.number,
        bookKoli,
        physicalKoli,
        variance,
        varianceStatus,
        layerCount: layers,
        perLayerKoli: perLayer,
        peakKoli: peak,
        damagedKoli: damaged,
        note,
        verifiedBy: user,
        verifiedNip: nip,
      },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "OPNAME_STAPEL_VERIFY",
      target: stapelId,
      details: `Hasil hitung fisik tumpukan ${stapelId}: Fisik ${physicalKoli} koli vs Buku ${bookKoli} koli (Selisih: ${variance >= 0 ? "+" : ""}${variance}). Status: ${varianceStatus.toUpperCase()}. Catatan: ${note || "-"}`,
      user,
      role,
      nip,
    });

    return NextResponse.json({
      success: true,
      message: `Hasil opname ${stapelId} berhasil dicatat (${varianceStatus})`,
      data: record,
    });
  } catch (error: any) {
    console.error("POST /api/opname/record error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mencatat hasil opname", error: error.message },
      { status: 500 }
    );
  }
}
