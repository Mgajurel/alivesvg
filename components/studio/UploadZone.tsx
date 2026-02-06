"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Code2, Sparkles, UploadCloud } from "lucide-react";
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
            "image/svg+xml": [".svg"],
        },
        maxFiles: 1,
    });

    const handlePasteSubmit = () => {
        if (text.trim()) {
            onPaste(text);
        }
    };

    return (
        <div className="w-full">
            <div className="mb-5 inline-flex items-center gap-1 rounded-2xl border border-slate-900/10 bg-white/80 p-1.5 shadow-sm backdrop-blur-sm">
                <button
                    type="button"
                    onClick={() => setMode("upload")}
                    className={cn(
                        "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                        mode === "upload"
                            ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.3)] hover:bg-black dark:!bg-[#f2f2f2] dark:!text-[#111111] dark:shadow-[0_8px_18px_rgba(0,0,0,0.25)] dark:hover:!bg-white"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-[#1b1b1b] dark:hover:text-slate-200",
                    )}
                >
                    <UploadCloud size={16} /> Upload File
                </button>
                <button
                    type="button"
                    onClick={() => setMode("paste")}
                    className={cn(
                        "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                        mode === "paste"
                            ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.3)] hover:bg-black dark:!bg-[#f2f2f2] dark:!text-[#111111] dark:shadow-[0_8px_18px_rgba(0,0,0,0.25)] dark:hover:!bg-white"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-[#1b1b1b] dark:hover:text-slate-200",
                    )}
                >
                    <Code2 size={16} /> Paste SVG
                </button>
            </div>

            {mode === "upload" ? (
                <div
                    {...getRootProps()}
                    aria-label="SVG file upload dropzone"
                    className={cn(
                        "group relative flex h-[22rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed px-6 text-center transition-all sm:px-8",
                        isDragActive
                            ? "border-[#111111] bg-[#ededed] shadow-[0_14px_42px_rgba(0,0,0,0.12)]"
                            : "border-slate-300/90 bg-white/90 hover:border-[#111111]/50 hover:bg-[#f4f4f4] hover:shadow-[0_14px_36px_rgba(0,0,0,0.08)]",
                    )}
                >
                    <input {...getInputProps()} />

                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.08),transparent_36%),radial-gradient(circle_at_78%_80%,rgba(0,0,0,0.06),transparent_32%)] opacity-70" />

                    <div className="relative z-10">
                        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-900/10 bg-white text-[#111111] shadow-sm">
                            <UploadCloud size={28} />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">Drop your SVG into the stage</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                            Drag &amp; drop or click anywhere in this area to pick a file.
                        </p>

                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
                            <span className="rounded-full border border-slate-900/10 bg-white px-3 py-1 font-medium text-slate-600">
                                .svg only
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#111111]/20 bg-[#eeeeee] px-3 py-1 font-medium text-[#2b2b2b]">
                                <Sparkles className="h-3.5 w-3.5" />
                                Live preview ready
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-[22rem] flex-col gap-4 rounded-[28px] border border-slate-900/10 bg-white/90 p-4 shadow-[0_12px_34px_rgba(17,32,58,0.08)] sm:p-5">
                    <Textarea
                        placeholder="<svg>...</svg>"
                        className="h-full flex-1 resize-none rounded-2xl border-slate-200 bg-slate-50/70 font-mono text-xs leading-relaxed text-slate-800 focus-visible:ring-[#111111]"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                            Paste full SVG markup. {text.length > 0 ? `${text.length} characters` : "No content yet."}
                        </p>
                        <Button
                            onClick={handlePasteSubmit}
                            disabled={!text.trim()}
                            className="rounded-full !bg-[#111111] !text-white !border-[#111111] px-5 hover:!bg-[#000000]"
                        >
                            Load into canvas
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
