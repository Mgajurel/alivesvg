import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://alivesvg.com"),
  title: {
    default: "AliveSVG - Animated SVG Components",
    template: "%s | AliveSVG",
  },
  description:
    "A modern toolkit for beautiful, animated vector graphics. Browse curated animated icons or upload your own SVGs to the studio.",
  openGraph: {
    title: "AliveSVG - Animated SVG Components",
    description:
      "A modern toolkit for beautiful, animated vector graphics. Browse curated animated icons or upload your own SVGs to the studio.",
    url: "https://alivesvg.com",
    siteName: "AliveSVG",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AliveSVG - Animated SVG Components",
    description:
      "A modern toolkit for beautiful, animated vector graphics.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased square-theme`}
        >
          <ThemeProvider>
            <ThemeToggle />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
