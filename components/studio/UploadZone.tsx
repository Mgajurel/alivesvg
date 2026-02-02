"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { UploadCloud, Code } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface UploadZoneProps {
    onUpload: (file: File) => void;
    onPaste: (content: string) => void;
}

export function UploadZone({ onUpload, onPaste }: UploadZoneProps) {
    const [mode, setMode] = useState<"upload" | "paste">("upload");
    const [text, setText] = useState("");

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/svg+xml': ['.svg']
        },
        maxFiles: 1
    });

    const handlePasteSubmit = () => {
        if (text.trim()) {
            onPaste(text);
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-4 bg-slate-100 p-1 rounded-lg w-fit dark:bg-slate-800">
                <button
                    onClick={() => setMode("upload")}
                    className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                        mode === "upload" ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-slate-50" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                >
                    <UploadCloud size={16} /> Upload File
                </button>
                <button
                    onClick={() => setMode("paste")}
                    className={cn(
                        "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                        mode === "paste" ? "bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-slate-50" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                >
                    <Code size={16} /> Paste SVG
                </button>
            </div>

            {mode === "upload" ? (
                <div
                    {...getRootProps()}
                    className={cn(
                        "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-64 bg-card",
                        isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="bg-muted p-4 rounded-full mb-4">
                        <UploadCloud className="text-muted-foreground" size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Upload your SVG</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                        Drag & drop or click to browse.
                    </p>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-xl p-6 h-64 flex flex-col gap-4">
                    <Textarea
                        placeholder="<svg>...</svg>"
                        className="flex-1 font-mono text-xs resize-none"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <Button onClick={handlePasteSubmit} disabled={!text.trim()}>
                        Load SVG
                    </Button>
                </div>
            )}
        </div>
    );
}
