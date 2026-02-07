"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import type { PlanTier } from "@/types/database";

interface UserPlanState {
  plan: PlanTier;
  studioUsage: number;
  studioLimit: number | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  refresh: () => void;
}

export function useUserPlan(): UserPlanState {
  const { isSignedIn, isLoaded } = useUser();
  const [plan, setPlan] = useState<PlanTier>("free");
  const [studioUsage, setStudioUsage] = useState(0);
  const [studioLimit, setStudioLimit] = useState<number | null>(3);
  const [fetched, setFetched] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/user/plan");
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setStudioUsage(data.studioUsage);
        setStudioLimit(data.studioLimit);
      }
    } finally {
      setFetched(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      fetchPlan();
    }
  }, [isLoaded, isSignedIn, fetchPlan]);

  return {
    plan,
    studioUsage,
    studioLimit,
    isLoaded: isLoaded && fetched,
    isSignedIn: isSignedIn ?? false,
    refresh: fetchPlan,
  };
}
