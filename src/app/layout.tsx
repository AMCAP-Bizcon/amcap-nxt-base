import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Amcap Nxt Base 2026",
  description: "Amcap's Production ready Saas stack",
};

/**
 * RootLayout Component
 * 
 * The top-level foundational layout wrapper for the entire Next.js application.
 * Bootstraps the HTML document with styling providers, the global Navbar, and Footer.
 * It manages the structural flex layout so the main content expands correctly.
 * 
 * @param {Readonly<{children: React.ReactNode}>} props - Contains the active page content
 * @returns React Server Component providing the global HTML structure.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased flex flex-col h-screen overflow-hidden bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <main className="flex-1 flex flex-col min-h-0">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}