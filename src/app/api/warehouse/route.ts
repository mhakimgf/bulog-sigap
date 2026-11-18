// src/app/api/warehouse/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INITIAL_WAREHOUSE, COMMODITIES } from "@/data/initialWarehouseData";

export async function GET(): Promise<NextResponse> {
  try {
    const [warehouse, commodities] = await Promise.all([
      prisma.warehouse.findFirst({
        include: {
          units: {
            orderBy: { id: "asc" },
          },
        },
      }),
      prisma.commodity.findMany({
        orderBy: { name: "asc" },
      }),
    ]);

    if (!warehouse) {
      return NextResponse.json({
        success: true,
        source: "mock_fallback",
        data: {
          warehouse: INITIAL_WAREHOUSE,
          commodities: COMMODITIES,
        },
      });
    }

    return NextResponse.json({
      success: true,
      source: "postgresql",
      data: {
        warehouse,
        commodities,
      },
    });
  } catch (error: any) {
    console.warn("[DB_FALLBACK] Menggunakan data awal Kompleks CISKID:", error.message);
    return NextResponse.json({
      success: true,
      source: "mock_fallback",
      data: {
        warehouse: INITIAL_WAREHOUSE,
        commodities: COMMODITIES,
      },
    });
  }
}
