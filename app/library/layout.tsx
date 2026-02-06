import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Icon Library",
  description:
    "Browse 500+ curated animated SVG icons with multiple animation presets. Copy production-ready React code in one click.",
  openGraph: {
    title: "Icon Library | AliveSVG",
    description:
      "Browse 500+ curated animated SVG icons with multiple animation presets.",
    url: "https://alivesvg.com/library",
  },
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
