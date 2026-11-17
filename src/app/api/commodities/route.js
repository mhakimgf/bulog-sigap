// src/app/api/commodities/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { createAuditLog } from "../../../lib/audit";

// GET: Ambil seluruh master data komoditas pangan
export async function GET() {
  try {
    const commodities = await prisma.commodity.findMany({
      include: {
        _count: {
          select: { batches: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: commodities,
    });
  } catch (error) {
    console.error("GET /api/commodities error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data komoditas", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Tambah komoditas baru & catat ke Audit Log
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      category = "Beras",
      defaultUnit = "Karung",
      defaultWeight = 50,
      maxShelfLifeDays = 180,
      icon = "grain",
      color = "#D97706",
      operatorName = "Superadmin Bulog",
      operatorRole = "superadmin",
      operatorNip = "-",
    } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Nama komoditas wajib diisi" },
        { status: 400 }
      );
    }

    const commodityId =
      id ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const newCommodity = await prisma.commodity.create({
      data: {
        id: commodityId,
        name,
        category,
        defaultUnit,
        defaultWeight: Number(defaultWeight) || 50,
        maxShelfLifeDays: Number(maxShelfLifeDays) || 180,
        icon,
        color,
      },
    });

    // Catat ke Audit Trail (Kepatuhan BUMN)
    await createAuditLog({
      action: "COMMODITY_CREATE",
      target: newCommodity.id,
      details: `Penambahan master komoditas baru: "${newCommodity.name}" (Kategori: ${newCommodity.category}, Batas Simpan: ${newCommodity.maxShelfLifeDays} hari, Berat: ${newCommodity.defaultWeight} kg/${newCommodity.defaultUnit}).`,
      user: operatorName,
      role: operatorRole,
      nip: operatorNip,
    });

    return NextResponse.json({
      success: true,
      message: `Komoditas "${newCommodity.name}" berhasil ditambahkan`,
      data: newCommodity,
    });
  } catch (error) {
    console.error("POST /api/commodities error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan komoditas", error: error.message },
      { status: 500 }
    );
  }
}
