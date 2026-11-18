"use client";

import React from "react";
import { WarehouseDashboard } from "../../../../components/dashboard/WarehouseDashboard";

export default function DashboardUsersPage(): React.ReactElement {
  return <WarehouseDashboard initialTab="accounts" />;
}
