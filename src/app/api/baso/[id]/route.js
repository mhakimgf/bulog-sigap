// src/app/api/baso/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const report = await prisma.basoReport.findUnique({
      where: { id },
      include: {
        warehouse: {
          include: {
            units: true,
          },
        },
        createdBy: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { success: false, message: "Dokumen BASO tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("GET /api/baso/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data BASO", error: error.message },
      { status: 500 }
    );
  }
}
