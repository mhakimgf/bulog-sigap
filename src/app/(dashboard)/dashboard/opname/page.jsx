"use client";

import React from "react";
import { WarehouseDashboard } from "../../../../components/dashboard/WarehouseDashboard";

export default function DashboardOpnamePage() {
  return <WarehouseDashboard initialTab="opname" initialOpnameOpen={true} />;
}
