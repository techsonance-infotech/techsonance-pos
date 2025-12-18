import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google"; // Added Outfit for premium look
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "CafePOS - Professional Point of Sale",
  description: "Next Generation POS for Modern Businesses",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-stone-50 text-stone-900`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
