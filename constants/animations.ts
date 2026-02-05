import { Transition, Variants } from "framer-motion";

export const STANDARD_PRESETS = ["fade", "scale", "slide", "spin", "bounce", "pulse"] as const;
export type StandardAnimationPreset = typeof STANDARD_PRESETS[number];
export type AnimationPreset = StandardAnimationPreset | "custom";
export type AnimationTriggerMode = "always" | "hover";
export type AnimationLoopMode = "once" | "twice" | "continuous";

export type AnimationPlaybackSettings = {
    triggerMode: AnimationTriggerMode;
    loopMode: AnimationLoopMode;
};

export type CustomAnimationSettings = {
    duration: number;
    easing: string;
    scale: number;
    rotate: number;
    translateX: number;
    translateY: number;
    opacity: number;
};

export const DEFAULT_CUSTOM_SETTINGS: CustomAnimationSettings = {
    duration: 1.2,
    easing: "ease-in-out",
    scale: 1.08,
    rotate: 0,
    translateX: 0,
    translateY: -8,
    opacity: 0.9,
};

type PresetConfig = {
    hidden: Record<string, number | string>;
    rest: Record<string, number | string>;
    play: Record<string, number | string | number[]>;
    transition: Transition;
};

export const TRIGGER_MODE_LABELS: Record<AnimationTriggerMode, string> = {
    always: "Always",
    hover: "On Hover",
};

export const LOOP_MODE_LABELS: Record<AnimationLoopMode, string> = {
    once: "Once",
    twice: "Twice",
    continuous: "Continuous",
};

const DEFAULT_PLAYBACK: AnimationPlaybackSettings = {
    triggerMode: "always",
    loopMode: "continuous",
};

const LOOP_REPEAT: Record<AnimationLoopMode, number> = {
    once: 0,
    twice: 1,
    continuous: Infinity,
};

const PRESET_CONFIGS: Record<StandardAnimationPreset, PresetConfig> = {
    fade: {
        hidden: { opacity: 0 },
        rest: { opacity: 1 },
        play: { opacity: [0.35, 1, 0.35] },
        transition: { duration: 1.25, ease: "easeInOut" },
    },
    scale: {
        hidden: { scale: 0.85, opacity: 0 },
        rest: { scale: 1, opacity: 1 },
        play: { scale: [1, 1.12, 1] },
        transition: { duration: 1.2, ease: "easeInOut" },
    },
    slide: {
        hidden: { x: -20, opacity: 0 },
        rest: { x: 0, opacity: 1 },
        play: { x: [0, 8, 0], opacity: [1, 0.9, 1] },
        transition: { duration: 1.15, ease: "easeInOut" },
    },
    spin: {
        hidden: { rotate: 0, opacity: 0 },
        rest: { rotate: 0, opacity: 1 },
        play: { rotate: [0, 360], opacity: 1 },
        transition: { duration: 1.8, ease: "linear" },
    },
    bounce: {
        hidden: { y: 0, opacity: 0 },
        rest: { y: 0, opacity: 1 },
        play: { y: [0, -10, 0], opacity: 1 },
        transition: { duration: 0.95, ease: "easeInOut" },
    },
    pulse: {
        hidden: { scale: 0.92, opacity: 0 },
        rest: { scale: 1, opacity: 1 },
        play: { scale: [1, 1.08, 1], opacity: [1, 0.86, 1] },
        transition: { duration: 1.4, ease: "easeInOut" },
    },
};

function getRepeatedTransition(base: Transition, loopMode: AnimationLoopMode): Transition {
    return {
        ...base,
        repeat: LOOP_REPEAT[loopMode],
    };
}

export function getAnimationVariants(
    preset: AnimationPreset,
    playback: AnimationPlaybackSettings = DEFAULT_PLAYBACK,
): Variants {
    if (preset === "custom") {
        return {
            hidden: {},
            rest: {},
            play: {},
        };
    }

    const config = PRESET_CONFIGS[preset];

    return {
        hidden: config.hidden,
        rest: config.rest,
        play: {
            ...config.play,
            transition: getRepeatedTransition(config.transition, playback.loopMode),
        },
    };
}

export function getMotionStateTargets(triggerMode: AnimationTriggerMode) {
    return {
        animate: triggerMode === "always" ? "play" : "rest",
        whileHover: triggerMode === "hover" ? "play" : undefined,
    };
}

export function serializeVariantsForCode(variants: Variants): string {
    return JSON.stringify(
        variants,
        (_key, value) => (value === Infinity ? "__INFINITY__" : value),
        2,
    ).replace(/"__INFINITY__"/g, "Infinity");
}

export const ANIMATION_VARIANTS: Record<StandardAnimationPreset, Variants> = (
    Object.keys(PRESET_CONFIGS) as StandardAnimationPreset[]
).reduce((accumulator, preset) => {
    accumulator[preset] = getAnimationVariants(preset, DEFAULT_PLAYBACK);
    return accumulator;
}, {} as Record<StandardAnimationPreset, Variants>);

export const SPRING_TRANSITION = {
    type: "spring",
    stiffness: 260,
    damping: 20,
};
