import { NextResponse } from "next/server";
import { INITIAL_WAREHOUSE, COMMODITIES } from "../../../data/initialWarehouseData";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      warehouse: INITIAL_WAREHOUSE,
      commodities: COMMODITIES,
    },
  });
}
