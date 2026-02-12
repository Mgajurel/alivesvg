import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const MAX_OFFSET = 5000;
const JOB_STATUSES = ["pending", "processing", "completed", "failed", "canceled"] as const;
const JOB_TYPES = ["zip_ingest", "animation_generate", "export_bundle"] as const;

type JobStatus = (typeof JOB_STATUSES)[number];
type JobType = (typeof JOB_TYPES)[number];

function parseLimit(rawLimit: string | null): number {
  if (!rawLimit) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function parseOffset(rawOffset: string | null): number {
  if (!rawOffset) return DEFAULT_OFFSET;
  const parsed = Number.parseInt(rawOffset, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_OFFSET;
  return Math.min(parsed, MAX_OFFSET);
}

function parseStatus(rawStatus: string | null): JobStatus | null {
  if (!rawStatus) return null;
  return JOB_STATUSES.includes(rawStatus as JobStatus)
    ? (rawStatus as JobStatus)
    : null;
}

function parseJobType(rawJobType: string | null): JobType | null {
  if (!rawJobType) return null;
  return JOB_TYPES.includes(rawJobType as JobType)
    ? (rawJobType as JobType)
    : null;
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getOrCreateUser(userId);
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseOffset(url.searchParams.get("offset"));
  const statusFilter = parseStatus(url.searchParams.get("status"));
  const jobTypeFilter = parseJobType(url.searchParams.get("jobType"));

  let jobsQuery = supabaseAdmin
    .from("studio_jobs")
    .select("id,icon_set_id,job_type,status,error_message,metadata,created_at,updated_at,started_at,completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) {
    jobsQuery = jobsQuery.eq("status", statusFilter);
  }

  if (jobTypeFilter) {
    jobsQuery = jobsQuery.eq("job_type", jobTypeFilter);
  }

  const { data: jobs, error: jobsError } = await jobsQuery;

  if (jobsError) {
    return NextResponse.json({ error: "Failed to load jobs." }, { status: 500 });
  }

  const iconSetIds = Array.from(new Set((jobs ?? []).map((job) => job.icon_set_id).filter(Boolean)));

  let iconSetMap: Record<string, { id: string; name: string; status: string }> = {};
  if (iconSetIds.length > 0) {
    const { data: sets, error: setsError } = await supabaseAdmin
      .from("icon_sets")
      .select("id,name,status")
      .in("id", iconSetIds);

    if (setsError) {
      return NextResponse.json({ error: "Failed to load related icon sets." }, { status: 500 });
    }

    iconSetMap = (sets ?? []).reduce<Record<string, { id: string; name: string; status: string }>>(
      (accumulator, set) => {
        accumulator[set.id as string] = {
          id: set.id as string,
          name: set.name as string,
          status: set.status as string,
        };
        return accumulator;
      },
      {},
    );
  }

  const jobIds = (jobs ?? []).map((job) => job.id as string);
  let itemCountsByJob: Record<string, { total: number; failed: number; completed: number }> = {};
  if (jobIds.length > 0) {
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("studio_job_items")
      .select("job_id,status")
      .in("job_id", jobIds);

    if (itemsError) {
      return NextResponse.json({ error: "Failed to load job item stats." }, { status: 500 });
    }

    itemCountsByJob = (items ?? []).reduce<Record<string, { total: number; failed: number; completed: number }>>(
      (accumulator, item) => {
        const jobId = item.job_id as string;
        if (!accumulator[jobId]) {
          accumulator[jobId] = { total: 0, failed: 0, completed: 0 };
        }
        accumulator[jobId].total += 1;
        if (item.status === "failed") accumulator[jobId].failed += 1;
        if (item.status === "completed") accumulator[jobId].completed += 1;
        return accumulator;
      },
      {},
    );
  }

  // Small extra fetch to determine if there are additional rows beyond this page.
  let hasMore = false;
  {
    let hasMoreQuery = supabaseAdmin
      .from("studio_jobs")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset + limit, offset + limit);

    if (statusFilter) {
      hasMoreQuery = hasMoreQuery.eq("status", statusFilter);
    }

    if (jobTypeFilter) {
      hasMoreQuery = hasMoreQuery.eq("job_type", jobTypeFilter);
    }

    const { data: hasMoreRows } = await hasMoreQuery;
    hasMore = (hasMoreRows?.length ?? 0) > 0;
  }

  return NextResponse.json({
    jobs: (jobs ?? []).map((job) => ({
      ...job,
      iconSet: job.icon_set_id ? iconSetMap[job.icon_set_id] ?? null : null,
      itemStats: itemCountsByJob[job.id as string] ?? { total: 0, failed: 0, completed: 0 },
    })),
    pagination: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
      prevOffset: offset > 0 ? Math.max(0, offset - limit) : null,
    },
    filters: {
      status: statusFilter,
      jobType: jobTypeFilter,
    },
  });
}
