import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";

type VersionSource = "system" | "ai" | "manual";

type CreateVersionBody = {
  source?: VersionSource;
  animationPayload?: Record<string, unknown>;
  customCss?: string | null;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseLimit(rawLimit: string | null): number {
  if (!rawLimit) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === "23505";
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeSource(raw: unknown): VersionSource {
  if (raw === "ai" || raw === "manual") return raw;
  return "system";
}

function normalizeCustomCss(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAnimationPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

async function assertIconOwnership(params: {
  iconId: string;
  userDbId: string;
}): Promise<{ iconSetId: string } | null> {
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

  return {
    iconSetId: set.id as string,
  };
}

async function createNextVersion(params: {
  iconId: string;
  source: VersionSource;
  animationPayload: Record<string, unknown>;
  customCss: string | null;
}): Promise<{ id: string; version_number: number; created_at: string }> {
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
        custom_css: params.customCss,
        is_active: false,
      })
      .select("id,version_number,created_at")
      .single();

    if (!createError && created) {
      return {
        id: created.id as string,
        version_number: created.version_number as number,
        created_at: created.created_at as string,
      };
    }

    if (!isUniqueViolation(createError)) {
      throw new Error(createError?.message ?? "Failed to create icon version.");
    }
  }

  throw new Error("Could not allocate next icon version number after retries.");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ iconId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { iconId } = await context.params;
  if (!iconId) {
    return NextResponse.json({ error: "Missing icon id." }, { status: 400 });
  }

  const user = await getOrCreateUser(userId);
  const ownership = await assertIconOwnership({ iconId, userDbId: user.id });
  if (!ownership) {
    return NextResponse.json({ error: "Icon not found." }, { status: 404 });
  }

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  const { data: versions, error: versionsError } = await supabaseAdmin
    .from("icon_versions")
    .select("id,version_number,source,is_active,animation_payload,custom_css,created_at")
    .eq("icon_id", iconId)
    .order("version_number", { ascending: false })
    .limit(limit);

  if (versionsError) {
    return NextResponse.json({ error: "Failed to load versions." }, { status: 500 });
  }

  const versionIds = (versions ?? []).map((item) => item.id as string);
  let evaluationsByVersionId: Record<string, {
    id: string;
    outcome: string;
    benchmark_key: string;
    score: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }> = {};

  if (versionIds.length > 0) {
    const { data: evaluations, error: evaluationsError } = await supabaseAdmin
      .from("icon_version_evaluations")
      .select("id,icon_version_id,outcome,benchmark_key,score,notes,created_at,updated_at")
      .eq("user_id", user.id)
      .in("icon_version_id", versionIds);

    if (evaluationsError) {
      return NextResponse.json({ error: "Failed to load version evaluations." }, { status: 500 });
    }

    evaluationsByVersionId = (evaluations ?? []).reduce((accumulator, row) => {
      accumulator[row.icon_version_id as string] = {
        id: row.id as string,
        outcome: row.outcome as string,
        benchmark_key: row.benchmark_key as string,
        score: (row.score as number | null) ?? null,
        notes: (row.notes as string | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      };
      return accumulator;
    }, {} as Record<string, {
      id: string;
      outcome: string;
      benchmark_key: string;
      score: number | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    }>);
  }

  return NextResponse.json({
    iconId,
    versions: (versions ?? []).map((version) => ({
      ...version,
      evaluation: evaluationsByVersionId[version.id as string] ?? null,
    })),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ iconId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { iconId } = await context.params;
  if (!iconId) {
    return NextResponse.json({ error: "Missing icon id." }, { status: 400 });
  }

  const user = await getOrCreateUser(userId);
  const ownership = await assertIconOwnership({ iconId, userDbId: user.id });
  if (!ownership) {
    return NextResponse.json({ error: "Icon not found." }, { status: 404 });
  }

  let body: CreateVersionBody;
  try {
    body = (await request.json()) as CreateVersionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const source = normalizeSource(body.source);
  const animationPayload = normalizeAnimationPayload(body.animationPayload);
  const customCss = normalizeCustomCss(body.customCss);

  try {
    const created = await createNextVersion({
      iconId,
      source,
      animationPayload,
      customCss,
    });

    // Ensure only one active version.
    await supabaseAdmin
      .from("icon_versions")
      .update({ is_active: false })
      .eq("icon_id", iconId);

    await supabaseAdmin
      .from("icon_versions")
      .update({ is_active: true })
      .eq("id", created.id)
      .eq("icon_id", iconId);

    await supabaseAdmin
      .from("icons")
      .update({
        status: "completed",
        updated_at: nowIso(),
      })
      .eq("id", iconId);

    return NextResponse.json(
      {
        accepted: true,
        iconId,
        version: {
          id: created.id,
          versionNumber: created.version_number,
          source,
          isActive: true,
          createdAt: created.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create version.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
