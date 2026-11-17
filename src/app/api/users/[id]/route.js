// src/app/api/users/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit";

// GET: Detail satu pengguna
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
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
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data pengguna", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Perbarui pengguna (role, status, password, unit) & catat ke Audit Trail
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      email,
      nip,
      password,
      role,
      unitGudang,
      status,
      operatorName = "Administrator Pusat",
      operatorRole = "superadmin",
      operatorNip = "-",
      reason = "Pembaruan profil/wewenang akun pengguna",
    } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(nip && { nip }),
        ...(password && { password }),
        ...(role && { role }),
        ...(unitGudang && { unitGudang }),
        ...(status && { status }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        nip: true,
        role: true,
        unitGudang: true,
        status: true,
        lastLogin: true,
        updatedAt: true,
      },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "USER_UPDATE",
      target: updated.email,
      details: `Pembaruan akun ${updated.name} (ID: ${id}): [Role: ${existing.role} -> ${updated.role}, Status: ${existing.status} -> ${updated.status}]. Alasan: ${reason}.`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${updated.name} berhasil diperbarui`,
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui pengguna", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Hapus pengguna & catat ke Audit Trail
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const operatorName = searchParams.get("operatorName") || "Administrator Pusat";
    const operatorRole = searchParams.get("operatorRole") || "superadmin";
    const operatorNip = searchParams.get("operatorNip") || "-";

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Pengguna tidak ditemukan" },
        { status: 404 }
      );
    }

    if (existing.role === "superadmin") {
      const superadminCount = await prisma.user.count({ where: { role: "superadmin" } });
      if (superadminCount <= 1) {
        return NextResponse.json(
          { success: false, message: "Tidak dapat menghapus satu-satunya akun Superadmin" },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "USER_DELETE",
      target: existing.email,
      details: `Penghapusan akun: ${existing.name} (${existing.email}, Role: ${existing.role}, Unit: ${existing.unitGudang}).`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${existing.name} berhasil dihapus`,
    });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus pengguna", error: error.message },
      { status: 500 }
    );
  }
}
