import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppShellLogger } from "@/components/layout/AppShellLogger";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "LP Builder Pro",
  description: "AI-Powered Landing Page Creation Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#F1F3FF] text-[#0C0E19] flex h-screen overflow-hidden`}
      >
        <AppShellLogger />
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-[#C7D2DC]">
          <div className="max-w-[1600px] mx-auto min-h-full bg-white/50 backdrop-blur-sm rounded-2xl shadow-sm p-6 overflow-hidden">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
