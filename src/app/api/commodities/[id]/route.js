// src/app/api/commodities/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { createAuditLog } from "../../../../lib/audit";

// GET: Ambil detail satu komoditas
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const commodity = await prisma.commodity.findUnique({
      where: { id },
      include: {
        batches: {
          include: {
            stapel: true,
          },
        },
      },
    });

    if (!commodity) {
      return NextResponse.json(
        { success: false, message: "Komoditas tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: commodity,
    });
  } catch (error) {
    console.error("GET /api/commodities/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data komoditas", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Perbarui data komoditas & catat ke Audit Log
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      category,
      defaultUnit,
      defaultWeight,
      maxShelfLifeDays,
      icon,
      color,
      operatorName = "Superadmin Bulog",
      operatorRole = "superadmin",
      operatorNip = "-",
      reason = "Pembaruan spesifikasi standar komoditas",
    } = body;

    const existing = await prisma.commodity.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Komoditas tidak ditemukan" },
        { status: 404 }
      );
    }

    const updated = await prisma.commodity.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(defaultUnit && { defaultUnit }),
        ...(defaultWeight !== undefined && { defaultWeight: Number(defaultWeight) }),
        ...(maxShelfLifeDays !== undefined && { maxShelfLifeDays: Number(maxShelfLifeDays) }),
        ...(icon && { icon }),
        ...(color && { color }),
      },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "COMMODITY_UPDATE",
      target: id,
      details: `Pembaruan data komoditas "${existing.name}" (ID: ${id}): Perubahan nilai [${JSON.stringify({
        sebelum: {
          name: existing.name,
          maxShelfLifeDays: existing.maxShelfLifeDays,
          defaultWeight: existing.defaultWeight,
        },
        sesudah: {
          name: updated.name,
          maxShelfLifeDays: updated.maxShelfLifeDays,
          defaultWeight: updated.defaultWeight,
        },
      })}]. Alasan: ${reason}.`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Komoditas "${updated.name}" berhasil diperbarui`,
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/commodities/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui komoditas", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Hapus komoditas & catat ke Audit Log
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const operatorName = searchParams.get("operatorName") || "Superadmin Bulog";
    const operatorRole = searchParams.get("operatorRole") || "superadmin";
    const operatorNip = searchParams.get("operatorNip") || "-";

    const existing = await prisma.commodity.findUnique({
      where: { id },
      include: {
        _count: {
          select: { batches: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Komoditas tidak ditemukan" },
        { status: 404 }
      );
    }

    if (existing._count.batches > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Komoditas "${existing.name}" tidak dapat dihapus karena masih memiliki ${existing._count.batches} batch aktif di gudang.`,
        },
        { status: 400 }
      );
    }

    await prisma.commodity.delete({
      where: { id },
    });

    // Catat ke Audit Trail
    await createAuditLog({
      action: "COMMODITY_DELETE",
      target: id,
      details: `Penghapusan master komoditas "${existing.name}" (ID: ${id}, Kategori: ${existing.category}).`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Komoditas "${existing.name}" berhasil dihapus`,
    });
  } catch (error) {
    console.error("DELETE /api/commodities/[id] error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus komoditas", error: error.message },
      { status: 500 }
    );
  }
}
