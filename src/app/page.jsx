"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWarehouse } from "../context/WarehouseContext";
import { LoginPage } from "../components/auth/LoginPage";
import { OperatorHome } from "../components/operator/OperatorHome";
import { WarehouseDashboard } from "../components/dashboard/WarehouseDashboard";
import { Toast } from "../components/common/Toast";

export default function HomePage() {
  const router = useRouter();
  const { currentUser } = useWarehouse();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (currentUser) {
      if (currentUser.role === "operator") {
        router.replace("/operator");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [currentUser, router]);

  // Jika belum login -> Tampilkan Halaman Login Resmi Bulog langsung
  if (!currentUser) {
    return (
      <main className="min-h-screen w-full">
        <LoginPage />
        <Toast />
      </main>
    );
  }

  // Fallback render selagi router.replace berlangsung
  return (
    <main className="min-h-screen w-full">
      {currentUser.role === "operator" ? (
        <div className="min-h-screen w-full bg-[#F8F9FF] text-[#0D1C2E]">
          <div className="w-full max-w-lg mx-auto">
            <OperatorHome />
          </div>
        </div>
      ) : (
        <WarehouseDashboard />
      )}
      <Toast />
    </main>
  );
}
