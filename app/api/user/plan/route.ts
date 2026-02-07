import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserPlan, getStudioUsageCount } from "@/lib/user";
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

  return NextResponse.json({
    plan,
    studioUsage,
    studioLimit: plan === "free" ? FREE_STUDIO_EXPORT_LIMIT : null,
  });
}
