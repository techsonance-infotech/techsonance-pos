import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google"; // Added Outfit for premium look
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getTheme } from "@/app/actions/preferences";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "CafePOS - Professional Point of Sale",
  description: "Next Generation POS for Modern Businesses",
  manifest: "/manifest.json",
};

export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getTheme()

  return (
    <html lang="en" className={theme}>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-stone-50 dark:bg-gray-900 text-stone-900 dark:text-gray-100`}>
        <ThemeProvider defaultTheme={theme as 'light' | 'dark'}>
          <PwaRegister />
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
