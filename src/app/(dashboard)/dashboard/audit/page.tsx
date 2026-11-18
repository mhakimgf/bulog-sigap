"use client";

import React from "react";
import { WarehouseDashboard } from "../../../../components/dashboard/WarehouseDashboard";

export default function DashboardAuditPage(): React.ReactElement {
  return <WarehouseDashboard initialTab="audit" />;
}
