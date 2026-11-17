// src/app/api/stapels/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const gudang = searchParams.get("gudang");
    const block = searchParams.get("block");
    const status = searchParams.get("status");

    const where = {
      ...(gudang && { gudang }),
      ...(block && { block }),
      ...(status && { status }),
    };

    const stapels = await prisma.stapel.findMany({
      where,
      include: {
        batches: {
          include: {
            commodity: true,
          },
          orderBy: { dateIn: "asc" }, // Prioritas FIFO
        },
      },
      orderBy: [
        { gudang: "asc" },
        { block: "asc" },
        { number: "asc" },
      ],
    });

    // Perkaya data dengan agregat koli dan tonase per stapel
    const enriched = stapels.map((s) => {
      let totalKoli = 0;
      let totalKg = 0;
      let oldestDateIn = null;

      s.batches.forEach((b) => {
        totalKoli += b.koli;
        totalKg += b.koli * b.weightPerUnitKg;
        if (!oldestDateIn || new Date(b.dateIn) < new Date(oldestDateIn)) {
          oldestDateIn = b.dateIn;
        }
      });

      return {
        ...s,
        totalKoli,
        totalTonase: parseFloat((totalKg / 1000).toFixed(2)),
        oldestDateIn,
        occupancyPct: Math.round((totalKoli / s.capacityKoli) * 100),
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("GET /api/stapels error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data stapel", error: error.message },
      { status: 500 }
    );
  }
}
