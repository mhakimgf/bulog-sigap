"use client";

import React from "react";
import { WarehouseDashboard } from "../../../../components/dashboard/WarehouseDashboard";

export default function DashboardBasoPage() {
  return <WarehouseDashboard initialTab="baso" initialBasoOpen={true} />;
}
