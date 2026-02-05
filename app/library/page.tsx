"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { IconCard } from "@/components/library/IconCard";
import { LIBRARY_ICONS } from "@/constants/library";
import {
    AnimationLoopMode,
    AnimationTriggerMode,
    LOOP_MODE_LABELS,
    TRIGGER_MODE_LABELS,
    StandardAnimationPreset,
} from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { ArrowLeft, Search, Sparkles, WandSparkles, X } from "lucide-react";

const reveal: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.07 },
    },
};

const rise: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
};

const ANIMATION_FILTERS: Array<StandardAnimationPreset | "all"> = [
    "all",
    "spin",
    "bounce",
    "pulse",
    "slide",
    "scale",
    "fade",
];

const ANIMATION_LABELS: Record<StandardAnimationPreset | "all", string> = {
    all: "All Presets",
    fade: "Fade",
    scale: "Scale",
    slide: "Slide",
    spin: "Spin",
    bounce: "Bounce",
    pulse: "Pulse",
};

const ALL_TAG = "all";
const TAG_FILTERS = [
    ALL_TAG,
    ...Array.from(new Set(LIBRARY_ICONS.flatMap((item) => item.tags))).sort(),
];

export default function LibraryPage() {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [triggerMode, setTriggerMode] = useState<AnimationTriggerMode>("always");
    const [loopMode, setLoopMode] = useState<AnimationLoopMode>("continuous");
    const [animationFilter, setAnimationFilter] = useState<StandardAnimationPreset | "all">("all");
    const [tagFilter, setTagFilter] = useState<string>(ALL_TAG);

    const searchTerm = search.trim().toLowerCase();
    const filteredIcons = LIBRARY_ICONS.filter((item) => {
        const matchesSearch = searchTerm.length === 0
            || item.name.toLowerCase().includes(searchTerm)
            || item.tags.some((tag) => tag.toLowerCase().includes(searchTerm));
        const matchesAnimation = animationFilter === "all" || item.defaultAnimation === animationFilter;
        const matchesTag = tagFilter === ALL_TAG || item.tags.includes(tagFilter);
        return matchesSearch && matchesAnimation && matchesTag;
    });

    const playback = {
        triggerMode,
        loopMode,
    };
    const hasActiveFilters = Boolean(searchTerm) || animationFilter !== "all" || tagFilter !== ALL_TAG;

    return (
        <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,var(--alivesvg-bg)_0%,var(--alivesvg-bg-alt)_55%,var(--alivesvg-bg)_100%)] text-[var(--alivesvg-ink)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(0,0,0,0.06),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(0,0,0,0.04),transparent_32%),linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,28px_28px,28px_28px] [mask-image:linear-gradient(to_bottom,black,black,transparent_95%)]" />

            <main className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
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
                            Library
                        </span>
                    </motion.div>

                    <motion.div variants={rise}>
                        <InteractiveHoverButton
                            text="Open Studio"
                            onClick={() => router.push("/studio")}
                            className="w-auto min-w-[160px] px-4 text-sm"
                        />
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
                                Animated icon collection
                            </p>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                Browse ready-to-use icon motions and dial behavior to match your UI.
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                                Search by name or tag, filter by animation preset, then tune trigger and repeat behavior globally before you copy snippets.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-900/10 bg-white/85 p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Visible icons</p>
                                <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{filteredIcons.length}</p>
                                <p className="mt-1 text-xs text-slate-500">of {LIBRARY_ICONS.length} total</p>
                            </div>
                            <div className="rounded-2xl border border-slate-900/10 bg-white/85 p-4 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Playback mode</p>
                                <p className="mt-2 text-sm font-semibold text-slate-900">
                                    {TRIGGER_MODE_LABELS[triggerMode]} • {LOOP_MODE_LABELS[loopMode]}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">Applies to all preview cards</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.section>

                <motion.section
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    className="mb-6 rounded-[30px] border border-slate-900/10 bg-white/80 p-4 shadow-[0_20px_50px_rgba(14,26,44,0.12)] backdrop-blur sm:p-6"
                >
                    <motion.div variants={rise} className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Search</p>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    placeholder="Search icons (e.g. loading, arrow, profile)..."
                                    className="h-11 rounded-2xl border-slate-200 bg-white pl-10 pr-10 text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                {search.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Trigger</p>
                                    <div className="inline-flex flex-wrap gap-2">
                                        {(["always", "hover"] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setTriggerMode(mode)}
                                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${triggerMode === mode
                                                    ? "border-[#111111]/50 bg-[#ededed] text-[#222222]"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                    }`}
                                            >
                                                {TRIGGER_MODE_LABELS[mode]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Repeats</p>
                                    <div className="inline-flex flex-wrap gap-2">
                                        {(["once", "twice", "continuous"] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setLoopMode(mode)}
                                                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${loopMode === mode
                                                    ? "border-[#111111]/40 bg-[#f1f1f1] text-[#333333]"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                    }`}
                                            >
                                                {LOOP_MODE_LABELS[mode]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                    Preset filter
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {ANIMATION_FILTERS.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setAnimationFilter(preset)}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${animationFilter === preset
                                                ? "border-[#111111]/50 bg-[#ededed] text-[#222222]"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                }`}
                                        >
                                            {ANIMATION_LABELS[preset]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                    Tag filter
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {TAG_FILTERS.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => setTagFilter(tag)}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${tagFilter === tag
                                                ? "border-[#111111]/40 bg-[#f1f1f1] text-[#333333]"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                }`}
                                        >
                                            {tag === ALL_TAG ? "All Tags" : `#${tag}`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch("");
                                    setAnimationFilter("all");
                                    setTagFilter(ALL_TAG);
                                }}
                                className="rounded-full"
                            >
                                Clear filters
                            </Button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.section>

                {filteredIcons.length > 0 ? (
                    <motion.section
                        variants={reveal}
                        initial="hidden"
                        animate="show"
                    >
                        <motion.div variants={rise} className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm text-slate-600">
                                Showing <span className="font-semibold text-slate-900">{filteredIcons.length}</span> icon
                                {filteredIcons.length === 1 ? "" : "s"}.
                            </p>
                            <p className="text-xs text-slate-500">
                                Playback: {TRIGGER_MODE_LABELS[triggerMode]} • {LOOP_MODE_LABELS[loopMode]}
                            </p>
                        </motion.div>

                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {filteredIcons.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.34, delay: index * 0.03 }}
                                >
                                    <IconCard item={item} playback={playback} />
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>
                ) : (
                    <div className="rounded-[26px] border border-slate-900/10 bg-white/85 px-6 py-14 text-center shadow-sm">
                        <p className="text-lg font-semibold text-slate-900">No icons match your filters.</p>
                        <p className="mt-2 text-sm text-slate-500">
                            Try a different keyword or clear filters to browse the full set.
                        </p>
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                className="mt-4 rounded-full"
                                onClick={() => {
                                    setSearch("");
                                    setAnimationFilter("all");
                                    setTagFilter(ALL_TAG);
                                }}
                            >
                                Reset filters
                            </Button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
