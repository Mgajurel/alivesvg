import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { IconVersionOutcome } from "@/types/database";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";

type BulkEvaluateBody = {
  outcome?: IconVersionOutcome;
  benchmarkKey?: string;
  notes?: string | null;
};

const OUTCOMES: IconVersionOutcome[] = ["accepted", "rejected", "edited"];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOutcome(raw: unknown): IconVersionOutcome | null {
  if (typeof raw !== "string") return null;
  return OUTCOMES.includes(raw as IconVersionOutcome) ? (raw as IconVersionOutcome) : null;
}

function normalizeBenchmarkKey(raw: unknown): string {
  if (typeof raw !== "string") return "studio-feedback-v1";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "studio-feedback-v1";
}

function normalizeNotes(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1000) : null;
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

  let body: BulkEvaluateBody;
  try {
    body = (await request.json()) as BulkEvaluateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const outcome = normalizeOutcome(body.outcome);
  if (!outcome) {
    return NextResponse.json({ error: "Invalid outcome." }, { status: 400 });
  }

  const benchmarkKey = normalizeBenchmarkKey(body.benchmarkKey);
  const notes = normalizeNotes(body.notes);

  const { data: icons, error: iconsError } = await supabaseAdmin
    .from("icons")
    .select("id")
    .eq("icon_set_id", iconSetId);

  if (iconsError) {
    return NextResponse.json({ error: "Failed to load icons." }, { status: 500 });
  }

  const iconIds = (icons ?? []).map((row) => row.id as string);
  if (iconIds.length === 0) {
    return NextResponse.json({
      accepted: true,
      iconSetId,
      outcome,
      updatedVersions: 0,
    });
  }

  const { data: activeVersions, error: versionsError } = await supabaseAdmin
    .from("icon_versions")
    .select("id")
    .in("icon_id", iconIds)
    .eq("is_active", true);

  if (versionsError) {
    return NextResponse.json({ error: "Failed to load active versions." }, { status: 500 });
  }

  const versionIds = (activeVersions ?? []).map((row) => row.id as string);
  if (versionIds.length === 0) {
    return NextResponse.json({
      accepted: true,
      iconSetId,
      outcome,
      updatedVersions: 0,
    });
  }

  const rows = versionIds.map((versionId) => ({
    icon_version_id: versionId,
    user_id: user.id,
    outcome,
    benchmark_key: benchmarkKey,
    notes,
    updated_at: nowIso(),
  }));

  const { error: upsertError } = await supabaseAdmin
    .from("icon_version_evaluations")
    .upsert(rows, {
      onConflict: "icon_version_id,user_id",
    });

  if (upsertError) {
    return NextResponse.json({ error: "Failed to save bulk evaluations." }, { status: 500 });
  }

  return NextResponse.json({
    accepted: true,
    iconSetId,
    outcome,
    benchmarkKey,
    updatedVersions: versionIds.length,
  });
}

