import JSZip from "jszip";
import { PostgrestError } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  normalizeIconName,
  sha256FromString,
  validateSvgMarkup,
} from "@/lib/studioUpload";

const MAX_ZIP_SVG_FILES = 2000;
const MAX_ZIP_TOTAL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100MB

type ProcessZipIngestParams = {
  userDbId: string;
  iconSetId: string;
  jobId: string;
  zipBuffer: ArrayBuffer;
  skipInitialStatusUpdate?: boolean;
};

type ZipIngestSummary = {
  totalEntries: number;
  processed: number;
  created: number;
  deduped: number;
  failed: number;
  invalid: number;
};

type ProcessZipIngestFromStorageParams = {
  userDbId: string;
  iconSetId: string;
  jobId: string;
  bucket: string;
  path: string;
  skipInitialStatusUpdate?: boolean;
};

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === "23505";
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function processZipIngestJob({
  userDbId,
  iconSetId,
  jobId,
  zipBuffer,
  skipInitialStatusUpdate = false,
}: ProcessZipIngestParams): Promise<ZipIngestSummary> {
  const [{ data: currentJob }, { data: currentSet }] = await Promise.all([
    supabaseAdmin
      .from("studio_jobs")
      .select("metadata")
      .eq("id", jobId)
      .eq("user_id", userDbId)
      .maybeSingle(),
    supabaseAdmin
      .from("icon_sets")
      .select("metadata")
      .eq("id", iconSetId)
      .eq("user_id", userDbId)
      .maybeSingle(),
  ]);

  const existingJobMetadata = (currentJob?.metadata as Record<string, unknown> | undefined) ?? {};
  const existingSetMetadata = (currentSet?.metadata as Record<string, unknown> | undefined) ?? {};

  if (!skipInitialStatusUpdate) {
    await supabaseAdmin
      .from("studio_jobs")
      .update({
        status: "processing",
        started_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("id", jobId)
      .eq("user_id", userDbId);

    await supabaseAdmin
      .from("icon_sets")
      .update({
        status: "processing",
        updated_at: nowIso(),
      })
      .eq("id", iconSetId)
      .eq("user_id", userDbId);
  }

  const summary: ZipIngestSummary = {
    totalEntries: 0,
    processed: 0,
    created: 0,
    deduped: 0,
    failed: 0,
    invalid: 0,
  };

  try {
    const zip = await JSZip.loadAsync(Buffer.from(zipBuffer), {
      checkCRC32: true,
      createFolders: false,
    });

    const svgEntries = Object.values(zip.files)
      .filter((entry) => !entry.dir)
      .filter((entry) => entry.name.toLowerCase().endsWith(".svg"));

    summary.totalEntries = svgEntries.length;

    if (svgEntries.length === 0) {
      throw new Error("ZIP does not contain any .svg files.");
    }

    if (svgEntries.length > MAX_ZIP_SVG_FILES) {
      throw new Error(`ZIP contains too many SVG files (max ${MAX_ZIP_SVG_FILES}).`);
    }

    let totalBytes = 0;

    for (const entry of svgEntries) {
      summary.processed += 1;

      const svgContent = await entry.async("string");
      totalBytes += Buffer.byteLength(svgContent, "utf8");

      if (totalBytes > MAX_ZIP_TOTAL_UNCOMPRESSED_BYTES) {
        throw new Error("ZIP exceeds total uncompressed SVG size limit.");
      }

      const validation = validateSvgMarkup(svgContent);
      if (!validation.valid) {
        summary.failed += 1;
        summary.invalid += 1;
        await supabaseAdmin.from("studio_job_items").insert({
          job_id: jobId,
          status: "failed",
          payload: {
            file_path: entry.name,
            reason: validation.error ?? "Invalid SVG",
          },
          error_message: validation.error ?? "Invalid SVG",
        });
        continue;
      }

      const iconName = normalizeIconName(entry.name);
      const sourceHash = sha256FromString(svgContent);

      const { data: createdIcon, error: createIconError } = await supabaseAdmin
        .from("icons")
        .insert({
          icon_set_id: iconSetId,
          name: iconName,
          source_svg: svgContent,
          source_hash: sourceHash,
          status: "uploaded",
          metadata: {
            source_path: entry.name,
          },
        })
        .select("id")
        .single();

      if (createIconError && !isUniqueViolation(createIconError)) {
        summary.failed += 1;
        await supabaseAdmin.from("studio_job_items").insert({
          job_id: jobId,
          status: "failed",
          payload: {
            file_path: entry.name,
            reason: "icon_insert_error",
          },
          error_message: createIconError.message,
        });
        continue;
      }

      if (!createdIcon && isUniqueViolation(createIconError)) {
        summary.deduped += 1;

        const { data: existingIcon } = await supabaseAdmin
          .from("icons")
          .select("id")
          .eq("icon_set_id", iconSetId)
          .eq("source_hash", sourceHash)
          .maybeSingle();

        await supabaseAdmin.from("studio_job_items").insert({
          job_id: jobId,
          icon_id: existingIcon?.id ?? null,
          status: "completed",
          payload: {
            file_path: entry.name,
            deduped: true,
          },
        });
        continue;
      }

      summary.created += 1;

      if (createdIcon) {
        const { error: versionError } = await supabaseAdmin
          .from("icon_versions")
          .insert({
            icon_id: createdIcon.id,
            version_number: 1,
            source: "system",
            is_active: true,
            animation_payload: {
              preset: "none",
              trigger: "always",
              loop: "once",
            },
          });

        if (versionError && !isUniqueViolation(versionError)) {
          summary.failed += 1;
          await supabaseAdmin.from("studio_job_items").insert({
            job_id: jobId,
            icon_id: createdIcon.id,
            status: "failed",
            payload: {
              file_path: entry.name,
              reason: "version_insert_error",
            },
            error_message: versionError.message,
          });
          continue;
        }
      }

      await supabaseAdmin.from("studio_job_items").insert({
        job_id: jobId,
        icon_id: createdIcon?.id ?? null,
        status: "completed",
        payload: {
          file_path: entry.name,
          deduped: false,
        },
      });
    }

    const { count: totalIconsInSet } = await supabaseAdmin
      .from("icons")
      .select("*", { count: "exact", head: true })
      .eq("icon_set_id", iconSetId);

    await supabaseAdmin
      .from("icon_sets")
      .update({
        status: "completed",
        total_icons: totalIconsInSet ?? summary.created + summary.deduped,
        metadata: {
          ...existingSetMetadata,
          ingest_summary: summary,
        },
        updated_at: nowIso(),
      })
      .eq("id", iconSetId)
      .eq("user_id", userDbId);

    await supabaseAdmin
      .from("studio_jobs")
      .update({
        status: "completed",
        metadata: {
          ...existingJobMetadata,
          ingest_summary: summary,
        },
        updated_at: nowIso(),
        completed_at: nowIso(),
      })
      .eq("id", jobId)
      .eq("user_id", userDbId);

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ZIP ingest error.";
    await supabaseAdmin
      .from("icon_sets")
      .update({
        status: "failed",
        metadata: {
          ...existingSetMetadata,
          ingest_error: message,
          ingest_summary: summary,
        },
        updated_at: nowIso(),
      })
      .eq("id", iconSetId)
      .eq("user_id", userDbId);

    await supabaseAdmin
      .from("studio_jobs")
      .update({
        status: "failed",
        error_message: message,
        metadata: {
          ...existingJobMetadata,
          ingest_error: message,
          ingest_summary: summary,
        },
        updated_at: nowIso(),
        completed_at: nowIso(),
      })
      .eq("id", jobId)
      .eq("user_id", userDbId);

    throw error;
  }
}

export async function processZipIngestJobFromStorage({
  userDbId,
  iconSetId,
  jobId,
  bucket,
  path,
  skipInitialStatusUpdate = false,
}: ProcessZipIngestFromStorageParams): Promise<ZipIngestSummary> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .download(path);

  if (error || !data) {
    throw new Error(`Failed to download ZIP source from storage: ${error?.message ?? "Not found"}`);
  }

  const zipBuffer = await data.arrayBuffer();
  return processZipIngestJob({
    userDbId,
    iconSetId,
    jobId,
    zipBuffer,
    skipInitialStatusUpdate,
  });
}
