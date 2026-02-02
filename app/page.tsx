"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Wand2, Grid, Sparkles, Code, Upload } from "lucide-react";
import { HeroBackground } from "@/components/ui/modern/HeroBackground";
import { BentoGrid, BentoGridItem } from "@/components/ui/modern/BentoGrid";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();

  const items = [
    {
      title: "Icon Library (500+)",
      description: "Explore our vast collection of professionally crafted, animated SVG icons. Ready for your React apps.",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 items-center justify-center text-blue-500">
          <Grid size={48} />
        </div>
      ),
      icon: <Grid className="h-4 w-4 text-neutral-500" />,
      className: "md:col-span-2 cursor-pointer",
      onClick: () => router.push("/library")
    },
    {
      title: "Animation Studio",
      description: "Bring your static SVGs to life. Upload, animate with presets, and export React code in seconds.",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-50 to-pink-100 items-center justify-center text-purple-500">
          <Wand2 size={48} />
        </div>
      ),
      icon: <Sparkles className="h-4 w-4 text-neutral-500" />,
      className: "md:col-span-1 cursor-pointer",
      onClick: () => router.push("/studio")
    },
    {
      title: "Smart Paste",
      description: "Don't have a file? Just paste your raw SVG code directly into the studio.",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-emerald-50 to-green-100 items-center justify-center text-emerald-500">
          <Code size={48} />
        </div>
      ),
      icon: <Code className="h-4 w-4 text-neutral-500" />,
      className: "md:col-span-1",
      onClick: () => router.push("/studio")
    },
    {
      title: "Drag & Drop Upload",
      description: "Seamlessly upload your assets. We handle the parsing and cleaning for you.",
      header: (
        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-orange-50 to-yellow-100 items-center justify-center text-orange-500">
          <Upload size={48} />
        </div>
      ),
      icon: <Upload className="h-4 w-4 text-neutral-500" />,
      className: "md:col-span-2",
      onClick: () => router.push("/studio")
    },
  ];

  return (
    <HeroBackground>
      <div className="flex flex-col items-center justify-center text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="AliveSVG Logo" className="h-20 w-20 rounded-xl shadow-lg" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-800 to-neutral-500 dark:from-neutral-50 dark:to-neutral-400 mb-6">
            AliveSVG
          </h1>
          <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto mb-12">
            The modern toolkit for animated vector graphics. <br />
            Library, Studio, and Code Export. All in one place.
          </p>

          <div className="flex gap-4 justify-center mb-20">
            <Button size="lg" className="rounded-full px-8" onClick={() => router.push("/library")}>
              Browse Icons <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="rounded-full px-8" onClick={() => router.push("/studio")}>
              Open Studio
            </Button>
          </div>
        </motion.div>

        <BentoGrid className="w-full">
          {items.map((item, i) => (
            <BentoGridItem
              key={i}
              title={item.title}
              description={item.description}
              header={item.header}
              icon={item.icon}
              className={item.className}
              onClick={item.onClick}
            />
          ))}
        </BentoGrid>
      </div>

      <footer className="w-full text-center py-10 text-neutral-400 text-sm mt-20">
        © {new Date().getFullYear()} AliveSVG. Built with standard 21st.dev components.
      </footer>
    </HeroBackground>
  );
}
