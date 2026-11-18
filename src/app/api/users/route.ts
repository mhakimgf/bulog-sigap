// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// GET: Ambil daftar seluruh pengguna (khusus Superadmin & Kepala Gudang)
export async function GET(): Promise<NextResponse> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        nip: true,
        role: true,
        unitGudang: true,
        status: true,
        lastLogin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil daftar pengguna", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Buat pengguna baru & catat ke Audit Trail
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      name,
      email,
      nip,
      password = "operator123",
      role = "operator",
      unitGudang = "GBB CISKID",
      status = "aktif",
      operatorName = "Administrator Pusat",
      operatorRole = "superadmin",
      operatorNip = "-",
    } = body;

    if (!name || !email || !nip) {
      return NextResponse.json(
        { success: false, message: "Nama, Email, dan NIP wajib diisi" },
        { status: 400 }
      );
    }

    // Cek duplikasi email atau NIP
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { nip }],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: existing.email === email ? "Email sudah terdaftar" : "NIP sudah terdaftar",
        },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        nip,
        password,
        role,
        unitGudang,
        status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        nip: true,
        role: true,
        unitGudang: true,
        status: true,
        createdAt: true,
      },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "USER_CREATE",
      target: newUser.email,
      details: `Pendaftaran akun pengguna baru: ${newUser.name} (Role: ${newUser.role}, NIP: ${newUser.nip}, Unit: ${newUser.unitGudang}).`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${newUser.name} berhasil didaftarkan`,
      data: newUser,
    });
  } catch (error: any) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membuat pengguna", error: error.message },
      { status: 500 }
    );
  }
}
