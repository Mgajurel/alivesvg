import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  type MotionCandidate,
} from "@/lib/studioMotionPlanner";
import {
  analyzeStudioMotionCandidates,
} from "@/lib/studioAgenticPlanner";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";
import { recordStudioMeteringEvent } from "@/lib/studioMetering";

type AnalyzeRequestBody = {
  annotatedSvg?: string;
  sourceName?: string;
  fallbackPartIds?: string[];
  iconId?: string | null;
};

function normalizeFallbackPartIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeIconId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function getOwnedIconId(params: {
  iconId: string | null;
  userDbId: string | null;
}): Promise<string | null> {
  if (!params.iconId || !params.userDbId) return null;

  const { data: icon, error: iconError } = await supabaseAdmin
    .from("icons")
    .select("id,icon_set_id")
    .eq("id", params.iconId)
    .maybeSingle();

  if (iconError || !icon) return null;

  const { data: set, error: setError } = await supabaseAdmin
    .from("icon_sets")
    .select("id,user_id")
    .eq("id", icon.icon_set_id)
    .maybeSingle();

  if (setError || !set || set.user_id !== params.userDbId) return null;
  return icon.id as string;
}

async function persistAnalysisEvent(params: {
  userDbId: string | null;
  iconId: string | null;
  sourceName: string;
  analysis: Awaited<ReturnType<typeof analyzeStudioMotionCandidates>>;
}): Promise<void> {
  const tokenUsage = params.analysis.tokenUsage;
  const sanitizedCandidates = params.analysis.candidates.slice(0, 3).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    preset: candidate.preset,
    triggerMode: candidate.triggerMode,
    loopMode: candidate.loopMode,
    selectedPartIds: candidate.selectedPartIds,
    score: candidate.score,
    confidence: candidate.confidence,
    rationale: candidate.rationale,
  }));

  await supabaseAdmin
    .from("studio_analysis_events")
    .insert({
      user_id: params.userDbId,
      icon_id: params.iconId,
      source_name: params.sourceName,
      engine: params.analysis.engine,
      model: params.analysis.model,
      prompt_version: params.analysis.promptVersion,
      planner_version: params.analysis.plannerVersion,
      latency_ms: params.analysis.latencyMs,
      prompt_tokens: tokenUsage?.promptTokens ?? null,
      completion_tokens: tokenUsage?.completionTokens ?? null,
      total_tokens: tokenUsage?.totalTokens ?? null,
      estimated_cost_usd: tokenUsage?.estimatedCostUsd ?? null,
      fallback_reason: params.analysis.fallbackReason,
      classification: params.analysis.classification,
      candidates: sanitizedCandidates,
    });
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;
  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const annotatedSvg = body.annotatedSvg?.trim() ?? "";
  const sourceName = body.sourceName?.trim() ?? "UploadedIcon";
  const fallbackPartIds = normalizeFallbackPartIds(body.fallbackPartIds);
  const requestedIconId = normalizeIconId(body.iconId);

  if (!annotatedSvg) {
    return NextResponse.json({ error: "annotatedSvg is required." }, { status: 400 });
  }

  if (!annotatedSvg.includes("<svg")) {
    return NextResponse.json({ error: "annotatedSvg must contain SVG markup." }, { status: 400 });
  }

  try {
    const { userId } = await auth();
    const user = userId ? await getOrCreateUser(userId) : null;
    const ownedIconId = await getOwnedIconId({
      iconId: requestedIconId,
      userDbId: user?.id ?? null,
    });

    const analysis = await analyzeStudioMotionCandidates({
      annotatedSvg,
      sourceName,
      fallbackPartIds,
    });
    const primary = analysis.candidates[0] ?? null;

    try {
      await persistAnalysisEvent({
        userDbId: user?.id ?? null,
        iconId: ownedIconId,
        sourceName,
        analysis,
      });
    } catch {
      // Telemetry failure should not block analysis response.
    }

    if (user?.id) {
      try {
        await recordStudioMeteringEvent({
          userDbId: user.id,
          eventType: analysis.engine === "agentic" ? "ai_generation" : "deterministic_generation",
          quantity: 1,
          metadata: {
            model: analysis.model,
            promptVersion: analysis.promptVersion,
            plannerVersion: analysis.plannerVersion,
            latencyMs: analysis.latencyMs,
            totalTokens: analysis.tokenUsage?.totalTokens ?? null,
            fallbackReason: analysis.fallbackReason,
            iconId: ownedIconId,
          },
        });
      } catch {
        // Metering failure should not block analysis response.
      }
    }

    return NextResponse.json({
      accepted: true,
      analyzedAt: new Date().toISOString(),
      engine: analysis.engine,
      model: analysis.model,
      promptVersion: analysis.promptVersion,
      plannerVersion: analysis.plannerVersion,
      latencyMs: analysis.latencyMs,
      tokenUsage: analysis.tokenUsage,
      classification: analysis.classification,
      fallbackReason: analysis.fallbackReason,
      primary,
      candidates: analysis.candidates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze SVG.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export type { MotionCandidate };
