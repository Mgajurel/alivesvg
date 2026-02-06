"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconItem } from "@/constants/library";
import {
    AnimationPlaybackSettings,
    LOOP_MODE_LABELS,
    TRIGGER_MODE_LABELS,
    getAnimationVariants,
    getMotionStateTargets,
    serializeVariantsForCode,
    StandardAnimationPreset,
} from "@/constants/animations";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Copy, Check } from "lucide-react";
import { buildCssSnippet } from "@/lib/animationCss";

interface IconCardProps {
    item: IconItem;
    playback: AnimationPlaybackSettings;
}

function toComponentName(iconName: string) {
    return iconName.replace(/[^a-zA-Z0-9]+/g, "");
}

const PRESET_LABELS: Record<StandardAnimationPreset, string> = {
    fade: "Fade",
    scale: "Scale",
    slide: "Slide",
    spin: "Spin",
    bounce: "Bounce",
    pulse: "Pulse",
};

export function IconCard({ item, playback }: IconCardProps) {
    const [copied, setCopied] = useState(false);
    const iconRef = useRef<HTMLDivElement | null>(null);

    const Icon = item.icon;
    const variants = getAnimationVariants(item.defaultAnimation, playback);
    const motionStateTargets = getMotionStateTargets(playback.triggerMode);
    const hasPartTargets = Boolean(item.animatedParts?.length);

    useEffect(() => {
        if (!hasPartTargets) return;
        const root = iconRef.current;
        if (!root) return;
        const svg = root.querySelector("svg");
        if (!svg) return;

        item.animatedParts?.forEach((selector) => {
            svg.querySelectorAll(selector).forEach((node) => {
                if (node instanceof Element) {
                    node.setAttribute("data-alivesvg-animate", "true");
                }
            });
        });
    }, [hasPartTargets, item.animatedParts]);

    const handleCopy = async () => {
        const componentName = toComponentName(item.name);
        const animateLines = playback.triggerMode === "hover"
            ? `      animate="rest"\n      whileHover="play"`
            : `      animate="play"`;

        const code = hasPartTargets
            ? `import { useEffect, useRef } from "react";
import { ${componentName} } from "lucide-react";

const parts = ${JSON.stringify(item.animatedParts ?? [], null, 2)};

const styles = \`${buildCssSnippet(item.defaultAnimation)
                .replace(/`/g, "\\`")
                .replace(/\$\{/g, "\\${")}\`;

export function Animated${componentName}() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const svg = root.querySelector("svg");
    if (!svg) return;
    parts.forEach((selector) => {
      svg.querySelectorAll(selector).forEach((node) => {
        if (node instanceof Element) {
          node.setAttribute("data-alivesvg-animate", "true");
        }
      });
    });
  }, []);

  return (
    <span
      ref={ref}
      className="alivesvg-target"
      data-preset="${item.defaultAnimation}"
      data-trigger="${playback.triggerMode}"
      data-loop="${playback.loopMode}"
    >
      <style>{styles}</style>
      <${componentName} />
    </span>
  );
}`
            : `import { motion } from "framer-motion";
import { ${componentName} } from "lucide-react";

const variants = ${serializeVariantsForCode(variants)};

export function Animated${componentName}() {
  return (
    <motion.div
      initial="hidden"
${animateLines}
      variants={variants}
    >
      <${componentName} />
    </motion.div>
  );
}`;

        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <Card
            className="group relative aspect-square overflow-hidden rounded-[24px] border border-slate-900/10 bg-white/85 p-4 shadow-[0_14px_36px_rgba(15,28,48,0.1)] transition-all hover:-translate-y-1 hover:border-[#111111]/30 hover:shadow-[0_20px_44px_rgba(0,0,0,0.14)] sm:p-5"
        >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_14%,rgba(0,0,0,0.06),transparent_34%),radial-gradient(circle_at_78%_82%,rgba(0,0,0,0.05),transparent_30%)] opacity-80" />

            <div className="relative z-10 flex h-full flex-col">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-slate-900/10 bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {PRESET_LABELS[item.defaultAnimation]}
                    </span>

                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Copy code"
                        className="h-8 w-8 rounded-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopy();
                        }}
                    >
                        {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </Button>
                </div>

                <div className="flex flex-1 items-center justify-center">
                    {hasPartTargets ? (
                        <div
                            ref={iconRef}
                            className="alivesvg-target inline-flex h-20 w-20 items-center justify-center rounded-[22px] border border-slate-900/10 bg-white/90 shadow-sm"
                            data-preset={item.defaultAnimation}
                            data-trigger={playback.triggerMode}
                            data-loop={playback.loopMode}
                        >
                            <Icon size={40} strokeWidth={1.7} className="text-slate-800" />
                        </div>
                    ) : (
                        <motion.div
                            initial="hidden"
                            animate={motionStateTargets.animate}
                            whileHover={motionStateTargets.whileHover}
                            variants={variants}
                            className="inline-flex h-20 w-20 items-center justify-center rounded-[22px] border border-slate-900/10 bg-white/90 shadow-sm"
                        >
                            <Icon size={40} strokeWidth={1.7} className="text-slate-800" />
                        </motion.div>
                    )}
                </div>

                <div className="mt-3 text-center">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                        {TRIGGER_MODE_LABELS[playback.triggerMode]} • {LOOP_MODE_LABELS[playback.loopMode]}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                        {item.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full border border-slate-900/10 bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}
