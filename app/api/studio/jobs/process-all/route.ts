import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";
import { processZipIngestJobFromStorage } from "@/lib/studioJobs";

export const runtime = "nodejs";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function nowIso(): string {
  return new Date().toISOString();
}

type PendingJob = {
  id: string;
  user_id: string;
  icon_set_id: string | null;
  metadata: Record<string, unknown> | null;
};

function getStorageLocation(job: PendingJob): { bucket: string; path: string } | null {
  const metadata = job.metadata ?? {};
  const bucket = typeof metadata.storage_bucket === "string" ? metadata.storage_bucket : null;
  const path = typeof metadata.storage_path === "string" ? metadata.storage_path : null;
  if (!bucket || !path) return null;
  return { bucket, path };
}

async function getPendingJobs(limit: number, userDbId?: string): Promise<PendingJob[]> {
  let query = supabaseAdmin
    .from("studio_jobs")
    .select("id,user_id,icon_set_id,metadata")
    .eq("job_type", "zip_ingest")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (userDbId) {
    query = query.eq("user_id", userDbId);
  }

  const { data } = await query;
  return (data ?? []) as PendingJob[];
}

async function claimJob(job: PendingJob): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("studio_jobs")
    .update({
      status: "processing",
      started_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", job.id)
    .eq("user_id", job.user_id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));

  const workerSecret = process.env.STUDIO_WORKER_SECRET?.trim();
  const workerHeader = request.headers.get("x-studio-worker-key")?.trim() ?? "";

  let userDbId: string | undefined;

  if (workerSecret) {
    if (!workerHeader || workerHeader !== workerSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await getOrCreateUser(userId);
    userDbId = user.id;
  }

  const pendingJobs = await getPendingJobs(limit, userDbId);
  const results: Array<{ jobId: string; processed: boolean; reason?: string; error?: string }> = [];

  for (const job of pendingJobs) {
    if (!job.icon_set_id) {
      results.push({ jobId: job.id, processed: false, reason: "missing_icon_set_id" });
      continue;
    }

    const storage = getStorageLocation(job);
    if (!storage) {
      results.push({ jobId: job.id, processed: false, reason: "missing_storage_location" });
      continue;
    }

    const claimed = await claimJob(job);
    if (!claimed) {
      results.push({ jobId: job.id, processed: false, reason: "already_claimed" });
      continue;
    }

    await supabaseAdmin
      .from("icon_sets")
      .update({
        status: "processing",
        updated_at: nowIso(),
      })
      .eq("id", job.icon_set_id)
      .eq("user_id", job.user_id);

    try {
      await processZipIngestJobFromStorage({
        userDbId: job.user_id,
        iconSetId: job.icon_set_id,
        jobId: job.id,
        bucket: storage.bucket,
        path: storage.path,
        skipInitialStatusUpdate: true,
      });
      results.push({ jobId: job.id, processed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process job.";
      results.push({ jobId: job.id, processed: false, error: message });
    }
  }

  return NextResponse.json({
    accepted: true,
    attempted: pendingJobs.length,
    processed: results.filter((item) => item.processed).length,
    failed: results.filter((item) => !item.processed).length,
    results,
  });
}
