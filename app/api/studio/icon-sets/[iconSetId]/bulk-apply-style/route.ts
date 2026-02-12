import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  AnimationLoopMode,
  AnimationPreset,
  AnimationTriggerMode,
} from "@/constants/animations";
import type { IconVersionSource } from "@/types/database";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";

type BulkApplyStyleBody = {
  preset?: AnimationPreset;
  triggerMode?: AnimationTriggerMode;
  loopMode?: AnimationLoopMode;
  source?: IconVersionSource;
  rationale?: string;
};

type ActiveVersionRow = {
  id: string;
  icon_id: string;
  animation_payload: Record<string, unknown> | null;
  custom_css: string | null;
};

const PRESET_VALUES: AnimationPreset[] = ["fade", "scale", "slide", "spin", "bounce", "pulse", "custom"];
const TRIGGER_VALUES: AnimationTriggerMode[] = ["always", "hover"];
const LOOP_VALUES: AnimationLoopMode[] = ["once", "twice", "continuous"];
const SOURCE_VALUES: IconVersionSource[] = ["system", "ai", "manual"];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEnum<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof raw !== "string") return fallback;
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

function normalizeRationale(raw: unknown): string {
  if (typeof raw !== "string") return "Bulk style pack applied.";
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 240) : "Bulk style pack applied.";
}

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === "23505";
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
  source: IconVersionSource;
  animationPayload: Record<string, unknown>;
  customCss: string | null;
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
        custom_css: params.customCss,
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

  let body: BulkApplyStyleBody;
  try {
    body = (await request.json()) as BulkApplyStyleBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const preset = normalizeEnum(body.preset, PRESET_VALUES, "scale");
  const triggerMode = normalizeEnum(body.triggerMode, TRIGGER_VALUES, "hover");
  const loopMode = normalizeEnum(body.loopMode, LOOP_VALUES, "once");
  const source = normalizeEnum(body.source, SOURCE_VALUES, "manual");
  const rationale = normalizeRationale(body.rationale);

  const { data: icons, error: iconsError } = await supabaseAdmin
    .from("icons")
    .select("id,name")
    .eq("icon_set_id", iconSetId)
    .order("name", { ascending: true });

  if (iconsError) {
    return NextResponse.json({ error: "Failed to load icons." }, { status: 500 });
  }

  const iconIds = (icons ?? []).map((item) => item.id as string);
  if (iconIds.length === 0) {
    return NextResponse.json({
      accepted: true,
      iconSetId,
      applied: 0,
      failed: 0,
      preset,
      triggerMode,
      loopMode,
    });
  }

  const { data: activeVersions, error: activeVersionsError } = await supabaseAdmin
    .from("icon_versions")
    .select("id,icon_id,animation_payload,custom_css")
    .in("icon_id", iconIds)
    .eq("is_active", true);

  if (activeVersionsError) {
    return NextResponse.json({ error: "Failed to load active versions." }, { status: 500 });
  }

  const activeByIconId = (activeVersions ?? []).reduce((accumulator, row) => {
    accumulator[row.icon_id as string] = {
      id: row.id as string,
      icon_id: row.icon_id as string,
      animation_payload: (row.animation_payload as Record<string, unknown> | null) ?? null,
      custom_css: (row.custom_css as string | null) ?? null,
    };
    return accumulator;
  }, {} as Record<string, ActiveVersionRow>);

  const createdVersionIds: string[] = [];
  const failures: Array<{ iconId: string; reason: string }> = [];

  for (const iconId of iconIds) {
    const previous = activeByIconId[iconId];
    const previousPayload = previous?.animation_payload ?? {};
    const selectedPartIds = Array.isArray(previousPayload.selectedPartIds)
      ? previousPayload.selectedPartIds.filter((item): item is string => typeof item === "string")
      : [];

    const payload: Record<string, unknown> = {
      ...previousPayload,
      planner: "bulk-style-pack",
      preset,
      triggerMode,
      loopMode,
      selectedPartIds,
      rationale,
      stylePackAppliedAt: nowIso(),
    };

    try {
      const created = await createNextVersion({
        iconId,
        source,
        animationPayload: payload,
        customCss: previous?.custom_css ?? null,
      });

      await supabaseAdmin
        .from("icon_versions")
        .update({ is_active: false })
        .eq("icon_id", iconId);

      await supabaseAdmin
        .from("icon_versions")
        .update({ is_active: true })
        .eq("id", created.id)
        .eq("icon_id", iconId);

      createdVersionIds.push(created.id);
    } catch (error) {
      failures.push({
        iconId,
        reason: error instanceof Error ? error.message : "Failed to apply style.",
      });
    }
  }

  if (iconIds.length > 0) {
    await supabaseAdmin
      .from("icons")
      .update({
        status: "completed",
        updated_at: nowIso(),
      })
      .in("id", iconIds);
  }

  return NextResponse.json({
    accepted: true,
    iconSetId,
    preset,
    triggerMode,
    loopMode,
    applied: createdVersionIds.length,
    failed: failures.length,
    failures: failures.slice(0, 10),
  });
}

