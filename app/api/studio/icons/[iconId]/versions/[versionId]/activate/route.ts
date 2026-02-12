import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";

function nowIso(): string {
  return new Date().toISOString();
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

  return { iconSetId: set.id as string };
}

export async function POST(
  _request: Request,
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
  const ownership = await assertIconOwnership({ iconId, userDbId: user.id });
  if (!ownership) {
    return NextResponse.json({ error: "Icon not found." }, { status: 404 });
  }

  const { data: targetVersion, error: targetVersionError } = await supabaseAdmin
    .from("icon_versions")
    .select("id,icon_id,version_number,source,is_active,animation_payload,custom_css,created_at")
    .eq("id", versionId)
    .eq("icon_id", iconId)
    .maybeSingle();

  if (targetVersionError) {
    return NextResponse.json({ error: "Failed to load target version." }, { status: 500 });
  }

  if (!targetVersion) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 });
  }

  const { error: deactivateError } = await supabaseAdmin
    .from("icon_versions")
    .update({ is_active: false })
    .eq("icon_id", iconId);

  if (deactivateError) {
    return NextResponse.json({ error: "Failed to deactivate current version." }, { status: 500 });
  }

  const { error: activateError } = await supabaseAdmin
    .from("icon_versions")
    .update({ is_active: true })
    .eq("id", versionId)
    .eq("icon_id", iconId);

  if (activateError) {
    return NextResponse.json({ error: "Failed to activate target version." }, { status: 500 });
  }

  await supabaseAdmin
    .from("icons")
    .update({
      status: "completed",
      updated_at: nowIso(),
    })
    .eq("id", iconId);

  return NextResponse.json({
    accepted: true,
    iconId,
    version: {
      id: targetVersion.id,
      versionNumber: targetVersion.version_number,
      source: targetVersion.source,
      isActive: true,
      animationPayload: targetVersion.animation_payload,
      customCss: targetVersion.custom_css,
      createdAt: targetVersion.created_at,
    },
  });
}
