// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionCookie = request.cookies.get("sigap_session");
    let userId: string | null = null;

    if (sessionCookie?.value) {
      try {
        const parsed = JSON.parse(sessionCookie.value);
        userId = parsed.id;
      } catch {}
    }

    if (userId) {
      await createAuditLog({
        action: "USER_LOGOUT",
        target: userId,
        details: "Pengguna keluar dari sesi SIGAP Bulog.",
        userId,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Sesi berhasil diakhiri",
    });

    response.cookies.delete("sigap_session");
    return response;
  } catch (error: any) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengakhiri sesi", error: error.message },
      { status: 500 }
    );
  }
}
