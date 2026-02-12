import type { StudioMeterEventType } from "@/types/database";
import { supabaseAdmin } from "@/lib/supabase/server";

type RecordMeteringInput = {
  userDbId: string;
  eventType: StudioMeterEventType;
  quantity?: number;
  metadata?: Record<string, unknown>;
};

export async function recordStudioMeteringEvent(params: RecordMeteringInput): Promise<void> {
  const quantity = Number.isFinite(params.quantity) && (params.quantity as number) > 0
    ? Math.floor(params.quantity as number)
    : 1;

  await supabaseAdmin
    .from("studio_metering_events")
    .insert({
      user_id: params.userDbId,
      event_type: params.eventType,
      quantity,
      metadata: params.metadata ?? {},
    });
}

export async function getStudioMeteringTotals(params: {
  userDbId: string;
  sinceIso?: string;
}): Promise<Record<StudioMeterEventType, number>> {
  const accumulator: Record<StudioMeterEventType, number> = {
    ai_generation: 0,
    deterministic_generation: 0,
    zip_ingest_job: 0,
    export_bundle: 0,
  };

  let query = supabaseAdmin
    .from("studio_metering_events")
    .select("event_type,quantity")
    .eq("user_id", params.userDbId);

  if (params.sinceIso) {
    query = query.gte("created_at", params.sinceIso);
  }

  const { data } = await query;
  for (const row of data ?? []) {
    const type = row.event_type as StudioMeterEventType;
    const quantity = Number.isFinite(row.quantity) ? (row.quantity as number) : 0;
    accumulator[type] = (accumulator[type] ?? 0) + quantity;
  }

  return accumulator;
}

