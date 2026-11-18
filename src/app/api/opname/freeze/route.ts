// src/app/api/opname/freeze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";

// Global in-memory freeze status state (persistent across session)
let isGlobalFreezeMode = false;
let freezeActivatedBy: string | null = null;
let freezeActivatedAt: string | null = null;

export function checkIsFreezeMode(): boolean {
  return isGlobalFreezeMode;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    data: {
      isFreezeMode: isGlobalFreezeMode,
      activatedBy: freezeActivatedBy,
      activatedAt: freezeActivatedAt,
    },
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      isFreeze,
      user = "Hendra Wijaya, S.T.",
      role = "kepala_gudang",
      nip = "19820415 200801 1 004",
    } = body;

    isGlobalFreezeMode = isFreeze !== undefined ? Boolean(isFreeze) : !isGlobalFreezeMode;
    freezeActivatedBy = isGlobalFreezeMode ? user : null;
    freezeActivatedAt = isGlobalFreezeMode ? new Date().toISOString() : null;

    // Catat ke Audit Trail
    await createAuditLog({
      action: isGlobalFreezeMode ? "FREEZE_MODE_ACTIVATED" : "FREEZE_MODE_DEACTIVATED",
      target: "Kompleks CISKID (Seluruh Gudang)",
      details: isGlobalFreezeMode
        ? "Pembekuan mutasi fisik diaktifkan untuk memulai sesi Stock Opname Bulog."
        : "Pembekuan mutasi dinonaktifkan. Mutasi keluar/masuk kembali beroperasi normal.",
      user,
      role,
      nip,
    });

    return NextResponse.json({
      success: true,
      message: isGlobalFreezeMode
        ? "Pembekuan mutasi berhasil diaktifkan. Seluruh pergerakan barang dibekukan."
        : "Pembekuan mutasi dibuka kembali.",
      data: {
        isFreezeMode: isGlobalFreezeMode,
        activatedBy: freezeActivatedBy,
        activatedAt: freezeActivatedAt,
      },
    });
  } catch (error: any) {
    console.error("POST /api/opname/freeze error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengatur status pembekuan mutasi", error: error.message },
      { status: 500 }
    );
  }
}
