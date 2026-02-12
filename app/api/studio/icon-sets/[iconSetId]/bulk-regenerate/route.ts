import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { createDeterministicMotionCandidates } from "@/lib/studioMotionPlanner";
import {
  analyzeStudioMotionCandidates,
  type MotionAnalysisResult,
} from "@/lib/studioAgenticPlanner";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";
import { recordStudioMeteringEvent } from "@/lib/studioMetering";

type BulkRegenerateBody = {
  engine?: "agentic" | "deterministic";
  limit?: number;
};

type WorkIcon = {
  id: string;
  name: string;
  source_svg: string;
};

type JobItemInsert = {
  job_id: string;
  icon_id: string;
  status: "completed" | "failed";
  payload: Record<string, unknown>;
  error_message: string | null;
  updated_at: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function clampLimit(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 200;
  const rounded = Math.floor(raw);
  if (rounded <= 0) return 1;
  return Math.min(rounded, 500);
}

function normalizeEngine(raw: unknown): "agentic" | "deterministic" {
  return raw === "agentic" ? "agentic" : "deterministic";
}

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === "23505";
}

function annotateSvgServer(svg: string): { annotatedSvg: string; fallbackPartIds: string[] } {
  const pattern = /<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)>/gi;
  let counter = 0;
  const partIds: string[] = [];

  const annotatedSvg = svg.replace(pattern, (fullMatch, tagName, attrs) => {
    const existing = /data-alivesvg-id\s*=\s*["']([^"']+)["']/i.exec(attrs);
    let partId: string;
    if (existing?.[1]) {
      partId = existing[1];
    } else {
      counter += 1;
      partId = `alivesvg-${counter}`;
      partIds.push(partId);
      const spacing = attrs.length > 0 && !attrs.startsWith(" ") ? " " : "";
      return `<${tagName}${spacing}${attrs} data-alivesvg-id="${partId}">`;
    }
    partIds.push(partId);
    return fullMatch;
  });

  const uniqueIds = Array.from(new Set(partIds));
  return {
    annotatedSvg,
    fallbackPartIds: uniqueIds.slice(0, 4),
  };
}

async function assertSetOwnership(params: {
  iconSetId: string;
  userDbId: string;
}): Promise<boolean> {
  const { data: iconSet, error } = await supabaseAdmin
    .from("icon_sets")
    .select("id,user_id")
    .eq("id", params.iconSetId)
    .maybeSingle();

  if (error || !iconSet) return false;
  return iconSet.user_id === params.userDbId;
}

async function createNextVersion(params: {
  iconId: string;
  source: "system" | "ai";
  animationPayload: Record<string, unknown>;
}): Promise<{ id: string; versionNumber: number }> {
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const { data: current } = await supabaseAdmin
      .from("icon_versions")
      .select("version_number")
      .eq("icon_id", params.iconId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersionNumber = ((current?.version_number as number | undefined) ?? 0) + 1;

    const { data: created, error: createError } = await supabaseAdmin
      .from("icon_versions")
      .insert({
        icon_id: params.iconId,
        version_number: nextVersionNumber,
        source: params.source,
        animation_payload: params.animationPayload,
        custom_css: null,
        is_active: false,
      })
      .select("id,version_number")
      .single();

    if (!createError && created) {
      return {
        id: created.id as string,
        versionNumber: created.version_number as number,
      };
    }

    if (!isUniqueViolation(createError)) {
      throw new Error(createError?.message ?? "Failed to create next version.");
    }
  }

  throw new Error("Failed to allocate version number after retries.");
}

function deterministicAnalysis(input: {
  annotatedSvg: string;
  sourceName: string;
  fallbackPartIds: string[];
}): MotionAnalysisResult {
  const startedAt = Date.now();
  const candidates = createDeterministicMotionCandidates({
    annotatedSvg: input.annotatedSvg,
    sourceName: input.sourceName,
    fallbackPartIds: input.fallbackPartIds,
  });

  return {
    engine: "deterministic",
    model: null,
    promptVersion: "deterministic-v1",
    plannerVersion: 1,
    latencyMs: Date.now() - startedAt,
    tokenUsage: null,
    classification: null,
    fallbackReason: null,
    candidates,
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ iconSetId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { iconSetId } = await context.params;
  if (!iconSetId) {
    return NextResponse.json({ error: "Missing icon set id." }, { status: 400 });
  }

  const user = await getOrCreateUser(userId);
  const owned = await assertSetOwnership({ iconSetId, userDbId: user.id });
  if (!owned) {
    return NextResponse.json({ error: "Icon set not found." }, { status: 404 });
  }

  let body: BulkRegenerateBody;
  try {
    body = (await request.json()) as BulkRegenerateBody;
  } catch {
    body = {};
  }

  const requestedEngine = normalizeEngine(body.engine);
  const limit = clampLimit(body.limit);

  const { data: icons, error: iconsError } = await supabaseAdmin
    .from("icons")
    .select("id,name,source_svg")
    .eq("icon_set_id", iconSetId)
    .not("source_svg", "is", null)
    .order("name", { ascending: true })
    .limit(limit);

  if (iconsError) {
    return NextResponse.json({ error: "Failed to load icons for regeneration." }, { status: 500 });
  }

  const workIcons = (icons ?? [])
    .filter((item) => typeof item.source_svg === "string" && item.source_svg.trim().length > 0)
    .map((item) => ({
      id: item.id as string,
      name: (item.name as string) || "Icon",
      source_svg: item.source_svg as string,
    })) as WorkIcon[];

  if (workIcons.length === 0) {
    return NextResponse.json({
      accepted: true,
      iconSetId,
      jobId: null,
      requestedEngine,
      processed: 0,
      succeeded: 0,
      failed: 0,
    });
  }

  const { data: job, error: jobError } = await supabaseAdmin
    .from("studio_jobs")
    .insert({
      user_id: user.id,
      icon_set_id: iconSetId,
      job_type: "animation_generate",
      status: "processing",
      metadata: {
        operation: "bulk-regenerate",
        requestedEngine,
        requestedCount: workIcons.length,
      },
      started_at: nowIso(),
      updated_at: nowIso(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to create regenerate job." }, { status: 500 });
  }

  const jobItems: JobItemInsert[] = [];
  let succeeded = 0;
  let failed = 0;
  let aiCount = 0;
  let deterministicCount = 0;

  for (const icon of workIcons) {
    try {
      const { annotatedSvg, fallbackPartIds } = annotateSvgServer(icon.source_svg);
      const analysis = requestedEngine === "agentic"
        ? await analyzeStudioMotionCandidates({
          annotatedSvg,
          sourceName: icon.name,
          fallbackPartIds,
        })
        : deterministicAnalysis({
          annotatedSvg,
          sourceName: icon.name,
          fallbackPartIds,
        });

      const primary = analysis.candidates[0];
      if (!primary) {
        throw new Error("No candidate generated.");
      }

      const payload: Record<string, unknown> = {
        planner: analysis.engine,
        plannerVersion: analysis.plannerVersion,
        promptVersion: analysis.promptVersion,
        model: analysis.model,
        title: primary.title,
        score: primary.score,
        confidence: primary.confidence,
        rationale: primary.rationale,
        intent: primary.intent,
        preset: primary.preset,
        triggerMode: primary.triggerMode,
        loopMode: primary.loopMode,
        selectedPartIds: primary.selectedPartIds,
        analysis: {
          engine: analysis.engine,
          model: analysis.model,
          promptVersion: analysis.promptVersion,
          plannerVersion: analysis.plannerVersion,
          latencyMs: analysis.latencyMs,
          tokenUsage: analysis.tokenUsage,
          classification: analysis.classification,
          fallbackReason: analysis.fallbackReason,
        },
      };

      const created = await createNextVersion({
        iconId: icon.id,
        source: analysis.engine === "agentic" ? "ai" : "system",
        animationPayload: payload,
      });

      await supabaseAdmin
        .from("icon_versions")
        .update({ is_active: false })
        .eq("icon_id", icon.id);

      await supabaseAdmin
        .from("icon_versions")
        .update({ is_active: true })
        .eq("id", created.id)
        .eq("icon_id", icon.id);

      await supabaseAdmin
        .from("icons")
        .update({
          status: "completed",
          updated_at: nowIso(),
        })
        .eq("id", icon.id);

      jobItems.push({
        job_id: job.id as string,
        icon_id: icon.id,
        status: "completed",
        payload: {
          sourceName: icon.name,
          engine: analysis.engine,
          versionId: created.id,
          versionNumber: created.versionNumber,
          score: primary.score,
        },
        error_message: null,
        updated_at: nowIso(),
      });

      if (analysis.engine === "agentic") {
        aiCount += 1;
      } else {
        deterministicCount += 1;
      }
      succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Regenerate failed.";
      jobItems.push({
        job_id: job.id as string,
        icon_id: icon.id,
        status: "failed",
        payload: {
          sourceName: icon.name,
          reason: message,
        },
        error_message: message,
        updated_at: nowIso(),
      });
      failed += 1;
    }
  }

  if (jobItems.length > 0) {
    await supabaseAdmin
      .from("studio_job_items")
      .insert(jobItems);
  }

  await supabaseAdmin
    .from("studio_jobs")
    .update({
      status: failed > 0 && succeeded === 0 ? "failed" : "completed",
      metadata: {
        operation: "bulk-regenerate",
        requestedEngine,
        requestedCount: workIcons.length,
        processed: workIcons.length,
        succeeded,
        failed,
        aiCount,
        deterministicCount,
      },
      error_message: failed > 0 && succeeded === 0
        ? "All icons failed regeneration."
        : null,
      completed_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", job.id);

  if (aiCount > 0) {
    await recordStudioMeteringEvent({
      userDbId: user.id,
      eventType: "ai_generation",
      quantity: aiCount,
      metadata: {
        iconSetId,
        jobId: job.id,
        source: "bulk-regenerate",
      },
    }).catch(() => undefined);
  }
  if (deterministicCount > 0) {
    await recordStudioMeteringEvent({
      userDbId: user.id,
      eventType: "deterministic_generation",
      quantity: deterministicCount,
      metadata: {
        iconSetId,
        jobId: job.id,
        source: "bulk-regenerate",
      },
    }).catch(() => undefined);
  }

  return NextResponse.json({
    accepted: true,
    iconSetId,
    jobId: job.id,
    requestedEngine,
    processed: workIcons.length,
    succeeded,
    failed,
  });
}
