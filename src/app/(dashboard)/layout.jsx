import { Toast } from "../../components/common/Toast";

export default function DashboardLayout({ children }) {
  return (
    <div className="h-screen w-full bg-[#F4F6FB] text-slate-800 flex overflow-hidden font-sans antialiased">
      {children}
      <Toast />
    </div>
  );
}
