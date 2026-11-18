import { NextResponse } from "next/server";

export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  typeSafe: boolean;
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  return NextResponse.json({
    status: "ok",
    service: "SIGAP BULOG Next.js Fullstack API",
    version: "2.1.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    typeSafe: true,
  });
}
