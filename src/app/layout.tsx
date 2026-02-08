import type { Metadata } from "next";
// We use 'Geist' or 'Inter' as the standard font for 2026
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Amcap Nxt Base 2026",
  description: "Amcap's Production ready Saas stack",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      {/* antialiased: Makes fonts look thinner/sharper
        h-full: Ensures the app takes up full height
      */}
      <body className={`${inter.className} antialiased h-full`}>
        {children}
      </body>
    </html>
  );
}