import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";
import { processZipIngestJobFromStorage } from "@/lib/studioJobs";

export const runtime = "nodejs";

type ProcessBody = {
  jobId?: string;
};

type JobRow = {
  id: string;
  icon_set_id: string | null;
  job_type: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

function getStorageLocation(job: JobRow): { bucket: string; path: string } | null {
  const metadata = job.metadata ?? {};
  const bucket = typeof metadata.storage_bucket === "string" ? metadata.storage_bucket : null;
  const path = typeof metadata.storage_path === "string" ? metadata.storage_path : null;

  if (!bucket || !path) return null;
  return { bucket, path };
}

function nowIso(): string {
  return new Date().toISOString();
}

async function findTargetJob(userDbId: string, jobId?: string): Promise<JobRow | null> {
  if (jobId) {
    const { data } = await supabaseAdmin
      .from("studio_jobs")
      .select("id,icon_set_id,job_type,status,metadata")
      .eq("id", jobId)
      .eq("user_id", userDbId)
      .maybeSingle();
    return (data as JobRow | null) ?? null;
  }

  const { data } = await supabaseAdmin
    .from("studio_jobs")
    .select("id,icon_set_id,job_type,status,metadata")
    .eq("user_id", userDbId)
    .eq("job_type", "zip_ingest")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as JobRow | null) ?? null;
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateUser(userId);

  let body: ProcessBody = {};
  try {
    body = (await request.json()) as ProcessBody;
  } catch {
    body = {};
  }

  const job = await findTargetJob(user.id, body.jobId);
  if (!job) {
    return NextResponse.json({ error: "No matching job found." }, { status: 404 });
  }

  if (job.job_type !== "zip_ingest") {
    return NextResponse.json({ error: "Only zip_ingest jobs are supported." }, { status: 400 });
  }

  if (job.status === "completed") {
    return NextResponse.json({
      accepted: true,
      processed: false,
      reason: "already_completed",
      jobId: job.id,
    });
  }

  if (job.status === "processing") {
    return NextResponse.json({
      accepted: true,
      processed: false,
      reason: "already_processing",
      jobId: job.id,
    });
  }

  if (job.status === "failed" || job.status === "canceled") {
    return NextResponse.json({
      accepted: true,
      processed: false,
      reason: "terminal_status",
      jobId: job.id,
      status: job.status,
    });
  }

  if (!job.icon_set_id) {
    return NextResponse.json({ error: "Job is missing icon_set_id." }, { status: 400 });
  }

  const storage = getStorageLocation(job);
  if (!storage) {
    return NextResponse.json({ error: "Job is missing ZIP storage location." }, { status: 400 });
  }

  try {
    const { data: claimedJob, error: claimError } = await supabaseAdmin
      .from("studio_jobs")
      .update({
        status: "processing",
        started_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("id", job.id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (claimError) {
      return NextResponse.json({ error: `Failed to claim job: ${claimError.message}` }, { status: 500 });
    }

    if (!claimedJob) {
      const { data: latest } = await supabaseAdmin
        .from("studio_jobs")
        .select("status")
        .eq("id", job.id)
        .eq("user_id", user.id)
        .maybeSingle();

      return NextResponse.json({
        accepted: true,
        processed: false,
        reason: "not_claimed",
        jobId: job.id,
        status: latest?.status ?? null,
      });
    }

    await supabaseAdmin
      .from("icon_sets")
      .update({
        status: "processing",
        updated_at: nowIso(),
      })
      .eq("id", job.icon_set_id)
      .eq("user_id", user.id);

    const summary = await processZipIngestJobFromStorage({
      userDbId: user.id,
      iconSetId: job.icon_set_id,
      jobId: job.id,
      bucket: storage.bucket,
      path: storage.path,
      skipInitialStatusUpdate: true,
    });

    return NextResponse.json({
      accepted: true,
      processed: true,
      jobId: job.id,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process job.";
    return NextResponse.json(
      {
        accepted: true,
        processed: false,
        jobId: job.id,
        error: message,
      },
      { status: 500 },
    );
  }
}
