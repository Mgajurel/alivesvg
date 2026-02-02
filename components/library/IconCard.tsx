"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { IconItem } from "@/constants/library";
import { ANIMATION_VARIANTS, SPRING_TRANSITION } from "@/constants/animations";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Copy, Check } from "lucide-react";

interface IconCardProps {
    item: IconItem;
}

export function IconCard({ item }: IconCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    const Icon = item.icon;
    const variant = ANIMATION_VARIANTS[item.defaultAnimation];

    const handleCopy = () => {
        // Simple copy logic for MVP - just copying the name. 
        // Ideally this generates the component code.
        const code = `<motion.div variants={${item.defaultAnimation}Variant}><${item.name} /></motion.div>`;
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card
            className="group relative flex flex-col items-center justify-center p-6 transition-all hover:shadow-md cursor-pointer aspect-square"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="flex-1 flex items-center justify-center">
                <motion.div
                    initial="hidden"
                    animate={isHovered ? "hover" : "visible"}
                    variants={variant}
                // For simple icons, we just apply the variant to the wrapper
                // Some presets (like spin) work best on the svg itself, others on wrapper.
                // For MVP we wrap.
                >
                    <Icon size={48} strokeWidth={1.5} className="text-slate-800" />
                </motion.div>
            </div>

            <div className="mt-4 text-center">
                <p className="text-sm font-medium text-slate-600">{item.name}</p>
                <p className="text-xs text-slate-400 capitalize">{item.defaultAnimation}</p>
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleCopy(); }}>
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </Button>
            </div>
        </Card>
    );
}
