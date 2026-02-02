import { Variants } from "framer-motion";

export type AnimationPreset = "fade" | "scale" | "slide" | "spin" | "bounce" | "pulse";

export const ANIMATION_VARIANTS: Record<AnimationPreset, Variants> = {
    fade: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        hover: { opacity: 0.7 },
    },
    scale: {
        hidden: { scale: 0 },
        visible: { scale: 1 },
        hover: { scale: 1.1 },
    },
    slide: {
        hidden: { x: -20, opacity: 0 },
        visible: { x: 0, opacity: 1 },
        hover: { x: 5 },
    },
    spin: {
        hidden: { rotate: 0 },
        visible: { rotate: 360, transition: { repeat: Infinity, ease: "linear", duration: 2 } },
        hover: { rotate: 90 },
    },
    bounce: {
        hidden: { y: 0 },
        visible: { y: [0, -10, 0], transition: { repeat: Infinity, duration: 1 } },
        hover: { y: -5 },
    },
    pulse: {
        hidden: { scale: 1 },
        visible: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.5 } },
        hover: { scale: 1.1 },
    },
};

export const SPRING_TRANSITION = {
    type: "spring",
    stiffness: 260,
    damping: 20,
};
