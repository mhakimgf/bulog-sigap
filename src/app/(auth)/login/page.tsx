"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWarehouse } from "../../../context/WarehouseContext";
import { LoginPage } from "../../../components/auth/LoginPage";
import { Toast } from "../../../components/common/Toast";

export default function LoginRoutePage(): React.ReactElement {
  const { currentUser } = useWarehouse();
  const router = useRouter();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "operator") {
        router.push("/operator");
      } else {
        router.push("/dashboard");
      }
    }
  }, [currentUser, router]);

  return (
    <main className="min-h-screen w-full">
      <LoginPage />
      <Toast />
    </main>
  );
}
