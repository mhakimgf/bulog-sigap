// src/app/api/opname/records/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit";

// GET: Ambil seluruh catatan opname
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gudang = searchParams.get("gudang");

    const where = {
      ...(gudang && { gudang }),
    };

    const records = await prisma.opnameRecord.findMany({
      where,
      orderBy: { verifiedAt: "desc" },
      include: {
        stapel: {
          select: {
            name: true,
            capacityKoli: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("GET /api/opname/records error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data opname", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Reset seluruh catatan sesi opname
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user") || "Hendra Wijaya, S.T.";
    const role = searchParams.get("role") || "kepala_gudang";
    const nip = searchParams.get("nip") || "19820415 200801 1 004";

    const deleted = await prisma.opnameRecord.deleteMany({});

    await createAuditLog({
      action: "OPNAME_SESSION_RESET",
      target: "Sesi Stock Opname",
      details: `Seluruh catatan hitung fisik opname (${deleted.count} data) telah direset untuk persiapan sesi baru.`,
      user,
      role,
      nip,
    });

    return NextResponse.json({
      success: true,
      message: `Sesi stock opname berhasil direset (${deleted.count} data dihapus)`,
    });
  } catch (error) {
    console.error("DELETE /api/opname/records error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mereset sesi opname", error: error.message },
      { status: 500 }
    );
  }
}
