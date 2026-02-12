"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Archive, Code2, Sparkles, UploadCloud } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

type ZipUploadSummary = {
    totalEntries: number;
    processed: number;
    created: number;
    deduped: number;
    failed: number;
    invalid: number;
};

type RecentJob = {
    id: string;
    job_type: string;
    status: string;
    created_at: string;
    iconSet?: {
        id: string;
        name: string;
        status: string;
    } | null;
};

interface UploadZoneProps {
    onUpload: (file: File) => void;
    onPaste: (content: string) => void;
    onUploadZip?: (file: File) => void | Promise<void>;
    zipUploadState?: "idle" | "uploading" | "success" | "error";
    zipUploadMessage?: string;
    zipUploadSummary?: ZipUploadSummary | null;
    recentJobs?: RecentJob[];
}

export function UploadZone({
    onUpload,
    onPaste,
    onUploadZip,
    zipUploadState = "idle",
    zipUploadMessage,
    zipUploadSummary,
    recentJobs = [],
}: UploadZoneProps) {
    const [mode, setMode] = useState<"upload" | "paste" | "batch">("upload");
    const [text, setText] = useState("");

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onUpload(acceptedFiles[0]);
        }
    }, [onUpload]);

    const onDropZip = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0 && onUploadZip) {
            onUploadZip(acceptedFiles[0]);
        }
    }, [onUploadZip]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/svg+xml": [".svg"],
        },
        maxFiles: 1,
    });

    const {
        getRootProps: getZipRootProps,
        getInputProps: getZipInputProps,
        isDragActive: isZipDragActive,
    } = useDropzone({
        onDrop: onDropZip,
        accept: {
            "application/zip": [".zip"],
            "application/x-zip-compressed": [".zip"],
        },
        maxFiles: 1,
        disabled: !onUploadZip || zipUploadState === "uploading",
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
                <button
                    type="button"
                    onClick={() => setMode("batch")}
                    className={cn(
                        "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                        mode === "batch"
                            ? "bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.3)] hover:bg-black dark:!bg-[#f2f2f2] dark:!text-[#111111] dark:shadow-[0_8px_18px_rgba(0,0,0,0.25)] dark:hover:!bg-white"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-[#1b1b1b] dark:hover:text-slate-200",
                    )}
                >
                    <Archive size={16} /> Batch ZIP
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
            ) : mode === "batch" ? (
                <div
                    {...getZipRootProps()}
                    aria-label="ZIP file upload dropzone"
                    className={cn(
                        "group relative flex h-[22rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border border-dashed px-6 text-center transition-all sm:px-8",
                        isZipDragActive
                            ? "border-[#111111] bg-[#ededed] shadow-[0_14px_42px_rgba(0,0,0,0.12)]"
                            : "border-slate-300/90 bg-white/90 hover:border-[#111111]/50 hover:bg-[#f4f4f4] hover:shadow-[0_14px_36px_rgba(0,0,0,0.08)]",
                        (!onUploadZip || zipUploadState === "uploading") && "cursor-not-allowed opacity-75",
                    )}
                >
                    <input {...getZipInputProps()} />

                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.08),transparent_36%),radial-gradient(circle_at_78%_80%,rgba(0,0,0,0.06),transparent_32%)] opacity-70" />

                    <div className="relative z-10 max-w-lg">
                        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-900/10 bg-white text-[#111111] shadow-sm">
                            <Archive size={28} />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">Drop your ZIP icon set</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                            Upload one ZIP containing SVG files to ingest and generate a batch job.
                        </p>

                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
                            <span className="rounded-full border border-slate-900/10 bg-white px-3 py-1 font-medium text-slate-600">
                                .zip only
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#111111]/20 bg-[#eeeeee] px-3 py-1 font-medium text-[#2b2b2b]">
                                <Sparkles className="h-3.5 w-3.5" />
                                Batch ingest
                            </span>
                        </div>

                        {zipUploadMessage && (
                            <div className={cn(
                                "mt-5 rounded-2xl border px-4 py-3 text-left text-xs",
                                zipUploadState === "success"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : zipUploadState === "error"
                                        ? "border-rose-300 bg-rose-50 text-rose-800"
                                        : "border-slate-200 bg-white/85 text-slate-700",
                            )}>
                                <p className="font-semibold">
                                    {zipUploadState === "uploading" ? "Processing ZIP..." : "Batch status"}
                                </p>
                                <p className="mt-1 leading-relaxed">{zipUploadMessage}</p>
                                {zipUploadSummary && (
                                    <p className="mt-2 text-[11px] text-current/80">
                                        Total: {zipUploadSummary.totalEntries} · Created: {zipUploadSummary.created} · Dedupe: {zipUploadSummary.deduped} · Failed: {zipUploadSummary.failed}
                                    </p>
                                )}
                            </div>
                        )}

                        {recentJobs.length > 0 && (
                            <div className="mt-5 rounded-2xl border border-slate-900/10 bg-white/85 px-4 py-3 text-left">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                    Recent batch jobs
                                </p>
                                <div className="mt-2 space-y-1.5">
                                    {recentJobs.slice(0, 4).map((job) => (
                                        <div key={job.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                                            <div className="min-w-0">
                                                <p className="truncate text-[11px] font-medium text-slate-700">
                                                    {job.iconSet?.name || "Unnamed set"}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    {new Date(job.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <span className={cn(
                                                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
                                                job.status === "completed"
                                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                                    : job.status === "failed"
                                                        ? "border-rose-300 bg-rose-50 text-rose-700"
                                                        : "border-slate-300 bg-slate-50 text-slate-600",
                                            )}>
                                                {job.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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
