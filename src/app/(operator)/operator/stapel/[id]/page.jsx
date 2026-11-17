"use client";

import React, { use } from "react";
import { StapelDetailView } from "../../../../../components/operator/StapelDetailView";

export default function OperatorStapelDynamicPage({ params }) {
  const resolvedParams = use(params);
  const stapelId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id) : null;

  return <StapelDetailView stapelId={stapelId} />;
}
