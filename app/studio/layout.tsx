import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Animation Studio",
  description:
    "Upload your own SVG and animate it with preset or custom motion styles. Export clean React + Framer Motion code.",
  openGraph: {
    title: "Animation Studio | AliveSVG",
    description:
      "Upload your own SVG and animate it with preset or custom motion styles.",
    url: "https://alivesvg.com/studio",
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
