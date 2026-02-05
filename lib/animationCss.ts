import {
    CustomAnimationSettings,
    StandardAnimationPreset,
} from "@/constants/animations";

type PresetCss = {
    name: string;
    duration: string;
    timingFunction: string;
    keyframes: string;
};

const PRESET_CSS: Record<StandardAnimationPreset, PresetCss> = {
    fade: {
        name: "alivesvg-fade",
        duration: "1.25s",
        timingFunction: "ease-in-out",
        keyframes: `@keyframes alivesvg-fade {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}`,
    },
    scale: {
        name: "alivesvg-scale",
        duration: "1.2s",
        timingFunction: "ease-in-out",
        keyframes: `@keyframes alivesvg-scale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}`,
    },
    slide: {
        name: "alivesvg-slide",
        duration: "1.15s",
        timingFunction: "ease-in-out",
        keyframes: `@keyframes alivesvg-slide {
  0%, 100% { transform: translateX(0); opacity: 1; }
  50% { transform: translateX(8px); opacity: 0.9; }
}`,
    },
    spin: {
        name: "alivesvg-spin",
        duration: "1.8s",
        timingFunction: "linear",
        keyframes: `@keyframes alivesvg-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`,
    },
    bounce: {
        name: "alivesvg-bounce",
        duration: "0.95s",
        timingFunction: "ease-in-out",
        keyframes: `@keyframes alivesvg-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}`,
    },
    pulse: {
        name: "alivesvg-pulse",
        duration: "1.4s",
        timingFunction: "ease-in-out",
        keyframes: `@keyframes alivesvg-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.86; }
}`,
    },
};

export function buildCssSnippet(preset: StandardAnimationPreset): string {
    const config = PRESET_CSS[preset];

    return [
        `.alivesvg-target [data-alivesvg-animate="true"] {`,
        `  transform-box: fill-box;`,
        `  transform-origin: center;`,
        `  animation-iteration-count: var(--alivesvg-anim-iterations, 1);`,
        `  animation-fill-mode: both;`,
        `}`,
        `.alivesvg-target[data-preset="${preset}"] [data-alivesvg-animate="true"] {`,
        `  animation-name: ${config.name};`,
        `  animation-duration: ${config.duration};`,
        `  animation-timing-function: ${config.timingFunction};`,
        `}`,
        `.alivesvg-target[data-loop="once"] { --alivesvg-anim-iterations: 1; }`,
        `.alivesvg-target[data-loop="twice"] { --alivesvg-anim-iterations: 2; }`,
        `.alivesvg-target[data-loop="continuous"] { --alivesvg-anim-iterations: infinite; }`,
        `.alivesvg-target[data-trigger="hover"] [data-alivesvg-animate="true"] { animation-play-state: paused; }`,
        `.alivesvg-target[data-trigger="hover"]:hover [data-alivesvg-animate="true"] { animation-play-state: running; }`,
        config.keyframes,
    ].join("\n");
}

export function buildCustomCssSnippet(settings: CustomAnimationSettings): string {
    const safeDuration = Number.isFinite(settings.duration) && settings.duration > 0
        ? settings.duration
        : 1.2;
    const safeEasing = settings.easing?.trim() || "ease-in-out";
    const scaleValue = Number.isFinite(settings.scale) ? settings.scale : 1;
    const rotateValue = Number.isFinite(settings.rotate) ? settings.rotate : 0;
    const translateX = Number.isFinite(settings.translateX) ? settings.translateX : 0;
    const translateY = Number.isFinite(settings.translateY) ? settings.translateY : 0;
    const rawOpacity = Number.isFinite(settings.opacity) ? settings.opacity : 1;
    const opacityValue = Math.min(1, Math.max(0, rawOpacity));

    const transformParts: string[] = [];
    if (translateX !== 0 || translateY !== 0) {
        transformParts.push(`translate(${translateX}px, ${translateY}px)`);
    }
    if (rotateValue !== 0) {
        transformParts.push(`rotate(${rotateValue}deg)`);
    }
    if (scaleValue !== 1) {
        transformParts.push(`scale(${scaleValue})`);
    }

    const transformValue = transformParts.length > 0 ? transformParts.join(" ") : "none";

    return [
        `.alivesvg-target [data-alivesvg-animate="true"] {`,
        `  transform-box: fill-box;`,
        `  transform-origin: center;`,
        `  animation-iteration-count: var(--alivesvg-anim-iterations, 1);`,
        `  animation-fill-mode: both;`,
        `}`,
        `.alivesvg-target[data-preset="custom"] [data-alivesvg-animate="true"] {`,
        `  animation-name: alivesvg-custom;`,
        `  animation-duration: ${safeDuration}s;`,
        `  animation-timing-function: ${safeEasing};`,
        `}`,
        `.alivesvg-target[data-loop="once"] { --alivesvg-anim-iterations: 1; }`,
        `.alivesvg-target[data-loop="twice"] { --alivesvg-anim-iterations: 2; }`,
        `.alivesvg-target[data-loop="continuous"] { --alivesvg-anim-iterations: infinite; }`,
        `.alivesvg-target[data-trigger="hover"] [data-alivesvg-animate="true"] { animation-play-state: paused; }`,
        `.alivesvg-target[data-trigger="hover"]:hover [data-alivesvg-animate="true"] { animation-play-state: running; }`,
        `@keyframes alivesvg-custom {`,
        `  0%, 100% { transform: none; opacity: 1; }`,
        `  50% { transform: ${transformValue}; opacity: ${opacityValue}; }`,
        `}`,
    ].join("\n");
}
