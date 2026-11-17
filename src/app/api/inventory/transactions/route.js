// src/app/api/inventory/transactions/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // MASUK, KELUAR, PENYESUAIAN
    const gudang = searchParams.get("gudang");
    const stapelId = searchParams.get("stapelId");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const where = {
      ...(type && { type }),
      ...(gudang && { gudang }),
      ...(stapelId && { stapelId }),
      ...(search && {
        OR: [
          { commodityName: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
          { suratJalan: { contains: search, mode: "insensitive" } },
          { sourceOrDest: { contains: search, mode: "insensitive" } },
          { operator: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("GET /api/inventory/transactions error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data transaksi", error: error.message },
      { status: 500 }
    );
  }
}
