"use client";

import { useState } from "react";
import { UploadZone } from "@/components/studio/UploadZone";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { ControlPanel } from "@/components/studio/ControlPanel";
import { CodePreview } from "@/components/studio/CodePreview";
import { AnimationPreset } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function StudioPage() {
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("MyIcon");
    const [animation, setAnimation] = useState<AnimationPreset>("spin");

    const handleUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setSvgContent(content);
            // Extract name without extension
            const name = file.name.replace(/\.[^/.]+$/, "");
            // Sanitize for component name (PascalCase-ish)
            const cleanName = name.replace(/[^a-zA-Z0-9]/g, "");
            setFileName(cleanName || "MyIcon");
        };
        reader.readAsText(file);
    };

    const resetUpload = () => {
        setSvgContent(null);
        setFileName("MyIcon");
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col">
            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">Animation Studio</h1>
                </div>
                {svgContent && (
                    <Button variant="outline" onClick={resetUpload}>
                        Upload New
                    </Button>
                )}
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto w-full">
                {/* Left/Center Column: Canvas or Upload */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {!svgContent ? (
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="max-w-xl mx-auto w-full">
                                <UploadZone
                                    onUpload={handleUpload}
                                    onPaste={(content) => {
                                        setSvgContent(content);
                                        setFileName("PastedIcon");
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <StudioCanvas svgContent={svgContent} animation={animation} />
                        </div>
                    )}
                </div>

                {/* Right Column: Controls */}
                <div className="flex flex-col gap-6">
                    <ControlPanel
                        currentAnimation={animation}
                        onAnimationChange={setAnimation}
                    />

                    {svgContent && (
                        <CodePreview animation={animation} svgName={fileName} />
                    )}
                </div>
            </div>
        </div>
    );
}
