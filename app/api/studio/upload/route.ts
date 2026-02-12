import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";
import {
  MAX_SVG_UPLOAD_BYTES,
  getStringField,
  normalizeIconName,
  normalizeSetName,
  sha256FromString,
  validateSvgMarkup,
} from "@/lib/studioUpload";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "SVG file is empty." }, { status: 400 });
  }

  if (file.size > MAX_SVG_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `SVG file exceeds ${MAX_SVG_UPLOAD_BYTES} bytes.` },
      { status: 413 },
    );
  }

  const svgContent = await file.text();
  const validation = validateSvgMarkup(svgContent);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const user = await getOrCreateUser(userId);
  const sourceHash = sha256FromString(svgContent);
  const requestedSetName = getStringField(formData.get("setName"));
  const requestedIconName = getStringField(formData.get("iconName"));
  const setName = normalizeSetName(requestedSetName ?? file.name);
  const iconName = normalizeIconName(requestedIconName ?? file.name);

  const { data: existingSet, error: existingSetError } = await supabaseAdmin
    .from("icon_sets")
    .select("id,name,status,total_icons,created_at")
    .eq("user_id", user.id)
    .eq("source_hash", sourceHash)
    .eq("source_type", "single")
    .maybeSingle();

  if (existingSetError) {
    return NextResponse.json({ error: "Failed to check existing uploads." }, { status: 500 });
  }

  if (existingSet) {
    const { data: existingIcon, error: existingIconError } = await supabaseAdmin
      .from("icons")
      .select("id,name,status,source_hash,created_at")
      .eq("icon_set_id", existingSet.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingIconError) {
      return NextResponse.json({ error: "Failed to load existing icon." }, { status: 500 });
    }

    return NextResponse.json({
      deduped: true,
      iconSet: existingSet,
      icon: existingIcon,
    });
  }

  const { data: iconSet, error: iconSetError } = await supabaseAdmin
    .from("icon_sets")
    .insert({
      user_id: user.id,
      name: setName,
      source_type: "single",
      source_file_name: file.name,
      source_hash: sourceHash,
      total_icons: 1,
      status: "completed",
      metadata: {
        uploaded_via: "api_studio_upload",
        mime_type: file.type || null,
        bytes: file.size,
      },
    })
    .select("id,name,status,total_icons,created_at")
    .single();

  if (iconSetError || !iconSet) {
    return NextResponse.json({ error: "Failed to create icon set." }, { status: 500 });
  }

  const { data: icon, error: iconError } = await supabaseAdmin
    .from("icons")
    .insert({
      icon_set_id: iconSet.id,
      name: iconName,
      source_svg: svgContent,
      source_hash: sourceHash,
      status: "uploaded",
      metadata: {
        mime_type: file.type || null,
      },
    })
    .select("id,name,status,source_hash,created_at")
    .single();

  if (iconError || !icon) {
    return NextResponse.json({ error: "Failed to create icon record." }, { status: 500 });
  }

  const { error: versionError } = await supabaseAdmin
    .from("icon_versions")
    .insert({
      icon_id: icon.id,
      version_number: 1,
      source: "system",
      is_active: true,
      animation_payload: {
        preset: "none",
        trigger: "always",
        loop: "once",
      },
    });

  if (versionError) {
    return NextResponse.json({ error: "Failed to initialize icon version." }, { status: 500 });
  }

  return NextResponse.json(
    {
      deduped: false,
      iconSet,
      icon,
    },
    { status: 201 },
  );
}
