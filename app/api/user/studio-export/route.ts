import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserPlan, getStudioUsageCount, recordStudioExport } from "@/lib/user";
import { FREE_STUDIO_EXPORT_LIMIT } from "@/types/database";

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getUserPlan(userId);

  // Paid users: unlimited exports
  if (plan !== "free") {
    await recordStudioExport(userId);
    return NextResponse.json({ allowed: true, remaining: null });
  }

  // Free users: check limit
  const usage = await getStudioUsageCount(userId);
  if (usage >= FREE_STUDIO_EXPORT_LIMIT) {
    return NextResponse.json(
      {
        allowed: false,
        remaining: 0,
        error: "Free export limit reached",
      },
      { status: 403 },
    );
  }

  await recordStudioExport(userId);
  return NextResponse.json({
    allowed: true,
    remaining: FREE_STUDIO_EXPORT_LIMIT - usage - 1,
  });
}
