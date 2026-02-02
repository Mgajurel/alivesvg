"use client";

import { AnimationPreset } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

interface ControlPanelProps {
    currentAnimation: AnimationPreset;
    onAnimationChange: (animation: AnimationPreset) => void;
}

const PRESETS: { id: AnimationPreset; label: string }[] = [
    { id: "fade", label: "Fade In" },
    { id: "scale", label: "Scale Up" },
    { id: "slide", label: "Slide In" },
    { id: "spin", label: "Spin Loop" },
    { id: "bounce", label: "Bounce" },
    { id: "pulse", label: "Pulse" },
];

export function ControlPanel({ currentAnimation, onAnimationChange }: ControlPanelProps) {
    return (
        <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <CardTitle>Animation Settings</CardTitle>
                <CardDescription>Choose an animation style for your SVG.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
                <div className="space-y-3">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Presets
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map((preset) => (
                            <Button
                                key={preset.id}
                                variant={currentAnimation === preset.id ? "default" : "outline"}
                                className="justify-start"
                                onClick={() => onAnimationChange(preset.id)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium leading-none">
                        Preview
                    </label>
                    <p className="text-sm text-muted-foreground">
                        The studio provides a real-time preview. Click &quot;Copy Code&quot; when you are happy with the result.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
