import {
  AnimationLoopMode,
  AnimationPreset,
  AnimationTriggerMode,
  StandardAnimationPreset,
} from "@/constants/animations";

const KEYWORD_GROUPS = {
  spin: ["spinner", "loading", "loader", "refresh", "sync", "gear", "settings", "cog"],
  slide: ["arrow", "chevron", "next", "forward", "back", "reply", "send"],
  bounce: ["bell", "notification", "alert", "alarm", "ring"],
  pulse: ["heart", "favorite", "like", "success", "check", "status", "live"],
  scale: ["user", "profile", "account", "avatar", "person"],
  fade: ["menu", "more", "dots", "ellipsis", "grid"],
} as const;

type PlanIntent = keyof typeof KEYWORD_GROUPS | "generic";

type PlannerInputs = {
  annotatedSvg: string;
  sourceName: string;
  fallbackPartIds: string[];
};

export type MotionPlan = {
  intent: PlanIntent;
  preset: StandardAnimationPreset;
  triggerMode: AnimationTriggerMode;
  loopMode: AnimationLoopMode;
  selectedPartIds: string[];
  confidence: number;
  rationale: string;
};

export type MotionCandidate = MotionPlan & {
  id: string;
  title: string;
  score: number;
};

type ParsedPart = {
  id: string;
  tag: string;
  pathLengthHint: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getNameTokens(sourceName: string): string[] {
  return sourceName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function canParseSvg(): boolean {
  return typeof window !== "undefined" && typeof DOMParser !== "undefined";
}

function getAttributeValue(rawAttributes: string, name: string): string | null {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  const match = rawAttributes.match(pattern);
  return match?.[1] ?? null;
}

function parsePartsWithRegex(annotatedSvg: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const pattern = /<(path|circle|rect|line|polyline|polygon|ellipse)\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(annotatedSvg)) !== null) {
    const tag = (match[1] ?? "").toLowerCase();
    const attrs = match[2] ?? "";
    const id = getAttributeValue(attrs, "data-alivesvg-id");
    if (!id) continue;
    const dAttr = getAttributeValue(attrs, "d") ?? "";
    parts.push({
      id,
      tag,
      pathLengthHint: dAttr.length,
    });
  }
  return parts;
}

function parseParts(annotatedSvg: string): ParsedPart[] {
  if (!canParseSvg()) return parsePartsWithRegex(annotatedSvg);
  const parser = new DOMParser();
  const doc = parser.parseFromString(annotatedSvg, "image/svg+xml");
  if (doc.querySelector("parsererror")) return parsePartsWithRegex(annotatedSvg);

  const elements = Array.from(doc.querySelectorAll("[data-alivesvg-id]"));
  return elements
    .map((element) => {
      const id = element.getAttribute("data-alivesvg-id");
      if (!id) return null;

      const tag = element.tagName.toLowerCase();
      const pathLengthHint = (element.getAttribute("d") ?? "").length;
      return { id, tag, pathLengthHint };
    })
    .filter((item): item is ParsedPart => item !== null);
}

function detectIntent(tokens: string[], parts: ParsedPart[]): { intent: PlanIntent; confidence: number; rationale: string } {
  const text = tokens.join(" ");

  for (const [intent, keywords] of Object.entries(KEYWORD_GROUPS) as Array<[PlanIntent, readonly string[]]>) {
    const match = keywords.find((keyword) => text.includes(keyword));
    if (match) {
      return {
        intent,
        confidence: 0.86,
        rationale: `Matched keyword "${match}" in icon name.`,
      };
    }
  }

  const circleCount = parts.filter((part) => part.tag === "circle").length;
  const pathCount = parts.filter((part) => part.tag === "path").length;
  if (circleCount >= 1 && pathCount >= 1) {
    return {
      intent: "spin",
      confidence: 0.72,
      rationale: "Detected mixed circle + path structure, a common loading/spinner pattern.",
    };
  }

  if (pathCount >= 3) {
    return {
      intent: "slide",
      confidence: 0.64,
      rationale: "Detected multiple path segments, likely directional or composite icon geometry.",
    };
  }

  return {
    intent: "generic",
    confidence: 0.56,
    rationale: "No strong semantic hint found, using balanced default behavior.",
  };
}

function planPreset(intent: PlanIntent): {
  preset: StandardAnimationPreset;
  triggerMode: AnimationTriggerMode;
  loopMode: AnimationLoopMode;
} {
  if (intent === "spin") {
    return { preset: "spin", triggerMode: "always", loopMode: "continuous" };
  }
  if (intent === "slide") {
    return { preset: "slide", triggerMode: "hover", loopMode: "twice" };
  }
  if (intent === "bounce") {
    return { preset: "bounce", triggerMode: "hover", loopMode: "twice" };
  }
  if (intent === "pulse") {
    return { preset: "pulse", triggerMode: "always", loopMode: "continuous" };
  }
  if (intent === "scale") {
    return { preset: "scale", triggerMode: "hover", loopMode: "once" };
  }
  if (intent === "fade") {
    return { preset: "fade", triggerMode: "hover", loopMode: "twice" };
  }
  return { preset: "scale", triggerMode: "always", loopMode: "continuous" };
}

function getAlternativePreset(basePreset: StandardAnimationPreset): StandardAnimationPreset {
  if (basePreset === "spin") return "pulse";
  if (basePreset === "slide") return "bounce";
  if (basePreset === "bounce") return "slide";
  if (basePreset === "pulse") return "scale";
  if (basePreset === "fade") return "scale";
  return "fade";
}

function selectPartsForIntent(intent: PlanIntent, parts: ParsedPart[], fallbackPartIds: string[]): string[] {
  if (parts.length === 0) return fallbackPartIds;

  const byPathLengthDesc = [...parts].sort((a, b) => b.pathLengthHint - a.pathLengthHint);

  if (intent === "spin") {
    return parts.slice(0, 12).map((part) => part.id);
  }

  if (intent === "slide") {
    const preferred = parts.filter((part) => ["path", "polygon", "polyline"].includes(part.tag));
    const target = preferred.length > 0 ? preferred : byPathLengthDesc;
    return target.slice(0, 2).map((part) => part.id);
  }

  if (intent === "bounce") {
    const preferred = parts.filter((part) => part.tag === "path");
    const target = preferred.length > 0 ? preferred : byPathLengthDesc;
    return target.slice(0, 2).map((part) => part.id);
  }

  if (intent === "pulse") {
    return byPathLengthDesc.slice(0, 3).map((part) => part.id);
  }

  if (intent === "fade") {
    return parts.slice(0, 3).map((part) => part.id);
  }

  if (intent === "scale") {
    return byPathLengthDesc.slice(0, 2).map((part) => part.id);
  }

  return fallbackPartIds.length > 0 ? fallbackPartIds : parts.slice(0, 2).map((part) => part.id);
}

function scorePlan(plan: MotionPlan, parts: ParsedPart[], nameTokens: string[]): number {
  const selectedCount = plan.selectedPartIds.length;
  const totalParts = parts.length;
  const coverage = totalParts > 0 ? selectedCount / totalParts : 0.1;
  const coverageScore = coverage >= 0.15 && coverage <= 0.75 ? 0.15 : 0.05;
  const triggerScore = plan.triggerMode === "hover" ? 0.06 : 0.08;
  const loopScore = plan.loopMode === "continuous" ? 0.07 : 0.05;
  const tokenScore = nameTokens.length > 0 ? 0.06 : 0.03;
  const raw = plan.confidence + coverageScore + triggerScore + loopScore + tokenScore;
  return clamp(raw, 0, 0.99);
}

export function createDeterministicMotionPlan({
  annotatedSvg,
  sourceName,
  fallbackPartIds,
}: PlannerInputs): MotionPlan {
  const tokens = getNameTokens(sourceName);
  const parts = parseParts(annotatedSvg);
  const detected = detectIntent(tokens, parts);
  const presetPlan = planPreset(detected.intent);
  const selectedPartIds = selectPartsForIntent(detected.intent, parts, fallbackPartIds);

  const structuralBoost = parts.length > 0 ? 0.06 : 0;
  const selectedBoost = selectedPartIds.length > 0 ? 0.04 : 0;
  const confidence = clamp(detected.confidence + structuralBoost + selectedBoost, 0, 0.97);

  return {
    intent: detected.intent,
    preset: presetPlan.preset,
    triggerMode: presetPlan.triggerMode,
    loopMode: presetPlan.loopMode,
    selectedPartIds,
    confidence,
    rationale: detected.rationale,
  };
}

export function createDeterministicMotionCandidates({
  annotatedSvg,
  sourceName,
  fallbackPartIds,
}: PlannerInputs): MotionCandidate[] {
  const basePlan = createDeterministicMotionPlan({
    annotatedSvg,
    sourceName,
    fallbackPartIds,
  });
  const parts = parseParts(annotatedSvg);
  const tokens = getNameTokens(sourceName);

  const variantA: MotionPlan = {
    ...basePlan,
    triggerMode: basePlan.triggerMode === "always" ? "hover" : "always",
    loopMode: basePlan.loopMode === "continuous" ? "twice" : "continuous",
    confidence: clamp(basePlan.confidence - 0.04, 0.4, 0.96),
    rationale: `${basePlan.rationale} Variant tuned for interaction-first playback.`,
  };

  const variantB: MotionPlan = {
    ...basePlan,
    preset: getAlternativePreset(basePlan.preset),
    loopMode: "twice",
    confidence: clamp(basePlan.confidence - 0.06, 0.38, 0.94),
    rationale: `${basePlan.rationale} Alternative preset explores a different motion personality.`,
  };

  const plans = [basePlan, variantA, variantB];
  const candidates = plans.map((plan, index) => {
    const score = scorePlan(plan, parts, tokens);
    return {
      ...plan,
      id: `candidate-${index + 1}`,
      title: index === 0 ? "Primary match" : index === 1 ? "Interaction variant" : "Alternative style",
      score,
    };
  });

  return candidates.sort((a, b) => b.score - a.score);
}

export function describePlan(plan: MotionPlan): string {
  const confidenceLabel = `${Math.round(plan.confidence * 100)}% confidence`;
  return `${confidenceLabel}. ${plan.rationale}`;
}

export function planToAnimationPreset(plan: MotionPlan): AnimationPreset {
  return plan.preset;
}
