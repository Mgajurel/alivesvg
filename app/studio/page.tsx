"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { UploadZone } from "@/components/studio/UploadZone";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { ControlPanel } from "@/components/studio/ControlPanel";
import { CodePreview } from "@/components/studio/CodePreview";
import {
    AnimationLoopMode,
    AnimationPreset,
    AnimationTriggerMode,
    DEFAULT_CUSTOM_SETTINGS,
    LOOP_MODE_LABELS,
    TRIGGER_MODE_LABELS,
} from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, FileCode2, Rows3, Sparkles, Upload, WandSparkles } from "lucide-react";
import { annotateSvgContent, applySelection } from "@/lib/svgParts";
import { buildCustomCssSnippet } from "@/lib/animationCss";
import { UserNav } from "@/components/ui/UserNav";
import { useUserPlan } from "@/hooks/useUserPlan";
import { AuthGateModal } from "@/components/ui/AuthGateModal";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { FREE_STUDIO_EXPORT_LIMIT, type IconVersionOutcome } from "@/types/database";
import {
    createDeterministicMotionCandidates,
    createDeterministicMotionPlan,
    describePlan,
    type MotionCandidate,
    type MotionPlan,
} from "@/lib/studioMotionPlanner";

const reveal: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 },
    },
};

const rise: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
};

const STUDIO_HIGHLIGHTS = [
    {
        title: "Upload or paste",
        description: "Start with a local SVG file or drop markup directly into the editor.",
        icon: Upload,
    },
    {
        title: "Pick a preset",
        description: "Test six motion presets instantly with hover + loop interactions.",
        icon: WandSparkles,
    },
    {
        title: "Export code",
        description: "Copy a React snippet with path-level motion styles baked in.",
        icon: FileCode2,
    },
] as const;

function toComponentName(rawName: string, fallback = "MyIcon") {
    const withoutExtension = rawName.replace(/\.[^/.]+$/, "");
    const parts = withoutExtension
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const pascal = parts
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join("");

    if (!pascal) return fallback;

    return /^[a-zA-Z]/.test(pascal) ? pascal : `Icon${pascal}`;
}

type BatchUploadSummary = {
    totalEntries: number;
    processed: number;
    created: number;
    deduped: number;
    failed: number;
    invalid: number;
};

type RecentStudioJob = {
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

const JOB_TERMINAL_STATUSES = new Set(["completed", "failed", "canceled"]);

type PersistedIconRef = {
    iconId: string;
    iconSetId: string | null;
};

type PersistedIconVersion = {
    id: string;
    version_number: number;
    source: "system" | "ai" | "manual";
    is_active: boolean;
    animation_payload: Record<string, unknown> | null;
    custom_css: string | null;
    created_at: string;
    evaluation: {
        id: string;
        outcome: IconVersionOutcome;
        benchmark_key: string;
        score: number | null;
        notes: string | null;
        created_at: string;
        updated_at: string;
    } | null;
};

type AnalysisSummary = {
    engine: "agentic" | "deterministic";
    model: string | null;
    promptVersion: string | null;
    plannerVersion: number | null;
    latencyMs: number | null;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCostUsd: number | null;
    } | null;
    classification: {
        intent: string;
        confidence: number;
        rationale: string;
    } | null;
    fallbackReason: string | null;
};

const STANDARD_PRESET_SET = new Set<AnimationPreset>(["fade", "scale", "slide", "spin", "bounce", "pulse", "custom"]);
const TRIGGER_MODE_SET = new Set<AnimationTriggerMode>(["always", "hover"]);
const LOOP_MODE_SET = new Set<AnimationLoopMode>(["once", "twice", "continuous"]);
const VERSION_OUTCOMES: IconVersionOutcome[] = ["accepted", "rejected", "edited"];

type VersionVisualMetrics = {
    preset: string | null;
    triggerMode: string | null;
    loopMode: string | null;
    selectedCount: number;
    score: number | null;
};

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getVersionVisualMetrics(version: PersistedIconVersion): VersionVisualMetrics {
    const payload = asObject(version.animation_payload) ?? {};
    const payloadEvaluation = asObject(payload.evaluation);
    const rawSelected = Array.isArray(payload.selectedPartIds)
        ? payload.selectedPartIds.filter((item): item is string => typeof item === "string")
        : [];

    const rawScore = typeof payloadEvaluation?.score === "number"
        ? payloadEvaluation.score
        : typeof payload.score === "number"
            ? payload.score
            : typeof payload.confidence === "number"
                ? payload.confidence
                : null;

    const normalizedScore = typeof rawScore === "number" && Number.isFinite(rawScore)
        ? Math.max(0, Math.min(1, rawScore))
        : null;

    return {
        preset: typeof payload.preset === "string" ? payload.preset : null,
        triggerMode: typeof payload.triggerMode === "string" ? payload.triggerMode : null,
        loopMode: typeof payload.loopMode === "string" ? payload.loopMode : null,
        selectedCount: rawSelected.length,
        score: normalizedScore,
    };
}

function formatScorePercent(score: number | null): string {
    if (score === null) return "n/a";
    return `${Math.round(score * 100)}%`;
}

function formatScoreDelta(currentScore: number | null, previousScore: number | null): string {
    if (currentScore === null || previousScore === null) return "n/a";
    const delta = currentScore - previousScore;
    const direction = delta >= 0 ? "+" : "-";
    return `${direction}${Math.round(Math.abs(delta) * 100)}%`;
}

export default function StudioPage() {
    const [svgBase, setSvgBase] = useState<string | null>(null);
    const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
    const [fileName, setFileName] = useState<string>("MyIcon");
    const [animation, setAnimation] = useState<AnimationPreset>("spin");
    const [triggerMode, setTriggerMode] = useState<AnimationTriggerMode>("always");
    const [loopMode, setLoopMode] = useState<AnimationLoopMode>("continuous");
    const [customSettings, setCustomSettings] = useState(DEFAULT_CUSTOM_SETTINGS);
    const [customCss, setCustomCss] = useState("");
    const [useCustomCss, setUseCustomCss] = useState(false);
    const [exportMode, setExportMode] = useState<"package" | "inline">("package");
    const [singleUploadStatus, setSingleUploadStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [singleUploadMessage, setSingleUploadMessage] = useState("");
    const [batchUploadStatus, setBatchUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const [batchUploadMessage, setBatchUploadMessage] = useState("");
    const [batchUploadSummary, setBatchUploadSummary] = useState<BatchUploadSummary | null>(null);
    const [recentJobs, setRecentJobs] = useState<RecentStudioJob[]>([]);
    const [motionPlan, setMotionPlan] = useState<MotionPlan | null>(null);
    const [motionCandidates, setMotionCandidates] = useState<MotionCandidate[]>([]);
    const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [analysisMessage, setAnalysisMessage] = useState("");
    const [analysisSummary, setAnalysisSummary] = useState<AnalysisSummary | null>(null);
    const [persistedIconRef, setPersistedIconRef] = useState<PersistedIconRef | null>(null);
    const [versionPersistStatus, setVersionPersistStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [versionPersistMessage, setVersionPersistMessage] = useState("");
    const [versionHistory, setVersionHistory] = useState<PersistedIconVersion[]>([]);
    const [versionHistoryStatus, setVersionHistoryStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [versionHistoryMessage, setVersionHistoryMessage] = useState("");
    const [activatingVersionId, setActivatingVersionId] = useState<string | null>(null);
    const [evaluatingVersionId, setEvaluatingVersionId] = useState<string | null>(null);
    const [benchmarkKey, setBenchmarkKey] = useState("studio-feedback-v1");

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const { plan, studioUsage, studioLimit, usage30d, isSignedIn, refresh } = useUserPlan();

    const studioUsageRemaining = studioLimit !== null ? studioLimit - studioUsage : null;

    const fetchRecentJobs = useCallback(async () => {
        if (!isSignedIn) {
            setRecentJobs([]);
            return;
        }

        try {
            const res = await fetch("/api/studio/jobs?limit=10");
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data?.jobs)) {
                setRecentJobs(data.jobs as RecentStudioJob[]);
            }
        } catch {
            // Ignore UI-only fetch errors here.
        }
    }, [isSignedIn]);

    useEffect(() => {
        void fetchRecentJobs();
    }, [fetchRecentJobs]);

    useEffect(() => {
        if (!isSignedIn) return;
        const interval = window.setInterval(() => {
            void fetchRecentJobs();
        }, 12000);

        return () => window.clearInterval(interval);
    }, [fetchRecentJobs, isSignedIn]);

    const previewSvg = useMemo(() => {
        if (!svgBase) return null;
        return applySelection(svgBase, selectedPartIds, { highlight: true });
    }, [svgBase, selectedPartIds]);

    const exportSvg = useMemo(() => {
        if (!svgBase) return null;
        return applySelection(svgBase, selectedPartIds, { highlight: false });
    }, [svgBase, selectedPartIds]);

    const resolvedCustomCss = useMemo(() => {
        if (animation !== "custom") return null;
        if (useCustomCss) {
            return customCss;
        }
        return buildCustomCssSnippet(customSettings);
    }, [animation, customCss, customSettings, useCustomCss]);

    const applyMotionPlanToStudio = useCallback((plan: MotionPlan) => {
        setSelectedPartIds(plan.selectedPartIds);
        setAnimation(plan.preset);
        setTriggerMode(plan.triggerMode);
        setLoopMode(plan.loopMode);
        setMotionPlan(plan);
    }, []);

    const applyVersionToStudio = useCallback((version: PersistedIconVersion) => {
        const payload = version.animation_payload ?? {};

        const payloadPreset = typeof payload.preset === "string" && STANDARD_PRESET_SET.has(payload.preset as AnimationPreset)
            ? (payload.preset as AnimationPreset)
            : null;
        const payloadTrigger = typeof payload.triggerMode === "string" && TRIGGER_MODE_SET.has(payload.triggerMode as AnimationTriggerMode)
            ? (payload.triggerMode as AnimationTriggerMode)
            : null;
        const payloadLoop = typeof payload.loopMode === "string" && LOOP_MODE_SET.has(payload.loopMode as AnimationLoopMode)
            ? (payload.loopMode as AnimationLoopMode)
            : null;
        const payloadSelectedIds = Array.isArray(payload.selectedPartIds)
            ? payload.selectedPartIds.filter((item): item is string => typeof item === "string")
            : [];
        const payloadRationale = typeof payload.rationale === "string"
            ? payload.rationale
            : "Loaded from saved version.";
        const payloadConfidence = typeof payload.confidence === "number"
            ? Math.max(0, Math.min(0.99, payload.confidence))
            : 0.7;

        const preset = payloadPreset ?? "scale";
        const trigger = payloadTrigger ?? "always";
        const loop = payloadLoop ?? "continuous";
        const selectedIds = payloadSelectedIds.length > 0 ? payloadSelectedIds : selectedPartIds;

        setAnimation(preset);
        setTriggerMode(trigger);
        setLoopMode(loop);
        setSelectedPartIds(selectedIds);
        setMotionPlan({
            intent: "generic",
            preset: preset === "custom" ? "scale" : preset,
            triggerMode: trigger,
            loopMode: loop,
            selectedPartIds: selectedIds,
            confidence: payloadConfidence,
            rationale: payloadRationale,
        });
    }, [selectedPartIds]);

    const fetchVersionHistory = useCallback(async (iconId: string) => {
        if (!isSignedIn) return;

        setVersionHistoryStatus("loading");
        setVersionHistoryMessage("Loading version history...");

        try {
            const response = await fetch(`/api/studio/icons/${iconId}/versions?limit=20`);
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.error || "Failed to load version history.");
            }

            const versions = Array.isArray(data?.versions)
                ? (data.versions as PersistedIconVersion[])
                : [];
            setVersionHistory(versions);
            setVersionHistoryStatus("ready");
            setVersionHistoryMessage(versions.length > 0 ? `Loaded ${versions.length} versions.` : "No saved versions yet.");

            const activeVersion = versions.find((item) => item.is_active);
            if (activeVersion) {
                applyVersionToStudio(activeVersion);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to load version history.";
            setVersionHistoryStatus("error");
            setVersionHistoryMessage(message);
        }
    }, [applyVersionToStudio, isSignedIn]);

    const activateVersion = useCallback(async (version: PersistedIconVersion) => {
        if (!isSignedIn || !persistedIconRef?.iconId) return;
        setActivatingVersionId(version.id);
        setVersionPersistStatus("saving");
        setVersionPersistMessage(`Activating version v${version.version_number}...`);

        try {
            const response = await fetch(
                `/api/studio/icons/${persistedIconRef.iconId}/versions/${version.id}/activate`,
                { method: "POST" },
            );
            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.error || "Failed to activate version.");
            }

            applyVersionToStudio(version);
            await fetchVersionHistory(persistedIconRef.iconId);
            setVersionPersistStatus("saved");
            setVersionPersistMessage(`Activated version v${version.version_number}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to activate version.";
            setVersionPersistStatus("error");
            setVersionPersistMessage(message);
        } finally {
            setActivatingVersionId(null);
        }
    }, [applyVersionToStudio, fetchVersionHistory, isSignedIn, persistedIconRef?.iconId]);

    const saveVersionEvaluation = useCallback(async (
        version: PersistedIconVersion,
        outcome: IconVersionOutcome,
    ) => {
        if (!isSignedIn || !persistedIconRef?.iconId) return;

        const iconId = persistedIconRef.iconId;
        const metrics = getVersionVisualMetrics(version);
        setEvaluatingVersionId(version.id);
        setVersionPersistStatus("saving");
        setVersionPersistMessage(`Saving ${outcome} feedback for v${version.version_number}...`);

        try {
            const response = await fetch(`/api/studio/icons/${iconId}/versions/${version.id}/evaluation`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    outcome,
                    benchmarkKey: benchmarkKey.trim().length > 0 ? benchmarkKey.trim() : "studio-feedback-v1",
                    score: metrics.score,
                }),
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.error || "Failed to save evaluation.");
            }

            await fetchVersionHistory(iconId);
            setVersionPersistStatus("saved");
            setVersionPersistMessage(`Saved ${outcome} feedback for v${version.version_number}.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save evaluation.";
            setVersionPersistStatus("error");
            setVersionPersistMessage(message);
        } finally {
            setEvaluatingVersionId(null);
        }
    }, [benchmarkKey, fetchVersionHistory, isSignedIn, persistedIconRef?.iconId]);

    useEffect(() => {
        if (!persistedIconRef?.iconId) {
            setVersionHistory([]);
            setVersionHistoryStatus("idle");
            setVersionHistoryMessage("");
            return;
        }
        void fetchVersionHistory(persistedIconRef.iconId);
    }, [fetchVersionHistory, persistedIconRef?.iconId]);

    const persistMotionCandidateVersion = useCallback(async (candidate: MotionCandidate) => {
        if (!isSignedIn || !persistedIconRef?.iconId) return;

        setVersionPersistStatus("saving");
        setVersionPersistMessage("Saving chosen ranked variant...");

        try {
            const response = await fetch(`/api/studio/icons/${persistedIconRef.iconId}/versions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    source: "system",
                    animationPayload: {
                        planner: analysisSummary?.engine ?? "deterministic",
                        candidateId: candidate.id,
                        title: candidate.title,
                        score: candidate.score,
                        confidence: candidate.confidence,
                        plannerVersion: analysisSummary?.plannerVersion ?? 1,
                        promptVersion: analysisSummary?.promptVersion,
                        model: analysisSummary?.model,
                        analysis: analysisSummary
                            ? {
                                engine: analysisSummary.engine,
                                model: analysisSummary.model,
                                promptVersion: analysisSummary.promptVersion,
                                plannerVersion: analysisSummary.plannerVersion,
                                latencyMs: analysisSummary.latencyMs,
                                tokenUsage: analysisSummary.tokenUsage,
                                classification: analysisSummary.classification,
                                fallbackReason: analysisSummary.fallbackReason,
                            }
                            : null,
                        evaluation: {
                            score: candidate.score,
                            confidence: candidate.confidence,
                        },
                        rationale: candidate.rationale,
                        intent: candidate.intent,
                        preset: candidate.preset,
                        triggerMode: candidate.triggerMode,
                        loopMode: candidate.loopMode,
                        selectedPartIds: candidate.selectedPartIds,
                    },
                }),
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.error || "Failed to persist deterministic version.");
            }

            const versionNumber = data?.version?.versionNumber;
            setVersionPersistStatus("saved");
            setVersionPersistMessage(
                versionNumber
                    ? `Saved as version v${versionNumber}.`
                    : "Saved ranked version.",
            );
            await fetchVersionHistory(persistedIconRef.iconId);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save ranked version.";
            setVersionPersistStatus("error");
            setVersionPersistMessage(message);
        }
    }, [analysisSummary, fetchVersionHistory, isSignedIn, persistedIconRef?.iconId]);

    const requestDeterministicCandidates = useCallback(async (
        annotatedSvg: string,
        sourceName: string,
        fallbackPartIds: string[],
    ) => {
        setAnalysisStatus("loading");
        setAnalysisMessage("Scoring ranked variants...");

        try {
            const response = await fetch("/api/studio/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    annotatedSvg,
                    sourceName,
                    fallbackPartIds,
                    iconId: persistedIconRef?.iconId ?? null,
                }),
            });

            if (!response.ok) {
                const fallback = createDeterministicMotionCandidates({
                    annotatedSvg,
                    sourceName,
                    fallbackPartIds,
                });
                setMotionCandidates(fallback);
                setAnalysisSummary({
                    engine: "deterministic",
                    model: null,
                    promptVersion: null,
                    plannerVersion: null,
                    latencyMs: null,
                    tokenUsage: null,
                    classification: null,
                    fallbackReason: "Analyze API unavailable; deterministic baseline used.",
                });
                setAnalysisStatus("error");
                setAnalysisMessage("Analysis endpoint unavailable. Using local deterministic ranking.");
                return;
            }

            const data = await response.json();
            const candidates = Array.isArray(data?.candidates)
                ? (data.candidates as MotionCandidate[])
                : [];

            if (candidates.length === 0) {
                throw new Error("No deterministic variants were generated.");
            }

            setMotionCandidates(candidates);
            applyMotionPlanToStudio(candidates[0]);
            const rawTokenUsage = data?.tokenUsage;
            setAnalysisSummary({
                engine: data?.engine === "agentic" ? "agentic" : "deterministic",
                model: typeof data?.model === "string" ? data.model : null,
                promptVersion: typeof data?.promptVersion === "string" ? data.promptVersion : null,
                plannerVersion: typeof data?.plannerVersion === "number" ? data.plannerVersion : null,
                latencyMs: typeof data?.latencyMs === "number" ? data.latencyMs : null,
                tokenUsage: rawTokenUsage && typeof rawTokenUsage === "object"
                    ? {
                        promptTokens: typeof rawTokenUsage.promptTokens === "number" ? rawTokenUsage.promptTokens : 0,
                        completionTokens: typeof rawTokenUsage.completionTokens === "number" ? rawTokenUsage.completionTokens : 0,
                        totalTokens: typeof rawTokenUsage.totalTokens === "number" ? rawTokenUsage.totalTokens : 0,
                        estimatedCostUsd: typeof rawTokenUsage.estimatedCostUsd === "number" ? rawTokenUsage.estimatedCostUsd : null,
                    }
                    : null,
                classification: data?.classification && typeof data.classification === "object"
                    ? {
                        intent: typeof data.classification.intent === "string" ? data.classification.intent : "generic",
                        confidence: typeof data.classification.confidence === "number" ? data.classification.confidence : 0.6,
                        rationale: typeof data.classification.rationale === "string"
                            ? data.classification.rationale
                            : "No rationale provided.",
                    }
                    : null,
                fallbackReason: typeof data?.fallbackReason === "string" ? data.fallbackReason : null,
            });
            setAnalysisStatus("ready");
            const engineLabel = data?.engine === "agentic" ? "agentic" : "deterministic";
            setAnalysisMessage(`Ranked ${candidates.length} ${engineLabel} variants.`);
        } catch (error) {
            const fallback = createDeterministicMotionCandidates({
                annotatedSvg,
                sourceName,
                fallbackPartIds,
            });
            setMotionCandidates(fallback);
            if (fallback[0]) {
                applyMotionPlanToStudio(fallback[0]);
            }
            setAnalysisSummary({
                engine: "deterministic",
                model: null,
                promptVersion: null,
                plannerVersion: null,
                latencyMs: null,
                tokenUsage: null,
                classification: null,
                fallbackReason: error instanceof Error ? error.message : "Failed to analyze variants.",
            });
            setAnalysisStatus("error");
            setAnalysisMessage(
                error instanceof Error
                    ? `${error.message} Using local deterministic ranking.`
                    : "Failed to analyze variants. Using local deterministic ranking.",
            );
        }
    }, [applyMotionPlanToStudio, persistedIconRef?.iconId]);

    const handleSvgLoad = (content: string, name: string) => {
        const { annotatedSvg, autoSelectedIds } = annotateSvgContent(content);
        const plan = createDeterministicMotionPlan({
            annotatedSvg,
            sourceName: name,
            fallbackPartIds: autoSelectedIds,
        });

        setSvgBase(annotatedSvg);
        const safeSelection = plan.selectedPartIds.length > 0 ? plan.selectedPartIds : autoSelectedIds;
        setSelectedPartIds(safeSelection);
        setFileName(name);
        setAnimation(plan.preset);
        setTriggerMode(plan.triggerMode);
        setLoopMode(plan.loopMode);
        setMotionPlan(plan);
        setMotionCandidates([]);
        setAnalysisSummary(null);
        void requestDeterministicCandidates(annotatedSvg, name, safeSelection);
    };

    const persistSingleUpload = async (file: File) => {
        if (!isSignedIn) return;

        setSingleUploadStatus("saving");
        setSingleUploadMessage("Saving to your workspace...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("setName", file.name);
        formData.append("iconName", file.name);

        try {
            const res = await fetch("/api/studio/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || "Failed to save SVG.");
            }

            const iconId = typeof data?.icon?.id === "string" ? data.icon.id : null;
            const iconSetId = typeof data?.iconSet?.id === "string" ? data.iconSet.id : null;
            setSingleUploadStatus("saved");
            setSingleUploadMessage(data?.deduped ? "Already saved in your workspace (deduped)." : "Saved in your workspace.");
            setPersistedIconRef(iconId ? { iconId, iconSetId } : null);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to save SVG.";
            setSingleUploadStatus("error");
            setSingleUploadMessage(message);
            setPersistedIconRef(null);
        }
    };

    const toSummaryFromJobResponse = (jobResponse: unknown): BatchUploadSummary | null => {
        if (!jobResponse || typeof jobResponse !== "object") return null;
        const root = jobResponse as {
            items?: Array<{ status?: string; payload?: { deduped?: boolean; reason?: string } }>;
            totals?: { items?: number };
        };

        const items = root.items ?? [];
        const totalsCount = root.totals?.items ?? items.length;
        let created = 0;
        let deduped = 0;
        let failed = 0;
        let invalid = 0;

        for (const item of items) {
            const status = item.status ?? "";
            const dedupeFlag = Boolean(item.payload?.deduped);
            const reason = item.payload?.reason;

            if (status === "failed") {
                failed += 1;
                if (reason === "Invalid SVG" || reason === "SVG contains disallowed content." || reason === "Invalid SVG markup.") {
                    invalid += 1;
                }
                continue;
            }

            if (status === "completed" && dedupeFlag) {
                deduped += 1;
                continue;
            }

            if (status === "completed") {
                created += 1;
            }
        }

        return {
            totalEntries: totalsCount,
            processed: totalsCount,
            created,
            deduped,
            failed,
            invalid,
        };
    };

    const fetchJobSummary = async (jobId: string): Promise<BatchUploadSummary | null> => {
        const res = await fetch(`/api/studio/jobs/${jobId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return toSummaryFromJobResponse(data);
    };

    const fetchJobDetails = async (jobId: string): Promise<{
        status: string | null;
        summary: BatchUploadSummary | null;
        errorMessage: string | null;
    } | null> => {
        const res = await fetch(`/api/studio/jobs/${jobId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return {
            status: typeof data?.job?.status === "string" ? data.job.status : null,
            summary: toSummaryFromJobResponse(data),
            errorMessage: typeof data?.job?.error_message === "string" ? data.job.error_message : null,
        };
    };

    const waitForJobCompletion = async (jobId: string): Promise<{
        status: string | null;
        summary: BatchUploadSummary | null;
        errorMessage: string | null;
        timedOut: boolean;
    }> => {
        const maxAttempts = 45;
        const delayMs = 1000;

        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const details = await fetchJobDetails(jobId);
            if (details?.status && JOB_TERMINAL_STATUSES.has(details.status)) {
                return {
                    ...details,
                    timedOut: false,
                };
            }
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        const latest = await fetchJobDetails(jobId);
        return {
            status: latest?.status ?? null,
            summary: latest?.summary ?? null,
            errorMessage: latest?.errorMessage ?? null,
            timedOut: true,
        };
    };

    const handleZipUpload = async (file: File) => {
        if (!isSignedIn) {
            setShowAuthModal(true);
            return;
        }

        setBatchUploadStatus("uploading");
        setBatchUploadMessage("Uploading ZIP and preparing ingest job...");
        setBatchUploadSummary(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("setName", file.name);
        formData.append("idempotencyKey", `zip-${Date.now()}-${file.size}`);

        try {
            const res = await fetch("/api/studio/upload-zip", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || "Failed to ingest ZIP.");
            }

            const jobId = data?.job?.id as string | undefined;
            if (!jobId) {
                throw new Error("ZIP job was created without an id.");
            }

            setBatchUploadMessage("Ingest job queued. Starting processor...");

            const processRes = await fetch("/api/studio/jobs/process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ jobId }),
            });
            const processData = await processRes.json().catch(() => null);
            if (!processRes.ok && processRes.status !== 500) {
                throw new Error(processData?.error || "Failed to start job processor.");
            }

            setBatchUploadMessage("Processor running. Waiting for completion...");

            const finalState = await waitForJobCompletion(jobId);
            if (finalState.status === "failed" || finalState.status === "canceled") {
                setBatchUploadStatus("error");
                setBatchUploadSummary(finalState.summary);
                setBatchUploadMessage(finalState.errorMessage || "ZIP ingest failed.");
            } else if (finalState.timedOut) {
                setBatchUploadStatus("success");
                setBatchUploadSummary(finalState.summary);
                setBatchUploadMessage("ZIP ingest is still running. Check Recent batch jobs for live status.");
            } else {
                const summary = finalState.summary ?? await fetchJobSummary(jobId);
                setBatchUploadStatus("success");
                if (summary) {
                    setBatchUploadSummary(summary);
                    setBatchUploadMessage(
                        `Ingest complete. ${summary.created} created, ${summary.deduped} deduped, ${summary.failed} failed.`,
                    );
                } else {
                    setBatchUploadMessage("ZIP ingest completed.");
                }
            }

            void fetchRecentJobs();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to ingest ZIP.";
            setBatchUploadStatus("error");
            setBatchUploadMessage(message);
        }
    };

    const handleUpload = async (file: File) => {
        setPersistedIconRef(null);
        setVersionHistory([]);
        setVersionHistoryStatus("idle");
        setVersionHistoryMessage("");
        setVersionPersistStatus("idle");
        setVersionPersistMessage("");
        const content = await file.text();
        handleSvgLoad(content, toComponentName(file.name));
        void persistSingleUpload(file);
    };

    const resetUpload = () => {
        setSvgBase(null);
        setSelectedPartIds([]);
        setFileName("MyIcon");
        setSingleUploadStatus("idle");
        setSingleUploadMessage("");
        setMotionPlan(null);
        setMotionCandidates([]);
        setAnalysisStatus("idle");
        setAnalysisMessage("");
        setAnalysisSummary(null);
        setPersistedIconRef(null);
        setVersionPersistStatus("idle");
        setVersionPersistMessage("");
        setVersionHistory([]);
        setVersionHistoryStatus("idle");
        setVersionHistoryMessage("");
    };

    const handleTogglePart = (partId: string) => {
        setSelectedPartIds((prev) => (
            prev.includes(partId)
                ? prev.filter((id) => id !== partId)
                : [...prev, partId]
        ));
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,var(--alivesvg-bg)_0%,var(--alivesvg-bg-alt)_52%,var(--alivesvg-bg)_100%)] text-[var(--alivesvg-ink)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(0,0,0,0.06),transparent_34%),radial-gradient(circle_at_86%_16%,rgba(0,0,0,0.04),transparent_32%),linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,28px_28px,28px_28px] [mask-image:linear-gradient(to_bottom,black,black,transparent_95%)]" />

            <main className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-10 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-8">
                <motion.header
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    className="mb-6 flex flex-wrap items-center justify-between gap-3"
                >
                    <motion.div variants={rise} className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <Button asChild variant="outline" size="sm" className="rounded-full">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Home
                            </Link>
                        </Button>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-slate-600 uppercase backdrop-blur">
                            <Sparkles className="h-3.5 w-3.5 text-[var(--alivesvg-accent)]" />
                            Studio
                        </span>
                    </motion.div>

                    <motion.div variants={rise} className="flex items-center gap-2">
                        {svgBase && (
                        <Button
                            variant="outline"
                            onClick={resetUpload}
                            className="rounded-full"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload New
                        </Button>
                        )}
                        <Button asChild variant="outline" className="rounded-full">
                            <Link href="/library">Icon Library</Link>
                        </Button>
                        <Button asChild variant="outline" className="rounded-full">
                            <Link href="/studio/jobs">
                                <Rows3 className="mr-2 h-4 w-4" />
                                Batch Jobs
                            </Link>
                        </Button>
                        <UserNav />
                    </motion.div>
                </motion.header>

                <motion.section
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    className="mb-6 rounded-[30px] border border-slate-900/10 bg-white/75 p-6 shadow-[0_20px_52px_rgba(17,28,45,0.12)] backdrop-blur-sm sm:p-7"
                >
                    <motion.div variants={rise} className="grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:items-center">
                        <div>
                            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#f0f0f0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#2b2b2b]">
                                <WandSparkles className="h-3.5 w-3.5" />
                                Motion workspace
                            </p>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                Craft cleaner SVG animations with a more focused studio flow.
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                                Upload a file, tweak the preset, preview the motion instantly, then copy code when the interaction feels right.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            {STUDIO_HIGHLIGHTS.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.title}
                                        className="rounded-2xl border border-slate-900/10 bg-white/85 p-4 shadow-sm"
                                    >
                                        <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1f1f1] text-[#333333]">
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                </motion.section>

                <motion.section
                    variants={reveal}
                    initial="hidden"
                    animate="show"
                    className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]"
                >
                    <motion.div
                        variants={rise}
                        className="rounded-[30px] border border-slate-900/10 bg-white/75 p-4 shadow-[0_26px_70px_rgba(15,32,58,0.12)] backdrop-blur-md sm:p-6"
                    >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/10 pb-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                    Workspace
                                </p>
                                <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                                {svgBase ? fileName : "Upload your first SVG"}
                            </h2>
                            </div>
                            <span className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {svgBase ? "Ready to animate" : "Awaiting input"}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {TRIGGER_MODE_LABELS[triggerMode]} • {LOOP_MODE_LABELS[loopMode]}
                            </span>
                        </div>

                        {isSignedIn && svgBase && (
                            <div className="mb-4 rounded-2xl border border-slate-900/10 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                                {plan !== "free"
                                    ? "Unlimited Studio exports"
                                    : `${studioUsageRemaining !== null ? studioUsageRemaining : 0} of ${FREE_STUDIO_EXPORT_LIMIT} free exports remaining`}
                                <p className="mt-1 text-[11px] text-slate-500">
                                    30d usage • AI {usage30d.ai_generation} • Deterministic {usage30d.deterministic_generation} • ZIP jobs {usage30d.zip_ingest_job} • Exported icons {usage30d.export_bundle}
                                </p>
                            </div>
                        )}

                        {isSignedIn && svgBase && singleUploadStatus !== "idle" && (
                            <div className={`mb-4 rounded-2xl border px-4 py-2 text-xs ${
                                singleUploadStatus === "saved"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : singleUploadStatus === "error"
                                        ? "border-rose-300 bg-rose-50 text-rose-800"
                                        : "border-slate-900/10 bg-slate-50 text-slate-600"
                            }`}>
                                {singleUploadMessage}
                            </div>
                        )}

                        {svgBase && motionPlan && (
                            <div className="mb-4 rounded-2xl border border-slate-900/10 bg-white/90 px-4 py-3 text-xs text-slate-700">
                                <p className="font-semibold uppercase tracking-[0.08em] text-slate-500">
                                    {analysisSummary?.engine === "agentic" ? "Agentic Motion Suggestion" : "Deterministic Motion Suggestion"}
                                </p>
                                <p className="mt-1">
                                    Preset <span className="font-semibold text-slate-900">{motionPlan.preset}</span> •
                                    Trigger <span className="font-semibold text-slate-900">{motionPlan.triggerMode}</span> •
                                    Loop <span className="font-semibold text-slate-900">{motionPlan.loopMode}</span>
                                </p>
                                <p className="mt-1 text-slate-600">{describePlan(motionPlan)}</p>
                                {analysisSummary && (
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Engine {analysisSummary.engine}
                                        {analysisSummary.model ? ` • Model ${analysisSummary.model}` : ""}
                                        {analysisSummary.latencyMs !== null ? ` • ${analysisSummary.latencyMs}ms` : ""}
                                        {analysisSummary.tokenUsage?.totalTokens ? ` • ${analysisSummary.tokenUsage.totalTokens} tokens` : ""}
                                        {typeof analysisSummary.tokenUsage?.estimatedCostUsd === "number"
                                            ? ` • $${analysisSummary.tokenUsage.estimatedCostUsd.toFixed(4)} est`
                                            : ""}
                                    </p>
                                )}
                                {analysisSummary?.classification && (
                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Intent {analysisSummary.classification.intent} ({Math.round(analysisSummary.classification.confidence * 100)}%): {analysisSummary.classification.rationale}
                                    </p>
                                )}
                                {analysisSummary?.fallbackReason && (
                                    <p className="mt-1 text-[11px] text-amber-700">{analysisSummary.fallbackReason}</p>
                                )}
                                <p className="mt-1 text-[11px] text-slate-500">
                                    {analysisStatus === "loading" ? "Analyzing ranked variants..." : analysisMessage}
                                </p>
                                {motionCandidates.length > 0 && (
                                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                        {motionCandidates.slice(0, 3).map((candidate, index) => {
                                            const active = motionPlan.preset === candidate.preset
                                                && motionPlan.triggerMode === candidate.triggerMode
                                                && motionPlan.loopMode === candidate.loopMode;
                                            return (
                                                <button
                                                    key={candidate.id}
                                                    type="button"
                                                    onClick={() => {
                                                        applyMotionPlanToStudio(candidate);
                                                        void persistMotionCandidateVersion(candidate);
                                                    }}
                                                    className={`rounded-xl border px-2.5 py-2 text-left transition ${
                                                        active
                                                            ? "border-[#111111]/50 bg-[#ededed] text-[#222222]"
                                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                    }`}
                                                >
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em]">
                                                        #{index + 1} {candidate.title}
                                                    </p>
                                                    <p className="mt-1 text-[11px]">
                                                        {candidate.preset} • {candidate.triggerMode} • {candidate.loopMode}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-slate-500">
                                                        Score {Math.round(candidate.score * 100)}%
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {isSignedIn && (
                                    <p className={`mt-2 text-[11px] ${
                                        versionPersistStatus === "saved"
                                            ? "text-emerald-700"
                                            : versionPersistStatus === "error"
                                                ? "text-rose-700"
                                                : "text-slate-500"
                                    }`}>
                                        {versionPersistStatus === "idle"
                                            ? (persistedIconRef?.iconId
                                                ? "Apply a ranked variant to persist a new icon version."
                                                : "Save/upload this SVG first to persist ranked variants.")
                                            : versionPersistMessage}
                                    </p>
                                )}
                                {isSignedIn && persistedIconRef?.iconId && (
                                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                                Version Timeline
                                            </p>
                                            <button
                                                type="button"
                                                className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300"
                                                onClick={() => void fetchVersionHistory(persistedIconRef.iconId)}
                                            >
                                                Refresh
                                            </button>
                                        </div>

                                        <p className={`mb-2 text-[11px] ${
                                            versionHistoryStatus === "error" ? "text-rose-700" : "text-slate-500"
                                        }`}>
                                            {versionHistoryStatus === "loading" ? "Loading versions..." : versionHistoryMessage}
                                        </p>

                                        <div className="mb-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                            <label htmlFor="benchmark-key" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                                                Benchmark key
                                            </label>
                                            <input
                                                id="benchmark-key"
                                                type="text"
                                                value={benchmarkKey}
                                                maxLength={120}
                                                onChange={(event) => setBenchmarkKey(event.target.value)}
                                                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 outline-none ring-0 focus:border-slate-300"
                                                placeholder="studio-feedback-v1"
                                            />
                                        </div>

                                        <div className="max-h-44 space-y-1.5 overflow-auto pr-1">
                                            {versionHistory.slice(0, 10).map((version, index) => {
                                                const metrics = getVersionVisualMetrics(version);
                                                const previousVersion = versionHistory[index + 1] ?? null;
                                                const previousMetrics = previousVersion ? getVersionVisualMetrics(previousVersion) : null;
                                                const scoreDelta = formatScoreDelta(metrics.score, previousMetrics?.score ?? null);
                                                const evaluationOutcome = version.evaluation?.outcome ?? null;

                                                return (
                                                    <div
                                                        key={version.id}
                                                        className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-[11px] font-semibold text-slate-700">
                                                                v{version.version_number} • {version.source}
                                                            </p>
                                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${
                                                                version.is_active
                                                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                                                    : "border-slate-300 bg-white text-slate-600"
                                                            }`}>
                                                                {version.is_active ? "active" : "inactive"}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-[10px] text-slate-500">
                                                            {new Date(version.created_at).toLocaleString()}
                                                        </p>
                                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                                                                preset {metrics.preset ?? "n/a"}
                                                            </span>
                                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                                                                trigger {metrics.triggerMode ?? "n/a"}
                                                            </span>
                                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                                                                loop {metrics.loopMode ?? "n/a"}
                                                            </span>
                                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                                                                parts {metrics.selectedCount}
                                                            </span>
                                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                                                                score {formatScorePercent(metrics.score)} (delta {scoreDelta})
                                                            </span>
                                                            {evaluationOutcome && (
                                                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                                                    evaluationOutcome === "accepted"
                                                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                                                        : evaluationOutcome === "rejected"
                                                                            ? "border-rose-300 bg-rose-50 text-rose-700"
                                                                            : "border-amber-300 bg-amber-50 text-amber-700"
                                                                }`}>
                                                                    {evaluationOutcome}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-300"
                                                                onClick={() => applyVersionToStudio(version)}
                                                            >
                                                                Preview
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={version.is_active || activatingVersionId === version.id}
                                                                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                                                                    version.is_active
                                                                        ? "cursor-not-allowed border-emerald-300 bg-emerald-50 text-emerald-700"
                                                                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                                                                }`}
                                                                onClick={() => void activateVersion(version)}
                                                            >
                                                                {activatingVersionId === version.id ? "Activating..." : version.is_active ? "Active" : "Activate"}
                                                            </button>
                                                            {VERSION_OUTCOMES.map((outcome) => {
                                                                const selected = evaluationOutcome === outcome;
                                                                const saving = evaluatingVersionId === version.id;
                                                                const outcomeLabel = outcome === "accepted"
                                                                    ? "Accept"
                                                                    : outcome === "rejected"
                                                                        ? "Reject"
                                                                        : "Edited";

                                                                return (
                                                                    <button
                                                                        key={`${version.id}-${outcome}`}
                                                                        type="button"
                                                                        disabled={saving}
                                                                        onClick={() => void saveVersionEvaluation(version, outcome)}
                                                                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                                                                            selected
                                                                                ? "border-slate-400 bg-slate-200 text-slate-800"
                                                                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                                        } ${saving ? "cursor-wait opacity-70" : ""}`}
                                                                    >
                                                                        {saving ? "Saving..." : outcomeLabel}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {versionHistory.length === 0 && versionHistoryStatus !== "loading" && (
                                                <p className="text-[11px] text-slate-500">No versions yet.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!svgBase ? (
                            <UploadZone
                                onUpload={handleUpload}
                                onPaste={(content) => {
                                    handleSvgLoad(content, "PastedIcon");
                                }}
                                onUploadZip={handleZipUpload}
                                zipUploadState={batchUploadStatus}
                                zipUploadMessage={batchUploadMessage}
                                zipUploadSummary={batchUploadSummary}
                                recentJobs={recentJobs}
                            />
                        ) : (
                            <StudioCanvas
                                svgContent={previewSvg}
                                animation={animation}
                                triggerMode={triggerMode}
                                loopMode={loopMode}
                                selectedPartIds={selectedPartIds}
                                onTogglePart={handleTogglePart}
                                customStyle={resolvedCustomCss}
                            />
                        )}
                    </motion.div>

                    <motion.div variants={rise} className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
                        <ControlPanel
                            currentAnimation={animation}
                            onAnimationChange={setAnimation}
                            triggerMode={triggerMode}
                            onTriggerModeChange={setTriggerMode}
                            loopMode={loopMode}
                            onLoopModeChange={setLoopMode}
                            customSettings={customSettings}
                            onCustomSettingsChange={setCustomSettings}
                            customCss={customCss}
                            onCustomCssChange={setCustomCss}
                            useCustomCss={useCustomCss}
                            onUseCustomCssChange={setUseCustomCss}
                        />

                        {svgBase ? (
                            <>
                                <div className="rounded-[20px] border border-slate-900/10 bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_14px_36px_rgba(15,28,48,0.08)]">
                                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                        Export mode
                                    </p>
                                    <div className="mt-2 inline-flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setExportMode("package")}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                exportMode === "package"
                                                    ? "border-[#111111]/50 bg-[#ededed] text-[#222222]"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            }`}
                                        >
                                            AliveSVG package
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExportMode("inline")}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                                exportMode === "inline"
                                                    ? "border-[#111111]/40 bg-[#f1f1f1] text-[#333333]"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                            }`}
                                        >
                                            Inline CSS
                                        </button>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">
                                        Package mode assumes you install <span className="font-semibold text-slate-700">alivesvg</span>.
                                    </p>
                                </div>

                                <CodePreview
                                    animation={animation}
                                    svgName={fileName}
                                    triggerMode={triggerMode}
                                    loopMode={loopMode}
                                    svgMarkup={exportSvg}
                                    exportMode={exportMode}
                                    customSettings={customSettings}
                                    customCss={customCss}
                                    useCustomCss={useCustomCss}
                                    isSignedIn={isSignedIn}
                                    userPlan={plan}
                                    studioUsageRemaining={studioUsageRemaining}
                                    onRequireAuth={() => setShowAuthModal(true)}
                                    onRequirePurchase={() => setShowUpgradeModal(true)}
                                    onExportRecorded={refresh}
                                />
                            </>
                        ) : (
                            <div className="rounded-[24px] border border-slate-900/10 bg-[#111111] p-5 text-[#e0e0e0] shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#bdbdbd]">
                                    Export
                                </p>
                                <p className="mt-2 text-lg font-semibold text-white">
                                    Copy-ready code appears here.
                                </p>
                                <p className="mt-2 text-sm leading-relaxed text-[#b0b0b0]">
                                    Load an SVG to generate a React starter snippet tied to your selected preset.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </motion.section>
            </main>

            <AuthGateModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
            <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
        </div>
    );
}
