import { createHash } from "crypto";

export const MAX_SVG_UPLOAD_BYTES = 1024 * 1024; // 1MB
export const MAX_ZIP_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

const UNSAFE_SVG_PATTERNS = [
  /<\s*script\b/i,
  /\son[a-z]+\s*=/i,
  /javascript:/i,
  /<\s*foreignObject\b/i,
];

type ValidationResult = {
  valid: boolean;
  error?: string;
};

export function sha256FromBuffer(buffer: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}

export function sha256FromString(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function isZipFile(fileName: string, mimeType: string): boolean {
  const lowerName = fileName.toLowerCase();
  const normalizedMimeType = mimeType.toLowerCase();
  return (
    lowerName.endsWith(".zip")
    || normalizedMimeType === "application/zip"
    || normalizedMimeType === "application/x-zip-compressed"
  );
}

export function validateSvgMarkup(svgContent: string): ValidationResult {
  const trimmed = svgContent.trim();
  if (!trimmed) {
    return { valid: false, error: "SVG file is empty." };
  }

  if (!/<svg[\s>]/i.test(trimmed) || !/<\/svg>/i.test(trimmed)) {
    return { valid: false, error: "Invalid SVG markup." };
  }

  const hasUnsafeContent = UNSAFE_SVG_PATTERNS.some((pattern) => pattern.test(trimmed));
  if (hasUnsafeContent) {
    return { valid: false, error: "SVG contains disallowed content." };
  }

  return { valid: true };
}

export function getStringField(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getIdempotencyKey(
  formData: FormData,
  request: Request,
): ValidationResult & { key: string | null } {
  const fromForm = getStringField(formData.get("idempotencyKey"));
  const fromHeader = request.headers.get("idempotency-key")?.trim() ?? null;
  const key = fromForm ?? fromHeader;

  if (!key) {
    return { valid: true, key: null };
  }

  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return {
      valid: false,
      key: null,
      error: `Idempotency key must be <= ${MAX_IDEMPOTENCY_KEY_LENGTH} characters.`,
    };
  }

  return { valid: true, key };
}

export function normalizeSetName(raw: string, fallback = "UploadedSet"): string {
  const withoutExtension = raw.replace(/\.[^/.]+$/, "");
  const cleaned = withoutExtension.replace(/[\r\n\t]+/g, " ").trim();
  return cleaned.length > 0 ? cleaned.slice(0, 120) : fallback;
}

export function normalizeIconName(raw: string, fallback = "UploadedIcon"): string {
  const withoutExtension = raw.replace(/\.[^/.]+$/, "");
  const parts = withoutExtension
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const pascal = parts
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");

  if (!pascal) return fallback;
  return /^[a-zA-Z]/.test(pascal) ? pascal.slice(0, 80) : `Icon${pascal.slice(0, 76)}`;
}
