"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Sparkles,
  WandSparkles,
  Upload,
  CheckCircle2,
  Box,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import PricingSection from "@/components/ui/pricing-section";
import { LIBRARY_ICONS } from "@/constants/library";
import { type StandardAnimationPreset } from "@/constants/animations";

const heroStagger: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const riseIn: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const studioSteps = [
  {
    title: "Upload or paste",
    description: "Drop your SVG file or paste raw markup. Clean-up happens automatically.",
    icon: Upload,
  },
  {
    title: "Choose animation",
    description: "Pick a preset or craft a custom motion style.",
    icon: WandSparkles,
  },
  {
    title: "Export production code",
    description: "Copy a React + Framer Motion component and ship it in minutes.",
    icon: Terminal,
  },
];

function getLoopAnimation(preset: StandardAnimationPreset) {
  switch (preset) {
    case "spin":
      return {
        animate: { rotate: [0, 360] },
        transition: { repeat: Infinity, duration: 3, ease: "linear" as const },
      };
    case "bounce":
      return {
        animate: { y: [0, -6, 0] },
        transition: { repeat: Infinity, duration: 1.15, ease: "easeInOut" as const },
      };
    case "slide":
      return {
        animate: { x: [-4, 4, -4] },
        transition: { repeat: Infinity, duration: 1.8, ease: "easeInOut" as const },
      };
    case "pulse":
      return {
        animate: { scale: [1, 1.12, 1] },
        transition: { repeat: Infinity, duration: 1.7, ease: "easeInOut" as const },
      };
    case "fade":
      return {
        animate: { opacity: [0.5, 1, 0.5] },
        transition: { repeat: Infinity, duration: 1.9, ease: "easeInOut" as const },
      };
    case "scale":
    default:
      return {
        animate: { scale: [1, 1.08, 1] },
        transition: { repeat: Infinity, duration: 1.4, ease: "easeInOut" as const },
      };
  }
}

export default function Home() {
  const router = useRouter();
  const showcaseIcons = LIBRARY_ICONS.slice(0, 9);
  const secondaryCtaClass =
    "rounded-full px-7 font-semibold";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,var(--alivesvg-bg)_0%,var(--alivesvg-bg-alt)_55%,var(--alivesvg-bg)_100%)] text-[var(--alivesvg-ink)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(0,0,0,0.06),transparent_33%),radial-gradient(circle_at_82%_8%,rgba(0,0,0,0.04),transparent_30%),linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,32px_32px,32px_32px] [mask-image:linear-gradient(to_bottom,black,black,transparent_90%)]" />

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-16 pt-8 md:px-8 lg:pb-24 lg:pt-10">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/" className="group inline-flex items-center gap-3">
            <div className="rounded-xl border border-slate-900/10 bg-white/80 px-3 py-2 backdrop-blur">
              <Sparkles className="h-4 w-4 text-[var(--alivesvg-accent)]" />
            </div>
            <span className="text-sm font-semibold tracking-[0.12em] text-slate-700 uppercase">
              AliveSVG
            </span>
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/library">Library</Link>
            </Button>
            <InteractiveHoverButton
              text="Open Studio"
              onClick={() => router.push("/studio")}
              className="w-auto min-w-[140px] px-4 text-sm"
            />
          </div>
        </header>

        <section className="grid items-center gap-10 pb-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pb-24">
          <motion.div
            variants={heroStagger}
            initial="hidden"
            animate="show"
            className="text-left"
          >
            <motion.p
              variants={riseIn}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-[0.1em] text-slate-600 uppercase backdrop-blur-sm"
            >
              <WandSparkles className="h-3.5 w-3.5 text-[var(--alivesvg-accent)]" />
              Motion Showcase + Studio First
            </motion.p>
            <motion.h1
              variants={riseIn}
              className="text-4xl font-black leading-tight tracking-tight text-balance text-slate-900 md:text-6xl"
            >
              Animate icons that feel alive,
              <span className="block bg-gradient-to-r from-[var(--alivesvg-accent)] to-[var(--alivesvg-cyan)] bg-clip-text text-transparent">
                then export clean React code.
              </span>
            </motion.h1>
            <motion.p
              variants={riseIn}
              className="mt-5 max-w-xl text-base leading-relaxed text-slate-700 md:text-lg"
            >
              AliveSVG combines a bold animated icon wall with a studio flow that gets
              static SVGs into production quickly.
            </motion.p>

            <motion.div variants={riseIn} className="mt-8 flex flex-wrap items-center gap-3">
              <InteractiveHoverButton
                text="Start in Studio"
                onClick={() => router.push("/studio")}
                className="w-auto min-w-[180px] px-4 text-sm"
              />
              <Button
                asChild
                size="lg"
                variant="outline"
                className={secondaryCtaClass}
              >
                <Link href="/library">Browse Icon Library</Link>
              </Button>
            </motion.div>

            <motion.div variants={riseIn} className="mt-8 grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-2xl border border-slate-900/10 bg-white/75 p-3 backdrop-blur-sm">
                <p className="text-2xl font-bold text-slate-900">500+</p>
                <p className="text-xs text-slate-600 uppercase tracking-[0.08em]">Curated icons</p>
              </div>
              <div className="rounded-2xl border border-slate-900/10 bg-white/75 p-3 backdrop-blur-sm">
                <p className="text-2xl font-bold text-slate-900">6</p>
                <p className="text-xs text-slate-600 uppercase tracking-[0.08em]">Animation presets</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="rounded-[28px] border border-slate-900/10 bg-white/70 p-5 shadow-[0_28px_70px_rgba(19,35,58,0.16)] backdrop-blur-md md:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Animated Icon Wall</p>
              <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-600">
                Hover each tile
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {showcaseIcons.map((iconItem, index) => {
                const Icon = iconItem.icon;
                const loop = getLoopAnimation(iconItem.defaultAnimation);
                return (
                  <motion.div
                    key={iconItem.id}
                    initial={{ opacity: 0, scale: 0.92, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.08 * index }}
                    className="group rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm transition-colors hover:border-[var(--alivesvg-accent)]/40 hover:bg-[#f0f0f0]"
                  >
                    <motion.div
                      animate={loop.animate}
                      transition={{ ...loop.transition, delay: index * 0.09 }}
                      className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--alivesvg-accent-soft)] text-[var(--alivesvg-accent)] group-hover:bg-[#dcdcdc]"
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                    <p className="text-center text-[11px] font-medium text-slate-600">
                      {iconItem.name}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        <section className="rounded-[30px] border border-slate-900/10 bg-white/80 p-6 shadow-[0_18px_52px_rgba(14,21,36,0.1)] backdrop-blur dark:border-white/10 dark:bg-[#111111] dark:shadow-[0_18px_52px_rgba(0,0,0,0.32)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#f0f0f0] px-3 py-1 text-xs font-semibold text-[#2b2b2b] uppercase tracking-[0.08em] dark:bg-[#1c1c1c] dark:text-[#e6e6e6]">
                <Box className="h-3.5 w-3.5" />
                Studio-First Flow
              </p>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                From static SVG to shipped motion component in three steps.
              </h2>
              <div className="mt-6 space-y-3">
                {studioSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.35, delay: index * 0.08 }}
                      className="flex gap-3 rounded-2xl border border-slate-900/10 bg-white p-4 dark:border-white/10 dark:bg-[#141414]"
                    >
                      <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f1f1] text-[#333333] dark:bg-[#1f1f1f] dark:text-[#e0e0e0]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.5 }}
              className="rounded-[24px] border border-slate-900/10 bg-gradient-to-br from-[#f2f2f2] via-white to-[#ededed] p-5 dark:border-white/10 dark:bg-gradient-to-br dark:from-[#121212] dark:via-[#151515] dark:to-[#0f0f0f] md:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Quick Studio Demo</p>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-slate-600 shadow-sm dark:bg-[#1c1c1c] dark:text-slate-300">
                  no setup required
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 dark:border-white/15 dark:bg-[#151515]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Upload Zone
                  </p>
                  <div className="mt-3 flex h-32 flex-col items-center justify-center rounded-xl bg-slate-50 px-3 text-center dark:bg-[#1b1b1b]">
                    <Upload className="mb-2 h-5 w-5 text-[var(--alivesvg-accent)]" />
                    <p className="text-sm font-medium text-slate-700">Drop your SVG here</p>
                    <p className="mt-1 text-xs text-slate-500">or paste raw SVG in one click</p>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                  className="rounded-2xl border border-slate-900/10 bg-[#111111] p-4 text-[#e6e6e6]"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#bdbdbd]">
                    Export Output
                  </p>
                  <code className="block font-mono text-[11px] leading-relaxed">
                    {"<motion.svg animate='spin'>"}
                    <br />
                    {"  <path d='...' />"}
                    <br />
                    {"</motion.svg>"}
                  </code>
                  <p className="mt-3 text-[11px] text-[#b0b0b0]">React + Framer Motion component</p>
                </motion.div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700 dark:bg-[#1b1b1b] dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-[#333333] dark:text-[#e6e6e6]" />
                  Works with Lucide-style SVGs
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-700 dark:bg-[#1b1b1b] dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-[#333333] dark:text-[#e6e6e6]" />
                  Copy-paste ready for apps
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <PricingSection />

        <section className="pt-12 text-center">
          <p className="mx-auto max-w-xl text-sm text-slate-600 md:text-base">
            Built for fast integration: pick an icon, preview motion, tweak style, and ship.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <InteractiveHoverButton
              text="Explore Library"
              onClick={() => router.push("/library")}
              className="w-auto min-w-[180px] px-4 text-sm"
            />
            <Button
              asChild
              variant="outline"
              className={secondaryCtaClass}
            >
              <Link href="/studio">
                Try Studio <Code2 className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <footer className="pt-12 text-center text-xs tracking-[0.08em] text-slate-500 uppercase">
          © {new Date().getFullYear()} AliveSVG
        </footer>
      </main>
    </div>
  );
}
