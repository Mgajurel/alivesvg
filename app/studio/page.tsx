"use client";

import { useMemo, useState } from "react";
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
    DEFAULT_CUSTOM_SETTINGS,
    LOOP_MODE_LABELS,
    TRIGGER_MODE_LABELS,
} from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, FileCode2, Sparkles, Upload, WandSparkles } from "lucide-react";
import { annotateSvgContent, applySelection } from "@/lib/svgParts";
import { buildCustomCssSnippet } from "@/lib/animationCss";

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
        description: "Copy a React snippet with path-level motion styles baked in.",
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
    const [svgBase, setSvgBase] = useState<string | null>(null);
    const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>("MyIcon");
    const [animation, setAnimation] = useState<AnimationPreset>("spin");
    const [triggerMode, setTriggerMode] = useState<AnimationTriggerMode>("always");
    const [loopMode, setLoopMode] = useState<AnimationLoopMode>("continuous");
    const [customSettings, setCustomSettings] = useState(DEFAULT_CUSTOM_SETTINGS);
    const [customCss, setCustomCss] = useState("");
    const [useCustomCss, setUseCustomCss] = useState(false);
    const [exportMode, setExportMode] = useState<"package" | "inline">("package");

    const previewSvg = useMemo(() => {
        if (!svgBase) return null;
        return applySelection(svgBase, selectedPartIds, { highlight: true });
    }, [svgBase, selectedPartIds]);

    const exportSvg = useMemo(() => {
        if (!svgBase) return null;
        return applySelection(svgBase, selectedPartIds, { highlight: false });
    }, [svgBase, selectedPartIds]);

    const resolvedCustomCss = useMemo(() => {
        if (animation !== "custom") return null;
        if (useCustomCss) {
            return customCss;
        }
        return buildCustomCssSnippet(customSettings);
    }, [animation, customCss, customSettings, useCustomCss]);

    const handleSvgLoad = (content: string, name: string) => {
        const { annotatedSvg, autoSelectedIds } = annotateSvgContent(content);
        setSvgBase(annotatedSvg);
        setSelectedPartIds(autoSelectedIds);
        setFileName(name);
    };

    const handleUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            handleSvgLoad(content, toComponentName(file.name));
        };
        reader.readAsText(file);
    };

    const resetUpload = () => {
        setSvgBase(null);
        setSelectedPartIds([]);
        setFileName("MyIcon");
    };

    const handleTogglePart = (partId: string) => {
        setSelectedPartIds((prev) => (
            prev.includes(partId)
                ? prev.filter((id) => id !== partId)
                : [...prev, partId]
        ));
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,var(--alivesvg-bg)_0%,var(--alivesvg-bg-alt)_52%,var(--alivesvg-bg)_100%)] text-[var(--alivesvg-ink)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(0,0,0,0.06),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(0,0,0,0.04),transparent_32%),linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,28px_28px,28px_28px] [mask-image:linear-gradient(to_bottom,black,black,transparent_95%)]" />

            <main className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-10 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-8">
                <motion.header
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    className="mb-6 flex flex-wrap items-center justify-between gap-3"
                >
                    <motion.div variants={rise} className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Button asChild variant="outline" size="sm" className="rounded-full">
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
                        {svgBase && (
                        <Button
                            variant="outline"
                            onClick={resetUpload}
                            className="rounded-full"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload New
                        </Button>
                        )}
                        <Button asChild variant="outline" className="rounded-full">
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
                            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#f0f0f0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#2b2b2b]">
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
                                        <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f1f1] text-[#333333]">
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
                                {svgBase ? fileName : "Upload your first SVG"}
                            </h2>
                            </div>
                            <span className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {svgBase ? "Ready to animate" : "Awaiting input"}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {TRIGGER_MODE_LABELS[triggerMode]} • {LOOP_MODE_LABELS[loopMode]}
                            </span>
                        </div>

                        {!svgBase ? (
                            <UploadZone
                                onUpload={handleUpload}
                                onPaste={(content) => {
                                    handleSvgLoad(content, "PastedIcon");
                                }}
                            />
                        ) : (
                            <StudioCanvas
                                svgContent={previewSvg}
                                animation={animation}
                                triggerMode={triggerMode}
                                loopMode={loopMode}
                                selectedPartIds={selectedPartIds}
                                onTogglePart={handleTogglePart}
                                customStyle={resolvedCustomCss}
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
                            customSettings={customSettings}
                            onCustomSettingsChange={setCustomSettings}
                            customCss={customCss}
                            onCustomCssChange={setCustomCss}
                            useCustomCss={useCustomCss}
                            onUseCustomCssChange={setUseCustomCss}
                        />

                        {svgBase ? (
                            <>
                                <div className="rounded-[20px] border border-slate-900/10 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_14px_36px_rgba(15,28,48,0.08)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                        Export mode
                                    </p>
                                    <div className="mt-2 inline-flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setExportMode("package")}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                exportMode === "package"
                                                    ? "border-[#111111]/50 bg-[#ededed] text-[#222222]"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            }`}
                                        >
                                            AliveSVG package
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExportMode("inline")}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                exportMode === "inline"
                                                    ? "border-[#111111]/40 bg-[#f1f1f1] text-[#333333]"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            }`}
                                        >
                                            Inline CSS
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">
                                        Package mode assumes you install <span className="font-semibold text-slate-700">alivesvg</span>.
                                    </p>
                                </div>

                                <CodePreview
                                    animation={animation}
                                    svgName={fileName}
                                    triggerMode={triggerMode}
                                    loopMode={loopMode}
                                    svgMarkup={exportSvg}
                                    exportMode={exportMode}
                                    customSettings={customSettings}
                                    customCss={customCss}
                                    useCustomCss={useCustomCss}
                                />
                            </>
                        ) : (
                            <div className="rounded-[24px] border border-slate-900/10 bg-[#111111] p-5 text-[#e0e0e0] shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#bdbdbd]">
                                    Export
                                </p>
                                <p className="mt-2 text-lg font-semibold text-white">
                                    Copy-ready code appears here.
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-[#b0b0b0]">
                                    Load an SVG to generate a React starter snippet tied to your selected preset.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </motion.section>
            </main>
        </div>
    );
}
