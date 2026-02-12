import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/user";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_OFFSET = 0;
const MAX_OFFSET = 5000;
const ITEM_STATUSES = ["pending", "processing", "completed", "failed", "canceled"] as const;

type JobItemRow = {
  id: string;
  status: string;
  icon_id: string | null;
  error_message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

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

function parseItemStatus(rawStatus: string | null): (typeof ITEM_STATUSES)[number] | null {
  if (!rawStatus) return null;
  return ITEM_STATUSES.includes(rawStatus as (typeof ITEM_STATUSES)[number])
    ? (rawStatus as (typeof ITEM_STATUSES)[number])
    : null;
}

export async function GET(
  request: Request,
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

  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseOffset(url.searchParams.get("offset"));
  const itemStatusFilter = parseItemStatus(url.searchParams.get("status"));

  const user = await getOrCreateUser(userId);

  const { data: job, error: jobError } = await supabaseAdmin
    .from("studio_jobs")
    .select("id,icon_set_id,job_type,status,error_message,metadata,created_at,updated_at,started_at,completed_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (jobError) {
    return NextResponse.json({ error: "Failed to load job." }, { status: 500 });
  }

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const { data: iconSet, error: iconSetError } = await supabaseAdmin
    .from("icon_sets")
    .select("id,name,source_type,source_file_name,source_hash,total_icons,status,created_at,updated_at")
    .eq("id", job.icon_set_id)
    .maybeSingle();

  if (iconSetError) {
    return NextResponse.json({ error: "Failed to load icon set." }, { status: 500 });
  }

  let itemsQuery = supabaseAdmin
    .from("studio_job_items")
    .select("id,status,icon_id,error_message,payload,created_at,updated_at")
    .eq("job_id", job.id)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (itemStatusFilter) {
    itemsQuery = itemsQuery.eq("status", itemStatusFilter);
  }

  const { data: items, error: itemsError } = await itemsQuery;

  if (itemsError) {
    return NextResponse.json({ error: "Failed to load job items." }, { status: 500 });
  }

  let aggregateItemsQuery = supabaseAdmin
    .from("studio_job_items")
    .select("status")
    .eq("job_id", job.id);

  if (itemStatusFilter) {
    aggregateItemsQuery = aggregateItemsQuery.eq("status", itemStatusFilter);
  }

  const { data: allItems, error: allItemsError } = await aggregateItemsQuery;
  if (allItemsError) {
    return NextResponse.json({ error: "Failed to aggregate job items." }, { status: 500 });
  }

  const statusCounts = (allItems ?? []).reduce<Record<string, number>>((acc, item) => {
    const row = item as JobItemRow;
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalFilteredItems = allItems?.length ?? 0;
  const hasMore = offset + limit < totalFilteredItems;

  return NextResponse.json({
    job,
    iconSet,
    totals: {
      items: totalFilteredItems,
      byStatus: statusCounts,
    },
    pagination: {
      limit,
      offset,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
      prevOffset: offset > 0 ? Math.max(0, offset - limit) : null,
      status: itemStatusFilter,
    },
    items: items ?? [],
  });
}
