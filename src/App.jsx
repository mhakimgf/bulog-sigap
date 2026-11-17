import React from "react";
import { WarehouseProvider, useWarehouse } from "./context/WarehouseContext";
import { LoginPage } from "./components/auth/LoginPage";
import { OperatorHome } from "./components/operator/OperatorHome";
import { InboundScanForm } from "./components/operator/InboundScanForm";
import { OutboundFifoForm } from "./components/operator/OutboundFifoForm";
import { StapelDetailView } from "./components/operator/StapelDetailView";
import { HistoryScreen } from "./components/operator/HistoryScreen";
import { WarehouseDashboard } from "./components/dashboard/WarehouseDashboard";
import { Toast } from "./components/common/Toast";

const AppContent = () => {
  const {
    currentUser,
    activeView,
    operatorScreen,
  } = useWarehouse();

  // 1. Jika belum login -> Tampilkan Halaman Login Resmi Bulog
  if (!currentUser) {
    return (
      <>
        <LoginPage />
        <Toast />
      </>
    );
  }

  // 2. Render layar operasional operator lapangan
  const renderOperatorScreen = () => {
    switch (operatorScreen) {
      case "inbound":
        return <InboundScanForm />;
      case "outbound":
        return <OutboundFifoForm />;
      case "stapel-detail":
        return <StapelDetailView />;
      case "history":
        return <HistoryScreen />;
      case "home":
      default:
        return <OperatorHome />;
    }
  };

  // 3. Tampilan Responsif Alami (Bebas dari bingkai ponsel buatan atau toggle manual)
  if (activeView === "operator") {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FF] text-[#0D1C2E] flex flex-col font-sans antialiased">
        <div className="flex-1 w-full max-w-lg mx-auto flex flex-col">
          {renderOperatorScreen()}
        </div>
        <Toast />
      </div>
    );
  }

  // 4. Tampilan Dashboard Manajemen (Kepala Gudang & Superadmin)
  return (
    <div className="h-screen w-full bg-[#F4F6FB] text-slate-800 flex overflow-hidden font-sans antialiased">
      <WarehouseDashboard />
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <WarehouseProvider>
      <AppContent />
    </WarehouseProvider>
  );
}
