"use client";

import {
    AnimationLoopMode,
    AnimationPreset,
    AnimationTriggerMode,
    CustomAnimationSettings,
    LOOP_MODE_LABELS,
    TRIGGER_MODE_LABELS,
} from "@/constants/animations";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
    ArrowUpDown,
    Eye,
    HeartPulse,
    MoveRight,
    RotateCw,
    Scaling,
    SlidersHorizontal,
} from "lucide-react";

interface ControlPanelProps {
    currentAnimation: AnimationPreset;
    onAnimationChange: (animation: AnimationPreset) => void;
    triggerMode: AnimationTriggerMode;
    onTriggerModeChange: (mode: AnimationTriggerMode) => void;
    loopMode: AnimationLoopMode;
    onLoopModeChange: (mode: AnimationLoopMode) => void;
    customSettings: CustomAnimationSettings;
    onCustomSettingsChange: (settings: CustomAnimationSettings) => void;
    customCss: string;
    onCustomCssChange: (value: string) => void;
    useCustomCss: boolean;
    onUseCustomCssChange: (value: boolean) => void;
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
        {
            id: "custom",
            label: "Custom",
            hint: "Design your own motion",
            icon: SlidersHorizontal,
            gradient: "from-slate-500/20 via-slate-400/15 to-transparent",
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
    customSettings,
    onCustomSettingsChange,
    customCss,
    onCustomCssChange,
    useCustomCss,
    onUseCustomCssChange,
}: ControlPanelProps) {
    const updateSetting = (key: keyof CustomAnimationSettings, value: number | string) => {
        onCustomSettingsChange({
            ...customSettings,
            [key]: value,
        });
    };

    const isCustom = currentAnimation === "custom";

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
                                    ? "border-[#111111]/40 bg-[#ededed] shadow-[0_10px_26px_rgba(0,0,0,0.08)]"
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
                                            ? "border-[#111111]/30 bg-[#e6e6e6] text-[#222222]"
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
                                    <span className="rounded-full border border-[#111111]/20 bg-[#eaeaea] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#222222]">
                                        Active
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {isCustom && (
                <div className="mt-4 rounded-2xl border border-slate-900/10 bg-white/90 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Custom motion
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        Use guided controls or paste custom CSS for advanced motion.
                    </p>

                    <div className="mt-3 inline-flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => onUseCustomCssChange(false)}
                            className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                !useCustomCss
                                    ? "border-[#111111]/50 bg-[#ededed] text-[#222222]"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                            )}
                        >
                            Guided
                        </button>
                        <button
                            type="button"
                            onClick={() => onUseCustomCssChange(true)}
                            className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                                useCustomCss
                                    ? "border-[#111111]/40 bg-[#f1f1f1] text-[#333333]"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                            )}
                        >
                            Custom CSS
                        </button>
                    </div>

                    <div className={cn(
                        "mt-4 rounded-2xl border px-3 py-3",
                        useCustomCss ? "border-slate-200 bg-white/80" : "border-[#111111]/20 bg-[#f3f3f3]",
                    )}>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                Guided controls
                            </span>
                            {!useCustomCss && (
                                <span className="rounded-full border border-[#111111]/20 bg-[#eaeaea] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#222222]">
                                    Active
                                </span>
                            )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-xs font-semibold text-slate-600">
                                Duration (s)
                                <Input
                                    type="number"
                                    min="0.2"
                                    step="0.1"
                                    value={customSettings.duration}
                                    onChange={(e) => updateSetting("duration", Number(e.target.value))}
                                    className="mt-1 h-9 rounded-xl border-slate-200 bg-white text-sm text-slate-700 focus-visible:ring-[#111111]"
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Easing
                                <Input
                                    type="text"
                                    value={customSettings.easing}
                                    onChange={(e) => updateSetting("easing", e.target.value)}
                                    className="mt-1 h-9 rounded-xl border-slate-200 bg-white text-sm text-slate-700 focus-visible:ring-[#111111]"
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Scale
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={customSettings.scale}
                                    onChange={(e) => updateSetting("scale", Number(e.target.value))}
                                    className="mt-1 h-9 rounded-xl border-slate-200 bg-white text-sm text-slate-700 focus-visible:ring-[#111111]"
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Rotate (deg)
                                <Input
                                    type="number"
                                    step="1"
                                    value={customSettings.rotate}
                                    onChange={(e) => updateSetting("rotate", Number(e.target.value))}
                                    className="mt-1 h-9 rounded-xl border-slate-200 bg-white text-sm text-slate-700 focus-visible:ring-[#111111]"
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Translate X (px)
                                <Input
                                    type="number"
                                    step="1"
                                    value={customSettings.translateX}
                                    onChange={(e) => updateSetting("translateX", Number(e.target.value))}
                                    className="mt-1 h-9 rounded-xl border-slate-200 bg-white text-sm text-slate-700 focus-visible:ring-[#111111]"
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Translate Y (px)
                                <Input
                                    type="number"
                                    step="1"
                                    value={customSettings.translateY}
                                    onChange={(e) => updateSetting("translateY", Number(e.target.value))}
                                    className="mt-1 h-9 rounded-xl border-slate-200 bg-white text-sm text-slate-700 focus-visible:ring-[#111111]"
                                />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">
                                Opacity (0-1)
                                <Input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    max="1"
                                    value={customSettings.opacity}
                                    onChange={(e) => updateSetting("opacity", Number(e.target.value))}
                                    className="mt-1 h-9 rounded-xl border-slate-200 bg-white text-sm text-slate-700 focus-visible:ring-[#111111]"
                                />
                            </label>
                        </div>
                    </div>

                    <div className={cn(
                        "mt-3 rounded-2xl border px-3 py-3",
                        useCustomCss ? "border-[#111111]/30 bg-[#f2f2f2]" : "border-slate-200 bg-white/80",
                    )}>
                        <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                Custom CSS
                            </span>
                            {useCustomCss && (
                                <span className="rounded-full border border-[#111111]/30 bg-[#ededed] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#333333]">
                                    Active
                                </span>
                            )}
                        </div>
                        <Textarea
                            value={customCss}
                            onChange={(e) => onCustomCssChange(e.target.value)}
                            placeholder={`/* Example */\n.alivesvg-target[data-preset=\"custom\"] [data-alivesvg-animate=\"true\"] {\n  animation: myCustom 1.2s ease-in-out infinite;\n}\n@keyframes myCustom {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-8px); }\n}`}
                            className="min-h-[140px] rounded-xl border-slate-200 bg-white/90 font-mono text-xs text-slate-700 focus-visible:ring-[#111111]"
                        />
                    </div>
                </div>
            )}

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
                                    ? "border-[#111111]/50 bg-[#ededed] text-[#222222]"
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
                                    ? "border-[#111111]/40 bg-[#f1f1f1] text-[#333333]"
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
