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

export const FREE_STUDIO_EXPORT_LIMIT = 3;
export const FREE_ICON_IDS = ["1", "2", "3", "10"];
