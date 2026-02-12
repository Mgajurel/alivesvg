"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import type { PlanTier, StudioMeterEventType } from "@/types/database";

type UsageSnapshot = Record<StudioMeterEventType, number>;

interface UserPlanState {
  plan: PlanTier;
  studioUsage: number;
  studioLimit: number | null;
  usage30d: UsageSnapshot;
  isLoaded: boolean;
  isSignedIn: boolean;
  refresh: () => void;
}

const EMPTY_USAGE: UsageSnapshot = {
  ai_generation: 0,
  deterministic_generation: 0,
  zip_ingest_job: 0,
  export_bundle: 0,
};

export function useUserPlan(): UserPlanState {
  const { isSignedIn, isLoaded } = useUser();
  const [plan, setPlan] = useState<PlanTier>("free");
  const [studioUsage, setStudioUsage] = useState(0);
  const [studioLimit, setStudioLimit] = useState<number | null>(3);
  const [usage30d, setUsage30d] = useState<UsageSnapshot>(EMPTY_USAGE);
  const [fetched, setFetched] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch("/api/user/plan");
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setStudioUsage(data.studioUsage);
        setStudioLimit(data.studioLimit);
        if (data.usage30d && typeof data.usage30d === "object") {
          setUsage30d({
            ai_generation: Number(data.usage30d.ai_generation) || 0,
            deterministic_generation: Number(data.usage30d.deterministic_generation) || 0,
            zip_ingest_job: Number(data.usage30d.zip_ingest_job) || 0,
            export_bundle: Number(data.usage30d.export_bundle) || 0,
          });
        } else {
          setUsage30d(EMPTY_USAGE);
        }
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
    usage30d,
    isLoaded: isLoaded && fetched,
    isSignedIn: isSignedIn ?? false,
    refresh: fetchPlan,
  };
}
