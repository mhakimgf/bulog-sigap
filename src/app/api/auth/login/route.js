// src/app/api/auth/login/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit";

export async function POST(request) {
  try {
    const body = await request.json();
    const { emailOrNip, password } = body;

    const trimmedInput = (emailOrNip || "").trim().toLowerCase();
    const trimmedPass = (password || "").trim();

    if (!trimmedInput || !trimmedPass) {
      return NextResponse.json(
        { success: false, message: "Email/NIP dan kata sandi wajib diisi" },
        { status: 400 }
      );
    }

    // Cari user berdasarkan email atau NIP
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: trimmedInput, mode: "insensitive" } },
          { nip: { equals: trimmedInput, mode: "insensitive" } },
        ],
      },
    });

    if (!user || user.password !== trimmedPass) {
      return NextResponse.json(
        { success: false, message: "Email/NIP atau kata sandi tidak sesuai" },
        { status: 401 }
      );
    }

    if (user.status === "nonaktif") {
      return NextResponse.json(
        { success: false, message: "Akun ini telah dinonaktifkan. Silakan hubungi Administrator Pusat." },
        { status: 403 }
      );
    }

    // Perbarui waktu login terakhir
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "USER_LOGIN",
      target: user.email,
      details: `Pengguna ${user.name} (${user.role}) berhasil masuk ke sistem SIGAP Bulog.`,
      user: user.name,
      role: user.role,
      nip: user.nip,
      userId: user.id,
    });

    const response = NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${user.name}!`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        nip: user.nip,
        role: user.role,
        unitGudang: user.unitGudang,
        status: user.status,
        lastLogin: updatedUser.lastLogin,
      },
    });

    // Pasang session cookie HTTP-Only
    response.cookies.set("sigap_session", JSON.stringify({ id: user.id, role: user.role }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat memproses login", error: error.message },
      { status: 500 }
    );
  }
}
