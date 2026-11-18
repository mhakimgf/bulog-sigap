// src/app/api/audit-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET: Ambil daftar seluruh catatan audit trail (GRC BUMN Bulog)
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where: Record<string, any> = {
      ...(action && { action }),
      ...(role && { role }),
      ...(search && {
        OR: [
          { user: { contains: search, mode: "insensitive" } },
          { nip: { contains: search, mode: "insensitive" } },
          { target: { contains: search, mode: "insensitive" } },
          { details: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data audit trail", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Tambahkan entri audit log kustom
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, target, details, user, role, nip, userId, ipAddress } = body;

    if (!action || !target || !details) {
      return NextResponse.json(
        { success: false, message: "Parameter action, target, dan details wajib diisi" },
        { status: 400 }
      );
    }

    const log = await createAuditLog({
      action,
      target,
      details,
      user,
      role,
      nip,
      userId,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Log audit berhasil dicatat",
      data: log,
    });
  } catch (error: any) {
    console.error("POST /api/audit-logs error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mencatat audit log", error: error.message },
      { status: 500 }
    );
  }
}
