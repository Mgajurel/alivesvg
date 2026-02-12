import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOrCreateUser, getUserPlan, getStudioUsageCount } from "@/lib/user";
import { getStudioMeteringTotals } from "@/lib/studioMetering";
import { FREE_STUDIO_EXPORT_LIMIT } from "@/types/database";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({
      plan: "free",
      studioUsage: 0,
      studioLimit: FREE_STUDIO_EXPORT_LIMIT,
    });
  }

  const [plan, studioUsage] = await Promise.all([
    getUserPlan(userId),
    getStudioUsageCount(userId),
  ]);
  const user = await getOrCreateUser(userId);
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const meteringTotals30d = await getStudioMeteringTotals({
    userDbId: user.id,
    sinceIso: since.toISOString(),
  });

  return NextResponse.json({
    plan,
    studioUsage,
    studioLimit: plan === "free" ? FREE_STUDIO_EXPORT_LIMIT : null,
    usage30d: meteringTotals30d,
  });
}
