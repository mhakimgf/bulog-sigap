// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionCookie = request.cookies.get("sigap_session");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { success: false, message: "Tidak ada sesi aktif" },
        { status: 401 }
      );
    }

    let sessionData: { id?: string; role?: string };
    try {
      sessionData = JSON.parse(sessionCookie.value);
    } catch {
      return NextResponse.json(
        { success: false, message: "Format sesi tidak valid" },
        { status: 401 }
      );
    }

    if (!sessionData?.id) {
      return NextResponse.json(
        { success: false, message: "Format sesi tidak valid" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.id },
      select: {
        id: true,
        name: true,
        email: true,
        nip: true,
        role: true,
        unitGudang: true,
        status: true,
        lastLogin: true,
      },
    });

    if (!user || user.status === "nonaktif") {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan atau dinonaktifkan" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memverifikasi sesi", error: error.message },
      { status: 500 }
    );
  }
}
