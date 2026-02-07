import { supabaseAdmin } from "@/lib/supabase/server";
import type { PlanTier, UserRow } from "@/types/database";

export async function getOrCreateUser(
  clerkId: string,
  email?: string | null,
): Promise<UserRow> {
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .single();

  if (existing) return existing as UserRow;

  const { data: created, error } = await supabaseAdmin
    .from("users")
    .insert({ clerk_id: clerkId, email: email ?? null })
    .select("*")
    .single();

  if (error) throw error;
  return created as UserRow;
}

export async function getUserPlan(clerkId: string): Promise<PlanTier> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("plan")
    .eq("clerk_id", clerkId)
    .single();

  return (data?.plan as PlanTier) ?? "free";
}

export async function getStudioUsageCount(clerkId: string): Promise<number> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .single();

  if (!user) return 0;

  const { count } = await supabaseAdmin
    .from("studio_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return count ?? 0;
}

export async function recordStudioExport(clerkId: string): Promise<void> {
  const user = await getOrCreateUser(clerkId);

  await supabaseAdmin.from("studio_usage").insert({
    user_id: user.id,
    action: "export",
  });
}
