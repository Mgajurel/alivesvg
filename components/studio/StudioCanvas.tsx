"use client";

import { motion } from "framer-motion";
import { AnimationPreset, ANIMATION_VARIANTS } from "@/constants/animations";

interface StudioCanvasProps {
    svgContent: string | null;
    animation: AnimationPreset;
}

export function StudioCanvas({ svgContent, animation }: StudioCanvasProps) {
    const variant = ANIMATION_VARIANTS[animation];

    if (!svgContent) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-100/50 rounded-xl border border-slate-200">
                No SVG loaded
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center bg-[url('/grid-pattern.svg')] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-400 to-transparent" />

            <motion.div
                key={animation} // Reset animation when type changes
                initial="hidden"
                animate="visible"
                whileHover="hover"
                variants={variant}
                className="w-64 h-64 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svgContent }}
            />
        </div>
    );
}
