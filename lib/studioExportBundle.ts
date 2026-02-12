import type {
  AnimationLoopMode,
  AnimationPreset,
  AnimationTriggerMode,
} from "@/constants/animations";

type ExportIcon = {
  id: string;
  name: string;
  sourceSvg: string;
  activeVersion: {
    id: string;
    versionNumber: number;
    animationPayload: Record<string, unknown> | null;
    customCss: string | null;
  } | null;
};

type BundleMode = "package" | "inline";

type ExportMotion = {
  preset: AnimationPreset;
  triggerMode: AnimationTriggerMode;
  loopMode: AnimationLoopMode;
  customCss: string | null;
};

const PRESET_VALUES: AnimationPreset[] = ["fade", "scale", "slide", "spin", "bounce", "pulse", "custom"];
const TRIGGER_VALUES: AnimationTriggerMode[] = ["always", "hover"];
const LOOP_VALUES: AnimationLoopMode[] = ["once", "twice", "continuous"];

function normalizeEnum<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof raw !== "string") return fallback;
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

function toComponentName(rawName: string, fallback = "Icon"): string {
  const withoutExtension = rawName.replace(/\.[^/.]+$/, "");
  const parts = withoutExtension
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const pascal = parts
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");

  if (!pascal) return fallback;
  return /^[a-zA-Z]/.test(pascal) ? pascal : `Icon${pascal}`;
}

function escapeTemplate(raw: string): string {
  return raw.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function normalizeMotion(icon: ExportIcon): ExportMotion {
  const payload = icon.activeVersion?.animationPayload ?? {};
  const preset = normalizeEnum(payload.preset, PRESET_VALUES, "scale");
  const triggerMode = normalizeEnum(payload.triggerMode, TRIGGER_VALUES, "always");
  const loopMode = normalizeEnum(payload.loopMode, LOOP_VALUES, "continuous");
  const customCss = typeof icon.activeVersion?.customCss === "string" && icon.activeVersion.customCss.trim().length > 0
    ? icon.activeVersion.customCss
    : null;

  return {
    preset,
    triggerMode,
    loopMode,
    customCss,
  };
}

function buildPackageComponentCode(params: {
  componentName: string;
  svgMarkup: string;
  motion: ExportMotion;
}): string {
  const escapedSvg = escapeTemplate(params.svgMarkup);
  const escapedCss = params.motion.customCss ? escapeTemplate(params.motion.customCss) : null;

  return `import { AliveSvg } from "alivesvg";

const svgMarkup = \`${escapedSvg}\`;
${escapedCss ? `\nconst customCss = \`${escapedCss}\`;\n` : ""}
export function ${params.componentName}() {
  return (
    <AliveSvg
      svg={svgMarkup}
      preset="${params.motion.preset}"
      trigger="${params.motion.triggerMode}"
      loop="${params.motion.loopMode}"
${escapedCss ? "      customCss={customCss}\n" : ""}    />
  );
}
`;
}

function buildInlineComponentCode(params: {
  componentName: string;
  svgMarkup: string;
  motion: ExportMotion;
}): string {
  const escapedSvg = escapeTemplate(params.svgMarkup);
  const escapedCss = params.motion.customCss ? escapeTemplate(params.motion.customCss) : "";

  return `import DOMPurify from "dompurify";

const svgMarkup = \`${escapedSvg}\`;
${escapedCss ? `\nconst customCss = \`${escapedCss}\`;\n` : ""}
function sanitizeSvg(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { svg: true, svgFilters: true },
  });
}

export function ${params.componentName}() {
  return (
    <div
      className="alivesvg-target"
      data-preset="${params.motion.preset}"
      data-trigger="${params.motion.triggerMode}"
      data-loop="${params.motion.loopMode}"
    >
      ${escapedCss ? "<style>{customCss}</style>" : ""}
      <span dangerouslySetInnerHTML={{ __html: sanitizeSvg(svgMarkup) }} />
    </div>
  );
}
`;
}

function buildComponentCode(params: {
  mode: BundleMode;
  componentName: string;
  svgMarkup: string;
  motion: ExportMotion;
}): string {
  if (params.mode === "inline") {
    return buildInlineComponentCode(params);
  }
  return buildPackageComponentCode(params);
}

export function buildExportBundleFiles(params: {
  mode: BundleMode;
  iconSetId: string;
  iconSetName: string;
  icons: ExportIcon[];
}): {
  files: Array<{ path: string; content: string }>;
  manifest: Record<string, unknown>;
} {
  const files: Array<{ path: string; content: string }> = [];
  const exportItems: Array<Record<string, unknown>> = [];

  const componentNamesUsed = new Set<string>();
  const indexExports: string[] = [];

  for (const icon of params.icons) {
    const baseName = toComponentName(icon.name, "Icon");
    let componentName = baseName;
    let suffix = 2;
    while (componentNamesUsed.has(componentName)) {
      componentName = `${baseName}${suffix}`;
      suffix += 1;
    }
    componentNamesUsed.add(componentName);

    const motion = normalizeMotion(icon);
    const componentCode = buildComponentCode({
      mode: params.mode,
      componentName,
      svgMarkup: icon.sourceSvg,
      motion,
    });
    const fileName = `${componentName}.tsx`;
    files.push({
      path: `src/icons/${fileName}`,
      content: componentCode,
    });
    indexExports.push(`export { ${componentName} } from "./icons/${componentName}";`);

    exportItems.push({
      iconId: icon.id,
      sourceName: icon.name,
      componentName,
      filePath: `src/icons/${fileName}`,
      versionId: icon.activeVersion?.id ?? null,
      versionNumber: icon.activeVersion?.versionNumber ?? null,
      preset: motion.preset,
      triggerMode: motion.triggerMode,
      loopMode: motion.loopMode,
      hasCustomCss: Boolean(motion.customCss),
    });
  }

  files.push({
    path: "src/index.ts",
    content: `${indexExports.join("\n")}\n`,
  });

  files.push({
    path: "README.md",
    content: [
      `# ${params.iconSetName} Export`,
      "",
      `Mode: ${params.mode}`,
      "",
      "Generated by AliveSVG Studio.",
      "",
      "## Usage",
      "1. Copy `src/` into your project or publish as an internal package.",
      "2. Import components from `src/index.ts`.",
      "",
    ].join("\n"),
  });

  return {
    files,
    manifest: {
      generatedAt: new Date().toISOString(),
      iconSetId: params.iconSetId,
      iconSetName: params.iconSetName,
      mode: params.mode,
      count: exportItems.length,
      items: exportItems,
    },
  };
}

