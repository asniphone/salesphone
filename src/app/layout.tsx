import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Manajemen Penjualan Internal",
  description:
    "Sistem manajemen inventaris dan penjualan internal untuk handphone bekas dan aksesoris pendukung.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${inter.variable} antialiased font-inter`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
