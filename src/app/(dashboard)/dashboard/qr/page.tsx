"use client";

import React from "react";
import { WarehouseDashboard } from "../../../../components/dashboard/WarehouseDashboard";

export default function DashboardQrPage(): React.ReactElement {
  return <WarehouseDashboard initialTab="qr" initialQrOpen={true} />;
}
