// src/app/api/inventory/aging/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        commodity: true,
        stapel: true,
      },
      orderBy: { dateIn: "asc" }, // Urutan FIFO tertua
    });

    const now = new Date("2026-11-15T00:00:00Z");

    const criticalList = [];
    const priorityList = [];
    const warningList = [];
    const optimalList = [];

    batches.forEach((b) => {
      const inDate = new Date(b.dateIn);
      const diffTime = Math.max(0, now - inDate);
      const agingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const maxDays = b.commodity?.maxShelfLifeDays || 180;

      const item = {
        ...b,
        agingDays,
        maxShelfLifeDays: maxDays,
        totalTonase: parseFloat(((b.koli * b.weightPerUnitKg) / 1000).toFixed(2)),
      };

      if (agingDays > maxDays) {
        criticalList.push({ ...item, status: "kritis", label: "Melewati Batas Simpan" });
      } else if (agingDays >= 150) {
        priorityList.push({ ...item, status: "prioritas", label: "Prioritas Salur (FIFO)" });
      } else if (agingDays >= 90) {
        warningList.push({ ...item, status: "waspada", label: "Perlu Monitoring" });
      } else {
        optimalList.push({ ...item, status: "optimal", label: "Kondisi Optimal" });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalBatches: batches.length,
          criticalCount: criticalList.length,
          priorityCount: priorityList.length,
          warningCount: warningList.length,
          optimalCount: optimalList.length,
        },
        criticalBatches: criticalList,
        priorityBatches: priorityList,
        warningBatches: warningList,
        optimalBatches: optimalList,
      },
    });
  } catch (error) {
    console.error("GET /api/inventory/aging error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghitung masa simpan komoditas", error: error.message },
      { status: 500 }
    );
  }
}
