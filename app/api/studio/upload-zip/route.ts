import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";
import { uploadStudioZipSource } from "@/lib/studioStorage";
import {
  MAX_ZIP_UPLOAD_BYTES,
  getIdempotencyKey,
  getStringField,
  isZipFile,
  normalizeSetName,
  sha256FromBuffer,
} from "@/lib/studioUpload";
import { recordStudioMeteringEvent } from "@/lib/studioMetering";

export const runtime = "nodejs";

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

  if (!isZipFile(file.name, file.type)) {
    return NextResponse.json({ error: "Only ZIP files are supported." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "ZIP file is empty." }, { status: 400 });
  }

  if (file.size > MAX_ZIP_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `ZIP file exceeds ${MAX_ZIP_UPLOAD_BYTES} bytes.` },
      { status: 413 },
    );
  }

  const idempotency = getIdempotencyKey(formData, request);
  if (!idempotency.valid) {
    return NextResponse.json({ error: idempotency.error }, { status: 400 });
  }

  const user = await getOrCreateUser(userId);

  if (idempotency.key) {
    const { data: existingJob, error: existingJobError } = await supabaseAdmin
      .from("studio_jobs")
      .select("id,icon_set_id,job_type,status,idempotency_key,created_at,updated_at")
      .eq("user_id", user.id)
      .eq("job_type", "zip_ingest")
      .eq("idempotency_key", idempotency.key)
      .maybeSingle();

    if (existingJobError) {
      return NextResponse.json({ error: "Failed to check idempotency key." }, { status: 500 });
    }

    if (existingJob) {
      return NextResponse.json({
        deduped: true,
        reusedFromIdempotencyKey: true,
        job: existingJob,
      });
    }
  }

  const fileBuffer = await file.arrayBuffer();
  const sourceHash = sha256FromBuffer(fileBuffer);
  const requestedSetName = getStringField(formData.get("setName"));
  const setName = normalizeSetName(requestedSetName ?? file.name);

  const { data: existingSet, error: existingSetError } = await supabaseAdmin
    .from("icon_sets")
    .select("id,name,status,total_icons,created_at")
    .eq("user_id", user.id)
    .eq("source_hash", sourceHash)
    .eq("source_type", "zip")
    .maybeSingle();

  if (existingSetError) {
    return NextResponse.json({ error: "Failed to check previous ZIP uploads." }, { status: 500 });
  }

  let iconSetId: string;
  let deduped = false;

  if (existingSet) {
    iconSetId = existingSet.id;
    deduped = true;
  } else {
    const { data: createdSet, error: createSetError } = await supabaseAdmin
      .from("icon_sets")
      .insert({
        user_id: user.id,
        name: setName,
        source_type: "zip",
        source_file_name: file.name,
        source_hash: sourceHash,
        total_icons: null,
        status: "pending",
        metadata: {
          uploaded_via: "api_studio_upload_zip",
          mime_type: file.type || null,
          bytes: file.size,
        },
      })
      .select("id")
      .single();

    if (createSetError || !createdSet) {
      return NextResponse.json({ error: "Failed to create icon set for ZIP upload." }, { status: 500 });
    }

    iconSetId = createdSet.id;
  }

  const { data: job, error: createJobError } = await supabaseAdmin
    .from("studio_jobs")
    .insert({
      user_id: user.id,
      icon_set_id: iconSetId,
      job_type: "zip_ingest",
      status: "pending",
      idempotency_key: idempotency.key,
      metadata: {
        source_hash: sourceHash,
        file_name: file.name,
        mime_type: file.type || null,
        bytes: file.size,
        processing_mode: "queued",
      },
    })
    .select("id,icon_set_id,job_type,status,idempotency_key,created_at,updated_at")
    .single();

  if (createJobError || !job) {
    return NextResponse.json({ error: "Failed to create ZIP ingest job." }, { status: 500 });
  }

  try {
    const source = await uploadStudioZipSource({
      userDbId: user.id,
      iconSetId,
      jobId: job.id,
      fileName: file.name,
      fileType: file.type || "application/zip",
      fileBuffer,
    });

    await Promise.all([
      supabaseAdmin
        .from("studio_jobs")
        .update({
          metadata: {
            source_hash: sourceHash,
            file_name: file.name,
            mime_type: file.type || null,
            bytes: file.size,
            processing_mode: "queued",
            storage_bucket: source.bucket,
            storage_path: source.path,
          },
        })
        .eq("id", job.id),
      supabaseAdmin
        .from("icon_sets")
        .update({
          metadata: {
            uploaded_via: "api_studio_upload_zip",
            mime_type: file.type || null,
            bytes: file.size,
            storage_bucket: source.bucket,
            storage_path: source.path,
          },
        })
        .eq("id", iconSetId),
    ]);

    try {
      await recordStudioMeteringEvent({
        userDbId: user.id,
        eventType: "zip_ingest_job",
        quantity: 1,
        metadata: {
          jobId: job.id,
          iconSetId,
          sourceHash,
          bytes: file.size,
          deduped,
        },
      });
    } catch {
      // Metering should not block uploads.
    }

    return NextResponse.json(
      {
        deduped,
        accepted: true,
        processing: "queued",
        storage: {
          bucket: source.bucket,
          path: source.path,
        },
        job,
      },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to persist ZIP source.";
    await Promise.all([
      supabaseAdmin
        .from("studio_jobs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
          metadata: {
            source_hash: sourceHash,
            file_name: file.name,
            mime_type: file.type || null,
            bytes: file.size,
            processing_mode: "queued",
            source_upload_error: message,
          },
        })
        .eq("id", job.id),
      supabaseAdmin
        .from("icon_sets")
        .update({
          status: "failed",
          metadata: {
            uploaded_via: "api_studio_upload_zip",
            mime_type: file.type || null,
            bytes: file.size,
            source_upload_error: message,
          },
        })
        .eq("id", iconSetId),
    ]);

    return NextResponse.json({ error: message, jobId: job.id }, { status: 500 });
  }
}
