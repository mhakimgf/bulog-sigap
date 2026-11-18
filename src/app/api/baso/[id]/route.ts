// src/app/api/baso/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
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
  } catch (error: any) {
    console.error("GET /api/baso/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data BASO", error: error.message },
      { status: 500 }
    );
  }
}
