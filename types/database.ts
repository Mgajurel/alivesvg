export type PlanTier = "free" | "starter" | "lifetime";

export interface UserRow {
  id: string;
  clerk_id: string;
  email: string | null;
  plan: PlanTier;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  clerk_id: string;
  email?: string | null;
  plan?: PlanTier;
  stripe_customer_id?: string | null;
}

export interface PurchaseRow {
  id: string;
  user_id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  plan: PlanTier;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface PurchaseInsert {
  user_id: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id?: string | null;
  plan: PlanTier;
  amount_cents: number;
  currency?: string;
  status?: string;
}

export interface StudioUsageRow {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
}

export type IconSourceType = "single" | "zip" | "library";
export type IconSetStatus = "pending" | "processing" | "completed" | "failed";
export type IconStatus = "uploaded" | "processing" | "completed" | "failed";
export type IconVersionSource = "system" | "ai" | "manual";
export type StudioJobType = "zip_ingest" | "animation_generate" | "export_bundle";
export type StudioJobStatus = "pending" | "processing" | "completed" | "failed" | "canceled";
export type IconVersionOutcome = "accepted" | "rejected" | "edited";
export type StudioMeterEventType = "ai_generation" | "deterministic_generation" | "zip_ingest_job" | "export_bundle";

export interface IconSetRow {
  id: string;
  user_id: string;
  name: string;
  source_type: IconSourceType;
  source_file_name: string | null;
  source_hash: string;
  total_icons: number | null;
  status: IconSetStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IconRow {
  id: string;
  icon_set_id: string;
  name: string;
  source_svg: string | null;
  source_hash: string;
  status: IconStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IconVersionRow {
  id: string;
  icon_id: string;
  version_number: number;
  source: IconVersionSource;
  animation_payload: Record<string, unknown> | null;
  custom_css: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StudioJobRow {
  id: string;
  user_id: string;
  icon_set_id: string | null;
  job_type: StudioJobType;
  status: StudioJobStatus;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface StudioJobItemRow {
  id: string;
  job_id: string;
  icon_id: string | null;
  status: StudioJobStatus;
  payload: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface IconVersionEvaluationRow {
  id: string;
  icon_version_id: string;
  user_id: string;
  outcome: IconVersionOutcome;
  benchmark_key: string;
  score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioMeteringEventRow {
  id: string;
  user_id: string;
  event_type: StudioMeterEventType;
  quantity: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const FREE_STUDIO_EXPORT_LIMIT = 3;
export const FREE_ICON_IDS = ["1", "2", "3", "10"];
