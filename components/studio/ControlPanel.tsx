"use client";

import {
    AnimationLoopMode,
    AnimationPreset,
    AnimationTriggerMode,
    LOOP_MODE_LABELS,
    TRIGGER_MODE_LABELS,
} from "@/constants/animations";
import { cn } from "@/lib/utils";
import {
    ArrowUpDown,
    Eye,
    HeartPulse,
    MoveRight,
    RotateCw,
    Scaling,
} from "lucide-react";

interface ControlPanelProps {
    currentAnimation: AnimationPreset;
    onAnimationChange: (animation: AnimationPreset) => void;
    triggerMode: AnimationTriggerMode;
    onTriggerModeChange: (mode: AnimationTriggerMode) => void;
    loopMode: AnimationLoopMode;
    onLoopModeChange: (mode: AnimationLoopMode) => void;
}

const PRESETS: {
    id: AnimationPreset;
    label: string;
    hint: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
}[] = [
        {
            id: "fade",
            label: "Fade In",
            hint: "Soft opacity reveal",
            icon: Eye,
            gradient: "from-sky-500/20 via-cyan-400/15 to-transparent",
        },
        {
            id: "scale",
            label: "Scale Up",
            hint: "Pop in with depth",
            icon: Scaling,
            gradient: "from-indigo-500/20 via-blue-400/15 to-transparent",
        },
        {
            id: "slide",
            label: "Slide In",
            hint: "Directional motion cue",
            icon: MoveRight,
            gradient: "from-amber-500/20 via-orange-400/15 to-transparent",
        },
        {
            id: "spin",
            label: "Spin Loop",
            hint: "Continuous rotation",
            icon: RotateCw,
            gradient: "from-fuchsia-500/20 via-pink-400/15 to-transparent",
        },
        {
            id: "bounce",
            label: "Bounce",
            hint: "Playful vertical rhythm",
            icon: ArrowUpDown,
            gradient: "from-emerald-500/20 via-teal-400/15 to-transparent",
        },
        {
            id: "pulse",
            label: "Pulse",
            hint: "Breathing spotlight effect",
            icon: HeartPulse,
            gradient: "from-rose-500/20 via-red-400/15 to-transparent",
        },
];

const TRIGGER_MODES: AnimationTriggerMode[] = ["always", "hover"];
const LOOP_MODES: AnimationLoopMode[] = ["once", "twice", "continuous"];

export function ControlPanel({
    currentAnimation,
    onAnimationChange,
    triggerMode,
    onTriggerModeChange,
    loopMode,
    onLoopModeChange,
}: ControlPanelProps) {
    return (
        <div className="rounded-[24px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_20px_52px_rgba(15,28,48,0.12)] backdrop-blur sm:p-6">
            <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Animation controls
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Choose a preset style</h3>
                <p className="mt-2 text-sm text-slate-600">
                    Switch between motion personalities and keep the live canvas open while you compare.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isActive = currentAnimation === preset.id;

                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onAnimationChange(preset.id)}
                            className={cn(
                                "group relative overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all",
                                isActive
                                    ? "border-[#ff6d3a]/50 bg-[#fff4ee] shadow-[0_10px_26px_rgba(255,109,58,0.2)]"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100",
                                    preset.gradient,
                                    isActive && "opacity-100",
                                )}
                            />

                            <span className="relative flex items-start gap-3">
                                <span
                                    className={cn(
                                        "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border text-slate-600",
                                        isActive
                                            ? "border-[#ff6d3a]/40 bg-[#ffe7dc] text-[#b34b24]"
                                            : "border-slate-200 bg-slate-50",
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>

                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-slate-900">{preset.label}</span>
                                    <span className="mt-0.5 block text-xs text-slate-600">{preset.hint}</span>
                                </span>

                                {isActive && (
                                    <span className="rounded-full border border-[#ff6d3a]/30 bg-[#ffe9de] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#ac4520]">
                                        Active
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-900/10 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Trigger mode
                </p>
                <div className="mt-2 inline-flex flex-wrap gap-2">
                    {TRIGGER_MODES.map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => onTriggerModeChange(mode)}
                            className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                triggerMode === mode
                                    ? "border-[#ff6d3a]/60 bg-[#fff2eb] text-[#ac4520]"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                            )}
                        >
                            {TRIGGER_MODE_LABELS[mode]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-900/10 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Loop behavior
                </p>
                <div className="mt-2 inline-flex flex-wrap gap-2">
                    {LOOP_MODES.map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => onLoopModeChange(mode)}
                            className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                loopMode === mode
                                    ? "border-[#0f7d8a]/50 bg-[#ecfbff] text-[#0f6372]"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                            )}
                        >
                            {LOOP_MODE_LABELS[mode]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-900/10 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                Choose <strong>On Hover</strong> + <strong>Continuous</strong> to keep animating only while hovered.
            </div>
        </div>
    );
}
