"use client";

import { useState, useEffect } from "react";
import {
    AnimationLoopMode,
    AnimationPreset,
    AnimationTriggerMode,
    getAnimationVariants,
    serializeVariantsForCode,
} from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { Check, Copy } from "lucide-react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
// Importing a language support if needed, assuming default bundle has javascript/jsx or we load it.
// Next.js might not load all prism languages by default.
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";

interface CodePreviewProps {
    animation: AnimationPreset;
    svgName?: string;
    triggerMode: AnimationTriggerMode;
    loopMode: AnimationLoopMode;
}

export function CodePreview({
    animation,
    svgName = "MyIcon",
    triggerMode,
    loopMode,
}: CodePreviewProps) {
    const [copied, setCopied] = useState(false);

    const variants = getAnimationVariants(animation, { triggerMode, loopMode });
    const variantString = serializeVariantsForCode(variants);
    const animateLines = triggerMode === "hover"
        ? `      animate="rest"\n      whileHover="play"`
        : `      animate="play"`;

    const codeString = `import { motion } from "framer-motion";
import ${svgName} from "./${svgName}";

const variants = ${variantString};

export function Animated${svgName}() {
  return (
    <motion.div
      initial="hidden"
${animateLines}
      variants={variants}
      className="inline-flex"
    >
      <${svgName} />
    </motion.div>
  );
}`;

    useEffect(() => {
        Prism.highlightAll();
    }, [codeString]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(codeString);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="overflow-hidden rounded-[24px] border border-[#0f2238] bg-[#0f2238] text-[#d7ebff] shadow-[0_20px_52px_rgba(10,18,32,0.34)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#8fb6d8]">
                        React export
                    </p>
                    <p className="text-sm font-medium text-white">Animated{svgName}.tsx</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="rounded-full border border-white/10 bg-white/5 text-[#c4dbf3] hover:bg-white/10 hover:text-white"
                >
                    {copied ? <Check size={14} className="mr-2 text-emerald-400" /> : <Copy size={14} className="mr-2" />}
                    {copied ? "Copied" : "Copy Code"}
                </Button>
            </div>

            <div className="max-h-[410px] overflow-auto">
                <pre className="!m-0 !bg-[#0f2238] !p-4 text-xs sm:text-sm">
                    <code className="language-tsx">{codeString}</code>
                </pre>
            </div>
        </div>
    );
}
