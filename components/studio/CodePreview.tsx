"use client";

import { useState, useEffect } from "react";
import { AnimationPreset } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
}

export function CodePreview({ animation, svgName = "MyIcon" }: CodePreviewProps) {
    const [copied, setCopied] = useState(false);

    const codeString = `import { motion } from "framer-motion";

const ${animation}Variant = {
  hidden: { ... }, // Define your states here based on the preset
  visible: { ... },
};

export function Animated${svgName}() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={${animation}Variant}
    >
      <${svgName} />
    </motion.div>
  );
}`;

    useEffect(() => {
        Prism.highlightAll();
    }, [codeString]);

    const handleCopy = () => {
        navigator.clipboard.writeText(codeString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="mt-6 border-slate-800 bg-slate-950 text-slate-50">
            <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm font-medium text-slate-400">React Code</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="text-slate-400 hover:text-white hover:bg-slate-800">
                    {copied ? <Check size={14} className="mr-2 text-green-500" /> : <Copy size={14} className="mr-2" />}
                    {copied ? "Copied" : "Copy"}
                </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden rounded-b-xl">
                <pre className="!bg-slate-950 !m-0 !p-4 overflow-x-auto text-xs sm:text-sm">
                    <code className="language-tsx">{codeString}</code>
                </pre>
            </CardContent>
        </Card>
    );
}
