"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { UploadZone } from "@/components/studio/UploadZone";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { ControlPanel } from "@/components/studio/ControlPanel";
import { CodePreview } from "@/components/studio/CodePreview";
import {
    AnimationLoopMode,
    AnimationPreset,
    AnimationTriggerMode,
    LOOP_MODE_LABELS,
    TRIGGER_MODE_LABELS,
} from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, FileCode2, Sparkles, Upload, WandSparkles } from "lucide-react";

const reveal: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const rise: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
};

const STUDIO_HIGHLIGHTS = [
    {
        title: "Upload or paste",
        description: "Start with a local SVG file or drop markup directly into the editor.",
        icon: Upload,
    },
    {
        title: "Pick a preset",
        description: "Test six motion presets instantly with hover + loop interactions.",
        icon: WandSparkles,
    },
    {
        title: "Export code",
        description: "Copy a React + Framer Motion snippet as your production starting point.",
        icon: FileCode2,
    },
] as const;

function toComponentName(rawName: string, fallback = "MyIcon") {
    const withoutExtension = rawName.replace(/\.[^/.]+$/, "");
    const parts = withoutExtension
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const pascal = parts
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join("");

    if (!pascal) return fallback;

    return /^[a-zA-Z]/.test(pascal) ? pascal : `Icon${pascal}`;
}

export default function StudioPage() {
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("MyIcon");
    const [animation, setAnimation] = useState<AnimationPreset>("spin");
    const [triggerMode, setTriggerMode] = useState<AnimationTriggerMode>("always");
    const [loopMode, setLoopMode] = useState<AnimationLoopMode>("continuous");

    const handleUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setSvgContent(content);
            setFileName(toComponentName(file.name));
        };
        reader.readAsText(file);
    };

    const resetUpload = () => {
        setSvgContent(null);
        setFileName("MyIcon");
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,var(--alivesvg-bg)_0%,#fff_52%,var(--alivesvg-bg-alt)_100%)] text-[var(--alivesvg-ink)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(255,109,58,0.2),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(15,125,138,0.18),transparent_32%),linear-gradient(rgba(19,35,58,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(19,35,58,0.05)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,28px_28px,28px_28px] [mask-image:linear-gradient(to_bottom,black,black,transparent_95%)]" />

            <main className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-10 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-8">
                <motion.header
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    className="mb-6 flex flex-wrap items-center justify-between gap-3"
                >
                    <motion.div variants={rise} className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Button asChild variant="ghost" size="sm" className="rounded-full text-slate-700 hover:bg-white/80">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Home
                            </Link>
                        </Button>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase backdrop-blur">
                            <Sparkles className="h-3.5 w-3.5 text-[var(--alivesvg-accent)]" />
                            Studio
                        </span>
                    </motion.div>

                    <motion.div variants={rise} className="flex items-center gap-2">
                        {svgContent && (
                            <Button
                                variant="outline"
                                onClick={resetUpload}
                                className="rounded-full border-slate-900/15 bg-white/80 text-slate-700 hover:bg-white"
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                Upload New
                            </Button>
                        )}
                        <Button asChild variant="outline" className="rounded-full border-slate-900/15 bg-white/80 text-slate-700 hover:bg-white">
                            <Link href="/library">Icon Library</Link>
                        </Button>
                    </motion.div>
                </motion.header>

                <motion.section
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    className="mb-6 rounded-[30px] border border-slate-900/10 bg-white/75 p-6 shadow-[0_20px_52px_rgba(17,28,45,0.12)] backdrop-blur-sm sm:p-7"
                >
                    <motion.div variants={rise} className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center">
                        <div>
                            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#fff1ea] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#a94824]">
                                <WandSparkles className="h-3.5 w-3.5" />
                                Motion workspace
                            </p>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                Craft cleaner SVG animations with a more focused studio flow.
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                                Upload a file, tweak the preset, preview the motion instantly, then copy code when the interaction feels right.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            {STUDIO_HIGHLIGHTS.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.title}
                                        className="rounded-2xl border border-slate-900/10 bg-white/85 p-4 shadow-sm"
                                    >
                                        <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#ecfbff] text-[#0f7d8a]">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </motion.section>

                <motion.section
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
                >
                    <motion.div
                        variants={rise}
                        className="rounded-[30px] border border-slate-900/10 bg-white/75 p-4 shadow-[0_26px_70px_rgba(15,32,58,0.12)] backdrop-blur-md sm:p-6"
                    >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/10 pb-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                    Workspace
                                </p>
                                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                                    {svgContent ? fileName : "Upload your first SVG"}
                                </h2>
                            </div>
                            <span className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {svgContent ? "Ready to animate" : "Awaiting input"}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {TRIGGER_MODE_LABELS[triggerMode]} • {LOOP_MODE_LABELS[loopMode]}
                            </span>
                        </div>

                        {!svgContent ? (
                            <UploadZone
                                onUpload={handleUpload}
                                onPaste={(content) => {
                                    setSvgContent(content);
                                    setFileName("PastedIcon");
                                }}
                            />
                        ) : (
                            <StudioCanvas
                                svgContent={svgContent}
                                animation={animation}
                                triggerMode={triggerMode}
                                loopMode={loopMode}
                            />
                        )}
                    </motion.div>

                    <motion.div variants={rise} className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
                        <ControlPanel
                            currentAnimation={animation}
                            onAnimationChange={setAnimation}
                            triggerMode={triggerMode}
                            onTriggerModeChange={setTriggerMode}
                            loopMode={loopMode}
                            onLoopModeChange={setLoopMode}
                        />

                        {svgContent ? (
                            <CodePreview
                                animation={animation}
                                svgName={fileName}
                                triggerMode={triggerMode}
                                loopMode={loopMode}
                            />
                        ) : (
                            <div className="rounded-[24px] border border-slate-900/10 bg-[#12253f] p-5 text-[#d0e2f8] shadow-[0_18px_44px_rgba(8,15,28,0.26)] sm:p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8fb6d8]">
                                    Export
                                </p>
                                <p className="mt-2 text-lg font-semibold text-white">
                                    Copy-ready code appears here.
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-[#a8c7e6]">
                                    Load an SVG to generate a React + Framer Motion starter snippet tied to your selected preset.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </motion.section>
            </main>
        </div>
    );
}
