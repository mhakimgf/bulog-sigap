import "./globals.css";
import React from "react";
import { Metadata, Viewport } from "next";
import { WarehouseProvider } from "@/context/WarehouseContext";

export const metadata: Metadata = {
  title: "SIGAP BULOG — Sistem Inventaris Gudang & Pelacakan",
  description: "Sistem Inventaris Pergudangan & Stock Opname Terpadu Perum Bulog",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F8F9FF] text-[#0D1C2E] antialiased selection:bg-[#F0A516]/30 selection:text-[#00265B]">
        <WarehouseProvider>{children}</WarehouseProvider>
      </body>
    </html>
  );
}
