import JSZip from "jszip";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";
import { buildExportBundleFiles } from "@/lib/studioExportBundle";
import { recordStudioMeteringEvent } from "@/lib/studioMetering";

type ExportBody = {
  mode?: "package" | "inline";
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeMode(raw: unknown): "package" | "inline" {
  return raw === "inline" ? "inline" : "package";
}

function getDownloadFileName(iconSetName: string, mode: "package" | "inline"): string {
  const safe = iconSetName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "icon-set";
  return `${safe}-${mode}-export.zip`;
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

  let body: ExportBody = {};
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    body = {};
  }

  const mode = normalizeMode(body.mode);
  const user = await getOrCreateUser(userId);

  const { data: iconSet, error: setError } = await supabaseAdmin
    .from("icon_sets")
    .select("id,name,user_id")
    .eq("id", iconSetId)
    .maybeSingle();

  if (setError) {
    return NextResponse.json({ error: "Failed to load icon set." }, { status: 500 });
  }

  if (!iconSet || iconSet.user_id !== user.id) {
    return NextResponse.json({ error: "Icon set not found." }, { status: 404 });
  }

  const { data: icons, error: iconsError } = await supabaseAdmin
    .from("icons")
    .select("id,name,source_svg,status")
    .eq("icon_set_id", iconSetId)
    .order("name", { ascending: true });

  if (iconsError) {
    return NextResponse.json({ error: "Failed to load icons for export." }, { status: 500 });
  }

  const exportableIcons = (icons ?? [])
    .filter((icon) => typeof icon.source_svg === "string" && icon.source_svg.trim().length > 0);

  if (exportableIcons.length === 0) {
    return NextResponse.json({ error: "No exportable SVGs found in this icon set." }, { status: 400 });
  }

  const iconIds = exportableIcons.map((icon) => icon.id as string);
  const { data: activeVersions, error: versionsError } = await supabaseAdmin
    .from("icon_versions")
    .select("id,icon_id,version_number,animation_payload,custom_css")
    .in("icon_id", iconIds)
    .eq("is_active", true);

  if (versionsError) {
    return NextResponse.json({ error: "Failed to load active icon versions." }, { status: 500 });
  }

  const versionsByIconId = (activeVersions ?? []).reduce((accumulator, row) => {
    accumulator[row.icon_id as string] = {
      id: row.id as string,
      versionNumber: row.version_number as number,
      animationPayload: (row.animation_payload as Record<string, unknown> | null) ?? null,
      customCss: (row.custom_css as string | null) ?? null,
    };
    return accumulator;
  }, {} as Record<string, {
    id: string;
    versionNumber: number;
    animationPayload: Record<string, unknown> | null;
    customCss: string | null;
  }>);

  const exportIcons = exportableIcons.map((icon) => ({
    id: icon.id as string,
    name: (icon.name as string) || "Icon",
    sourceSvg: icon.source_svg as string,
    activeVersion: versionsByIconId[icon.id as string] ?? null,
  }));

  const { files, manifest } = buildExportBundleFiles({
    mode,
    iconSetId,
    iconSetName: iconSet.name as string,
    icons: exportIcons,
  });

  const { data: exportJob } = await supabaseAdmin
    .from("studio_jobs")
    .insert({
      user_id: user.id,
      icon_set_id: iconSetId,
      job_type: "export_bundle",
      status: "processing",
      metadata: {
        mode,
        iconCount: exportIcons.length,
      },
      started_at: nowIso(),
      updated_at: nowIso(),
    })
    .select("id")
    .maybeSingle();

  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.path, file.content);
  }
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const zipBuffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const zipBytes = new Uint8Array(zipBuffer.byteLength);
  zipBytes.set(zipBuffer);
  const zipBlob = new Blob([zipBytes], { type: "application/zip" });

  if (exportJob?.id) {
    await supabaseAdmin.from("studio_job_items").insert(
      exportIcons.map((icon) => ({
        job_id: exportJob.id,
        icon_id: icon.id,
        status: "completed",
        payload: {
          sourceName: icon.name,
          hasActiveVersion: Boolean(icon.activeVersion),
        },
        updated_at: nowIso(),
      })),
    );

    await supabaseAdmin
      .from("studio_jobs")
      .update({
        status: "completed",
        metadata: {
          mode,
          iconCount: exportIcons.length,
          manifestCount: (manifest.count as number) ?? exportIcons.length,
          fileCount: files.length + 1,
        },
        completed_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("id", exportJob.id);
  }

  try {
    await recordStudioMeteringEvent({
      userDbId: user.id,
      eventType: "export_bundle",
      quantity: Math.max(1, exportIcons.length),
      metadata: {
        iconSetId,
        mode,
        iconCount: exportIcons.length,
        jobId: exportJob?.id ?? null,
      },
    });
  } catch {
    // Metering should not block downloads.
  }

  const fileName = getDownloadFileName(iconSet.name as string, mode);

  return new NextResponse(zipBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
