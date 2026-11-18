// src/app/api/stapels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const gudang = searchParams.get("gudang");
    const block = searchParams.get("block");
    const status = searchParams.get("status");

    const where: Record<string, any> = {
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

    const blockStyles: Record<string, { colorClass: string; baseColor: string }> = {
      A: { colorClass: "bg-[#FFD1D8] text-[#9F1239] border-[#FDA4AF]", baseColor: "pink" },
      B: { colorClass: "bg-[#FEF08A] text-[#854D0E] border-[#FDE047]", baseColor: "yellow" },
      C: { colorClass: "bg-[#BBF7D0] text-[#166534] border-[#86EFAC]", baseColor: "green" },
    };

    // Perkaya data dengan agregat koli dan tonase per stapel
    const enriched = stapels.map((s) => {
      let totalKoli = 0;
      let totalKg = 0;
      let oldestDateIn: Date | string | null = null;

      const enrichedBatches = s.batches.map((b) => {
        totalKoli += b.koli;
        totalKg += b.koli * b.weightPerUnitKg;
        if (!oldestDateIn || new Date(b.dateIn) < new Date(oldestDateIn)) {
          oldestDateIn = b.dateIn;
        }
        return {
          ...b,
          commodityName: b.commodity?.name || b.brand,
          dateIn: b.dateIn ? new Date(b.dateIn).toISOString().split("T")[0] : "",
          expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().split("T")[0] : "",
        };
      });

      const blkStyle = blockStyles[s.block] || {
        colorClass: "bg-slate-100 text-slate-700 border-slate-200",
        baseColor: "gray",
      };

      return {
        ...s,
        blockColor: blkStyle.colorClass,
        baseColor: blkStyle.baseColor,
        batches: enrichedBatches,
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
  } catch (error: any) {
    console.error("GET /api/stapels error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data stapel", error: error.message },
      { status: 500 }
    );
  }
}
