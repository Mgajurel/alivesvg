import type {
  AnimationLoopMode,
  AnimationTriggerMode,
  StandardAnimationPreset,
} from "@/constants/animations";
import {
  createDeterministicMotionCandidates,
  type MotionCandidate,
} from "@/lib/studioMotionPlanner";

type AnalyzeInputs = {
  annotatedSvg: string;
  sourceName: string;
  fallbackPartIds: string[];
};

type AgenticRawCandidate = {
  title?: unknown;
  preset?: unknown;
  triggerMode?: unknown;
  loopMode?: unknown;
  selectedPartIds?: unknown;
  rationale?: unknown;
  confidence?: unknown;
  score?: unknown;
};

type AgenticRawResponse = {
  intent?: unknown;
  intentConfidence?: unknown;
  intentReason?: unknown;
  candidates?: unknown;
};

type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number | null;
};

export type MotionAnalysisResult = {
  engine: "agentic" | "deterministic";
  model: string | null;
  promptVersion: string;
  plannerVersion: number;
  latencyMs: number;
  tokenUsage: TokenUsage | null;
  classification: {
    intent: string;
    confidence: number;
    rationale: string;
  } | null;
  fallbackReason: string | null;
  candidates: MotionCandidate[];
};

const PROMPT_VERSION = "agentic-v1";
const PLANNER_VERSION = 2;
const DEFAULT_MODEL = "gpt-4.1-mini";
const PRESET_VALUES: StandardAnimationPreset[] = ["fade", "scale", "slide", "spin", "bounce", "pulse"];
const TRIGGER_VALUES: AnimationTriggerMode[] = ["always", "hover"];
const LOOP_VALUES: AnimationLoopMode[] = ["once", "twice", "continuous"];
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractPartIds(annotatedSvg: string): string[] {
  const ids: string[] = [];
  const regex = /data-alivesvg-id\s*=\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(annotatedSvg)) !== null) {
    const id = match[1]?.trim();
    if (!id || ids.includes(id)) continue;
    ids.push(id);
  }
  return ids;
}

function normalizeEnum<T extends string>(raw: unknown, allowed: readonly T[]): T | null {
  if (typeof raw !== "string") return null;
  return allowed.includes(raw as T) ? (raw as T) : null;
}

function normalizeString(raw: unknown, fallback: string, max = 180): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return fallback;
  return trimmed.slice(0, max);
}

function normalizeConfidence(raw: unknown, fallback = 0.65): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return clamp(raw, 0.01, 0.99);
}

function normalizeScore(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return clamp(fallback, 0.01, 0.99);
  return clamp(raw, 0.01, 0.99);
}

function normalizeSelectedPartIds(
  raw: unknown,
  availableIds: string[],
  fallbackPartIds: string[],
): string[] {
  if (!Array.isArray(raw)) {
    return fallbackPartIds.length > 0 ? fallbackPartIds : availableIds.slice(0, 2);
  }

  const picked = raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && availableIds.includes(item));

  if (picked.length > 0) {
    return Array.from(new Set(picked)).slice(0, 20);
  }

  return fallbackPartIds.length > 0 ? fallbackPartIds : availableIds.slice(0, 2);
}

function estimateUsdCost(params: {
  promptTokens: number;
  completionTokens: number;
}): number | null {
  const promptRate = Number.parseFloat(process.env.OPENAI_PROMPT_COST_PER_1M ?? "");
  const completionRate = Number.parseFloat(process.env.OPENAI_COMPLETION_COST_PER_1M ?? "");
  if (!Number.isFinite(promptRate) || !Number.isFinite(completionRate)) {
    return null;
  }
  const cost = (params.promptTokens / 1_000_000) * promptRate
    + (params.completionTokens / 1_000_000) * completionRate;
  return Number.isFinite(cost) ? Number(cost.toFixed(8)) : null;
}

function stripCodeFence(jsonText: string): string {
  const trimmed = jsonText.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  const noPrefix = trimmed.replace(/^```[a-zA-Z]*\n?/, "");
  return noPrefix.replace(/```$/, "").trim();
}

function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

function isPlaceholderApiKey(raw: string): boolean {
  const value = raw.trim().toLowerCase();
  if (!value) return true;
  if (value === "your-openai-api-key-here") return true;
  if (value.includes("replace") && value.includes("api")) return true;
  if (value.includes("placeholder")) return true;
  return false;
}

function isValidOpenAiApiKey(raw: string): boolean {
  const value = raw.trim();
  if (!value || isPlaceholderApiKey(value)) return false;
  return value.startsWith("sk-");
}

function buildSystemPrompt(): string {
  return [
    "You are an SVG motion planner for icon animation.",
    "Return strict JSON only; never add markdown.",
    "Keep suggestions subtle, production-safe, and UI-friendly.",
    "Prefer semantically coherent animations based on icon shape and name.",
  ].join(" ");
}

function buildUserPrompt(input: {
  sourceName: string;
  availablePartIds: string[];
  fallbackPartIds: string[];
  deterministicCandidates: MotionCandidate[];
  annotatedSvg: string;
}): string {
  return JSON.stringify({
    task: "Generate exactly 3 ranked SVG animation candidates.",
    constraints: {
      presets: PRESET_VALUES,
      triggerModes: TRIGGER_VALUES,
      loopModes: LOOP_VALUES,
      maxSelectedIdsPerCandidate: 20,
      selectedPartIdsMustExistIn: "availablePartIds",
      ranking: "Best candidate first by semantic fit + clarity + subtlety + usability.",
    },
    sourceName: input.sourceName,
    availablePartIds: input.availablePartIds,
    fallbackPartIds: input.fallbackPartIds,
    deterministicBaseline: input.deterministicCandidates,
    annotatedSvg: input.annotatedSvg,
  });
}

function getJsonSchema() {
  return {
    name: "studio_motion_analysis",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        intent: { type: "string" },
        intentConfidence: { type: "number", minimum: 0, maximum: 1 },
        intentReason: { type: "string" },
        candidates: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              preset: { type: "string", enum: PRESET_VALUES },
              triggerMode: { type: "string", enum: TRIGGER_VALUES },
              loopMode: { type: "string", enum: LOOP_VALUES },
              selectedPartIds: {
                type: "array",
                items: { type: "string" },
                minItems: 1,
              },
              rationale: { type: "string" },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              score: { type: "number", minimum: 0, maximum: 1 },
            },
            required: [
              "title",
              "preset",
              "triggerMode",
              "loopMode",
              "selectedPartIds",
              "rationale",
              "confidence",
              "score",
            ],
          },
        },
      },
      required: ["intent", "intentConfidence", "intentReason", "candidates"],
    },
  };
}

function parseCandidate(
  raw: AgenticRawCandidate,
  index: number,
  availablePartIds: string[],
  fallbackPartIds: string[],
): MotionCandidate | null {
  const preset = normalizeEnum(raw.preset, PRESET_VALUES);
  const triggerMode = normalizeEnum(raw.triggerMode, TRIGGER_VALUES);
  const loopMode = normalizeEnum(raw.loopMode, LOOP_VALUES);
  if (!preset || !triggerMode || !loopMode) {
    return null;
  }

  const confidence = normalizeConfidence(raw.confidence, 0.64);
  const score = normalizeScore(raw.score, confidence);
  return {
    id: `candidate-${index + 1}`,
    title: normalizeString(raw.title, `Candidate ${index + 1}`, 48),
    intent: "generic",
    preset,
    triggerMode,
    loopMode,
    selectedPartIds: normalizeSelectedPartIds(raw.selectedPartIds, availablePartIds, fallbackPartIds),
    confidence,
    rationale: normalizeString(raw.rationale, "AI-generated candidate."),
    score,
  };
}

function mergeWithFallbackCandidates(params: {
  fromModel: MotionCandidate[];
  fallback: MotionCandidate[];
}): MotionCandidate[] {
  const combined = [...params.fromModel];
  const seen = new Set(
    params.fromModel.map((item) => `${item.preset}:${item.triggerMode}:${item.loopMode}:${item.selectedPartIds.join(",")}`),
  );

  for (const fallbackCandidate of params.fallback) {
    if (combined.length >= 3) break;
    const key = `${fallbackCandidate.preset}:${fallbackCandidate.triggerMode}:${fallbackCandidate.loopMode}:${fallbackCandidate.selectedPartIds.join(",")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push({
      ...fallbackCandidate,
      id: `candidate-${combined.length + 1}`,
      title: combined.length === 1 ? "Fallback blend" : "Fallback style",
    });
  }

  return combined
    .slice(0, 3)
    .sort((a, b) => b.score - a.score)
    .map((candidate, index) => ({
      ...candidate,
      id: `candidate-${index + 1}`,
    }));
}

async function requestAgenticCandidates(params: {
  apiKey: string;
  model: string;
  sourceName: string;
  availablePartIds: string[];
  fallbackPartIds: string[];
  deterministicCandidates: MotionCandidate[];
  annotatedSvg: string;
}): Promise<{
  candidates: MotionCandidate[];
  classification: MotionAnalysisResult["classification"];
  tokenUsage: TokenUsage | null;
}> {
  const payload = {
    model: params.model,
    temperature: 0,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: buildUserPrompt({
          sourceName: params.sourceName,
          availablePartIds: params.availablePartIds,
          fallbackPartIds: params.fallbackPartIds,
          deterministicCandidates: params.deterministicCandidates,
          annotatedSvg: params.annotatedSvg,
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: getJsonSchema(),
    },
  };

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("OpenAI authentication failed (invalid OPENAI_API_KEY).");
    }
    if (response.status === 429) {
      throw new Error("OpenAI rate limit reached.");
    }
    throw new Error(`OpenAI request failed (${response.status}).`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenAI response did not include JSON content.");
  }

  const parsed = JSON.parse(stripCodeFence(content)) as AgenticRawResponse;
  const rawCandidates = Array.isArray(parsed.candidates)
    ? (parsed.candidates as AgenticRawCandidate[])
    : [];

  const parsedCandidates = rawCandidates
    .map((item, index) => parseCandidate(item, index, params.availablePartIds, params.fallbackPartIds))
    .filter((item): item is MotionCandidate => item !== null);

  if (parsedCandidates.length === 0) {
    throw new Error("OpenAI response returned no valid candidates.");
  }

  const mergedCandidates = mergeWithFallbackCandidates({
    fromModel: parsedCandidates,
    fallback: params.deterministicCandidates,
  });

  const promptTokens = Number.isFinite(data.usage?.prompt_tokens) ? (data.usage?.prompt_tokens as number) : 0;
  const completionTokens = Number.isFinite(data.usage?.completion_tokens) ? (data.usage?.completion_tokens as number) : 0;
  const totalTokens = Number.isFinite(data.usage?.total_tokens)
    ? (data.usage?.total_tokens as number)
    : promptTokens + completionTokens;

  return {
    candidates: mergedCandidates,
    classification: {
      intent: normalizeString(parsed.intent, "generic", 64),
      confidence: normalizeConfidence(parsed.intentConfidence, 0.6),
      rationale: normalizeString(parsed.intentReason, "Model classified intent from icon name + SVG structure.", 220),
    },
    tokenUsage: {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUsd: estimateUsdCost({ promptTokens, completionTokens }),
    },
  };
}

export async function analyzeStudioMotionCandidates(input: AnalyzeInputs): Promise<MotionAnalysisResult> {
  const startedAt = Date.now();
  const deterministicCandidates = createDeterministicMotionCandidates(input);
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const model = getOpenAiModel();
  const availablePartIds = extractPartIds(input.annotatedSvg);

  if (!apiKey) {
    return {
      engine: "deterministic",
      model: null,
      promptVersion: PROMPT_VERSION,
      plannerVersion: PLANNER_VERSION,
      latencyMs: Date.now() - startedAt,
      tokenUsage: null,
      classification: null,
      fallbackReason: "OPENAI_API_KEY missing; deterministic baseline used.",
      candidates: deterministicCandidates,
    };
  }

  if (isPlaceholderApiKey(apiKey)) {
    return {
      engine: "deterministic",
      model: null,
      promptVersion: PROMPT_VERSION,
      plannerVersion: PLANNER_VERSION,
      latencyMs: Date.now() - startedAt,
      tokenUsage: null,
      classification: null,
      fallbackReason: "OPENAI_API_KEY is a placeholder; deterministic baseline used.",
      candidates: deterministicCandidates,
    };
  }

  if (!isValidOpenAiApiKey(apiKey)) {
    return {
      engine: "deterministic",
      model: null,
      promptVersion: PROMPT_VERSION,
      plannerVersion: PLANNER_VERSION,
      latencyMs: Date.now() - startedAt,
      tokenUsage: null,
      classification: null,
      fallbackReason: "OPENAI_API_KEY format looks invalid; deterministic baseline used.",
      candidates: deterministicCandidates,
    };
  }

  try {
    const agentic = await requestAgenticCandidates({
      apiKey,
      model,
      sourceName: input.sourceName,
      availablePartIds,
      fallbackPartIds: input.fallbackPartIds,
      deterministicCandidates,
      annotatedSvg: input.annotatedSvg,
    });

    return {
      engine: "agentic",
      model,
      promptVersion: PROMPT_VERSION,
      plannerVersion: PLANNER_VERSION,
      latencyMs: Date.now() - startedAt,
      tokenUsage: agentic.tokenUsage,
      classification: agentic.classification,
      fallbackReason: null,
      candidates: agentic.candidates,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agentic analysis failed.";
    return {
      engine: "deterministic",
      model,
      promptVersion: PROMPT_VERSION,
      plannerVersion: PLANNER_VERSION,
      latencyMs: Date.now() - startedAt,
      tokenUsage: null,
      classification: null,
      fallbackReason: `${message} Deterministic baseline used.`,
      candidates: deterministicCandidates,
    };
  }
}
