import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { IconVersionOutcome } from "@/types/database";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";

type EvaluationBody = {
  outcome?: IconVersionOutcome;
  benchmarkKey?: string;
  score?: number | null;
  notes?: string | null;
};

const OUTCOMES: IconVersionOutcome[] = ["accepted", "rejected", "edited"];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeOutcome(value: unknown): IconVersionOutcome | null {
  if (typeof value !== "string") return null;
  if (!OUTCOMES.includes(value as IconVersionOutcome)) return null;
  return value as IconVersionOutcome;
}

function normalizeBenchmarkKey(value: unknown): string {
  if (typeof value !== "string") return "studio-feedback-v1";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : "studio-feedback-v1";
}

function normalizeScore(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function normalizeNotes(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1000) : null;
}

async function assertVersionOwnership(params: {
  iconId: string;
  versionId: string;
  userDbId: string;
}): Promise<boolean> {
  const { data: icon } = await supabaseAdmin
    .from("icons")
    .select("id,icon_set_id")
    .eq("id", params.iconId)
    .maybeSingle();

  if (!icon) return false;

  const { data: set } = await supabaseAdmin
    .from("icon_sets")
    .select("id,user_id")
    .eq("id", icon.icon_set_id)
    .maybeSingle();

  if (!set || set.user_id !== params.userDbId) return false;

  const { data: version } = await supabaseAdmin
    .from("icon_versions")
    .select("id")
    .eq("id", params.versionId)
    .eq("icon_id", params.iconId)
    .maybeSingle();

  return Boolean(version);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ iconId: string; versionId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { iconId, versionId } = await context.params;
  if (!iconId || !versionId) {
    return NextResponse.json({ error: "Missing iconId or versionId." }, { status: 400 });
  }

  const user = await getOrCreateUser(userId);

  const allowed = await assertVersionOwnership({
    iconId,
    versionId,
    userDbId: user.id,
  });

  if (!allowed) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 });
  }

  let body: EvaluationBody;
  try {
    body = (await request.json()) as EvaluationBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const outcome = normalizeOutcome(body.outcome);
  if (!outcome) {
    return NextResponse.json({ error: "Invalid outcome." }, { status: 400 });
  }

  const benchmarkKey = normalizeBenchmarkKey(body.benchmarkKey);
  const score = normalizeScore(body.score);
  const notes = normalizeNotes(body.notes);

  const { data, error } = await supabaseAdmin
    .from("icon_version_evaluations")
    .upsert({
      icon_version_id: versionId,
      user_id: user.id,
      outcome,
      benchmark_key: benchmarkKey,
      score,
      notes,
      updated_at: nowIso(),
    }, {
      onConflict: "icon_version_id,user_id",
    })
    .select("id,icon_version_id,user_id,outcome,benchmark_key,score,notes,created_at,updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to save evaluation." }, { status: 500 });
  }

  return NextResponse.json({
    accepted: true,
    evaluation: data,
  });
}
