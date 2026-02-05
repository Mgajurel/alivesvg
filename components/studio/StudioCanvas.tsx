"use client";

import type { MouseEvent } from "react";
import {
    AnimationLoopMode,
    AnimationPreset,
    AnimationTriggerMode,
    LOOP_MODE_LABELS,
    TRIGGER_MODE_LABELS,
} from "@/constants/animations";

interface StudioCanvasProps {
    svgContent: string | null;
    animation: AnimationPreset;
    triggerMode: AnimationTriggerMode;
    loopMode: AnimationLoopMode;
    selectedPartIds: string[];
    onTogglePart: (partId: string) => void;
    customStyle?: string | null;
}

const PRESET_LABELS: Record<AnimationPreset, string> = {
    fade: "Fade In",
    scale: "Scale Up",
    slide: "Slide In",
    spin: "Spin Loop",
    bounce: "Bounce",
    pulse: "Pulse",
    custom: "Custom",
};

export function StudioCanvas({
    svgContent,
    animation,
    triggerMode,
    loopMode,
    selectedPartIds,
    onTogglePart,
    customStyle,
}: StudioCanvasProps) {
    const handlePartToggle = (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        const partElement = target?.closest?.("[data-alivesvg-id]") as HTMLElement | null;
        const partId = partElement?.getAttribute("data-alivesvg-id");

        if (!partId) return;
        onTogglePart(partId);
    };

    if (!svgContent) {
        return (
            <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-[24px] border border-slate-200 bg-slate-100/60 text-slate-400">
                No SVG loaded
            </div>
        );
    }

    return (
        <div className="relative flex min-h-[470px] flex-1 items-center justify-center overflow-hidden rounded-[28px] border border-slate-900/10 bg-[linear-gradient(140deg,#f3f3f3_0%,#ffffff_44%,#ededed_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(0,0,0,0.06),transparent_34%),radial-gradient(circle_at_74%_80%,rgba(0,0,0,0.05),transparent_30%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />

            <div className="relative z-10 flex h-full w-full items-center justify-center">
                <div
                    className="alivesvg-target alivesvg-editor relative flex h-64 w-64 items-center justify-center rounded-[30px] border border-slate-900/10 bg-white/90 p-8 shadow-[0_18px_46px_rgba(14,27,44,0.22)] sm:h-72 sm:w-72 [&_svg]:h-full [&_svg]:w-full [&_svg]:max-h-full [&_svg]:max-w-full"
                    data-preset={animation}
                    data-trigger={triggerMode}
                    data-loop={loopMode}
                    onClick={handlePartToggle}
                >
                    {customStyle ? <style>{customStyle}</style> : null}
                    <span dangerouslySetInnerHTML={{ __html: svgContent }} />
                </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-900/10 bg-white/85 px-3 py-2 text-xs text-slate-600 backdrop-blur sm:px-4">
                <span className="font-medium text-slate-700">Click parts to animate</span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="rounded-full border border-slate-900/10 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
                        Active: {PRESET_LABELS[animation]}
                    </span>
                    <span className="rounded-full border border-slate-900/10 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
                        Selected: {selectedPartIds.length || "None"}
                    </span>
                    <span className="rounded-full border border-slate-900/10 bg-slate-50 px-2.5 py-1 font-medium text-slate-600">
                        {TRIGGER_MODE_LABELS[triggerMode]} • {LOOP_MODE_LABELS[loopMode]}
                    </span>
                </div>
            </div>
        </div>
    );
}
