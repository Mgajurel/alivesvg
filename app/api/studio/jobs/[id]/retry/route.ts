import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";

function nowIso(): string {
  return new Date().toISOString();
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing job id." }, { status: 400 });
  }

  const user = await getOrCreateUser(userId);

  const { data: job, error: jobError } = await supabaseAdmin
    .from("studio_jobs")
    .select("id,icon_set_id,job_type,status,metadata")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.job_type !== "zip_ingest") {
    return NextResponse.json({ error: "Only zip_ingest jobs support retry." }, { status: 400 });
  }

  if (job.status === "processing" || job.status === "pending") {
    return NextResponse.json({
      accepted: true,
      retried: false,
      reason: "job_not_terminal",
      status: job.status,
    });
  }

  if (!job.icon_set_id) {
    return NextResponse.json({ error: "Job missing icon_set_id." }, { status: 400 });
  }

  const metadata = (job.metadata as Record<string, unknown> | null) ?? {};
  const retryCount = typeof metadata.retry_count === "number" ? metadata.retry_count : 0;

  const { error: deleteItemsError } = await supabaseAdmin
    .from("studio_job_items")
    .delete()
    .eq("job_id", job.id);

  if (deleteItemsError) {
    return NextResponse.json({ error: "Failed to clear old job items." }, { status: 500 });
  }

  const { error: resetJobError } = await supabaseAdmin
    .from("studio_jobs")
    .update({
      status: "pending",
      error_message: null,
      started_at: null,
      completed_at: null,
      updated_at: nowIso(),
      metadata: {
        ...metadata,
        retry_count: retryCount + 1,
        retried_at: nowIso(),
      },
    })
    .eq("id", job.id)
    .eq("user_id", user.id);

  if (resetJobError) {
    return NextResponse.json({ error: "Failed to reset job." }, { status: 500 });
  }

  const { error: resetSetError } = await supabaseAdmin
    .from("icon_sets")
    .update({
      status: "pending",
      updated_at: nowIso(),
    })
    .eq("id", job.icon_set_id)
    .eq("user_id", user.id);

  if (resetSetError) {
    return NextResponse.json({ error: "Failed to reset icon set state." }, { status: 500 });
  }

  return NextResponse.json({
    accepted: true,
    retried: true,
    jobId: job.id,
  });
}
