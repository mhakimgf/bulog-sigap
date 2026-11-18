import React from "react";
import { Toast } from "../../components/common/Toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="h-screen w-full bg-[#F4F6FB] text-slate-800 flex overflow-hidden font-sans antialiased">
      {children}
      <Toast />
    </div>
  );
}
