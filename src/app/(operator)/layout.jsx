import { Toast } from "../../components/common/Toast";

export default function OperatorLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-[#F8F9FF] text-[#0D1C2E] font-sans antialiased">
      <div className="w-full max-w-lg mx-auto">
        {children}
      </div>
      <Toast />
    </div>
  );
}
