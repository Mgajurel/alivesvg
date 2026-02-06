"use client";

import { useState, useEffect } from "react";
import {
    AnimationLoopMode,
    AnimationPreset,
    AnimationTriggerMode,
    CustomAnimationSettings,
    StandardAnimationPreset,
    getAnimationVariants,
    serializeVariantsForCode,
} from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { Check, Copy } from "lucide-react";
import { buildCssSnippet, buildCustomCssSnippet } from "@/lib/animationCss";
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
    svgMarkup?: string | null;
    exportMode: "package" | "inline";
    customSettings: CustomAnimationSettings;
    customCss: string;
    useCustomCss: boolean;
}

export function CodePreview({
    animation,
    svgName = "MyIcon",
    triggerMode,
    loopMode,
    svgMarkup,
    exportMode,
    customSettings,
    customCss,
    useCustomCss,
}: CodePreviewProps) {
    const [copied, setCopied] = useState(false);

    const variants = getAnimationVariants(animation, { triggerMode, loopMode });
    const variantString = serializeVariantsForCode(variants);
    const animateLines = triggerMode === "hover"
        ? `      animate="rest"\n      whileHover="play"`
        : `      animate="play"`;

    const sanitizedSvg = (svgMarkup ?? "")
        .replace(/`/g, "\\`")
        .replace(/\$\{/g, "\\${");
    const hasSvgMarkup = Boolean(svgMarkup);
    const isCustom = animation === "custom";
    const resolvedCustomCss = isCustom
        ? (useCustomCss ? customCss : buildCustomCssSnippet(customSettings))
        : "";
    const sanitizedCustomCss = resolvedCustomCss
        .replace(/`/g, "\\`")
        .replace(/\$\{/g, "\\${");
    const sanitizedPresetCss = !isCustom
        ? buildCssSnippet(animation as StandardAnimationPreset)
            .replace(/`/g, "\\`")
            .replace(/\$\{/g, "\\${")
        : "";

    const codeString = hasSvgMarkup
        ? exportMode === "package"
            ? `import { AliveSvg } from "alivesvg";

const svgMarkup = \`${sanitizedSvg}\`;
${isCustom ? `\nconst customCss = \`${sanitizedCustomCss}\`;\n` : ""}
export function Animated${svgName}() {
  return (
    <AliveSvg
      svg={svgMarkup}
      preset="${animation}"
      trigger="${triggerMode}"
      loop="${loopMode}"
${isCustom ? "      customCss={customCss}\n" : ""}    />
  );
}`
            : `import DOMPurify from "dompurify";

const svgMarkup = \`${sanitizedSvg}\`;

const styles = \`${isCustom ? sanitizedCustomCss : sanitizedPresetCss}\`;

function sanitizeSvg(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
}

export function Animated${svgName}() {
  return (
    <div
      className="alivesvg-target"
      data-preset="${animation}"
      data-trigger="${triggerMode}"
      data-loop="${loopMode}"
    >
      <style>{styles}</style>
      <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgMarkup) }} />
    </div>
  );
}`
        : `import { motion } from "framer-motion";
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
        <div className="overflow-hidden rounded-[24px] border border-[#111111] bg-[#111111] text-[#e6e6e6] shadow-[0_20px_52px_rgba(0,0,0,0.28)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#bdbdbd]">
                        React export
                    </p>
                    <p className="text-sm font-medium text-white">Animated{svgName}.tsx</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Copy code"
                    onClick={handleCopy}
                    className="rounded-full text-xs"
                >
                    {copied ? <Check size={14} className="mr-2 text-emerald-400" /> : <Copy size={14} className="mr-2" />}
                    {copied ? "Copied" : "Copy Code"}
                </Button>
            </div>

            <div className="max-h-[410px] overflow-auto">
                <pre className="!m-0 !bg-[#111111] !p-4 text-xs sm:text-sm">
                    <code className="language-tsx">{codeString}</code>
                </pre>
            </div>
        </div>
    );
}
