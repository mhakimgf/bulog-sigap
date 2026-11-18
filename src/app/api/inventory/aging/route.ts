// src/app/api/inventory/aging/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { calculateAgingDays } from "../../../../lib/calculations";
import type { ShelfLifeStatusType } from "../../../../types/warehouse";

export interface AgingBatchItem {
  id: string;
  stapelId: string;
  commodityId: string;
  batchNo: string;
  brand: string;
  koli: number;
  unit: string;
  weightPerUnitKg: number;
  dateIn: Date;
  expiryDate: Date | null;
  origin: string;
  suratJalan: string;
  kondisi: string;
  agingDays: number;
  maxShelfLifeDays: number;
  totalTonase: number;
  status: ShelfLifeStatusType;
  label: string;
}

export async function GET() {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        commodity: true,
        stapel: true,
      },
      orderBy: { dateIn: "asc" },
    });

    const criticalList: AgingBatchItem[] = [];
    const priorityList: AgingBatchItem[] = [];
    const warningList: AgingBatchItem[] = [];
    const optimalList: AgingBatchItem[] = [];

    batches.forEach((b) => {
      const agingDays = calculateAgingDays(b.dateIn);
      const maxDays = b.commodity?.maxShelfLifeDays || 180;

      const item: AgingBatchItem = {
        id: b.id,
        stapelId: b.stapelId,
        commodityId: b.commodityId,
        batchNo: b.batchNo,
        brand: b.brand,
        koli: b.koli,
        unit: b.unit,
        weightPerUnitKg: b.weightPerUnitKg,
        dateIn: b.dateIn,
        expiryDate: b.expiryDate,
        origin: b.origin,
        suratJalan: b.suratJalan,
        kondisi: b.kondisi,
        agingDays,
        maxShelfLifeDays: maxDays,
        totalTonase: parseFloat(((b.koli * b.weightPerUnitKg) / 1000).toFixed(2)),
        status: "optimal",
        label: "Kondisi Optimal",
      };

      if (agingDays > maxDays) {
        item.status = "kritis";
        item.label = "Melewati Batas Simpan";
        criticalList.push(item);
      } else if (agingDays >= 150) {
        item.status = "prioritas";
        item.label = "Prioritas Salur (FIFO)";
        priorityList.push(item);
      } else if (agingDays >= 90) {
        item.status = "waspada";
        item.label = "Perlu Monitoring";
        warningList.push(item);
      } else {
        optimalList.push(item);
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
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Terjadi kesalahan";
    console.error("GET /api/inventory/aging error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghitung masa simpan komoditas", error: errMessage },
      { status: 500 }
    );
  }
}
