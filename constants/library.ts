import {
    ArrowRight,
    Home,
    Settings,
    User,
    Bell,
    Search,
    Menu,
    Check,
    X,
    Loader2,
    Heart,
    Star
} from "lucide-react";
import { AnimationPreset } from "./animations";

export type IconItem = {
    id: string;
    name: string;
    icon: React.ElementType;
    defaultAnimation: AnimationPreset;
    tags: string[];
};

export const LIBRARY_ICONS: IconItem[] = [
    { id: "1", name: "Arrow Right", icon: ArrowRight, defaultAnimation: "slide", tags: ["arrow", "direction", "nav"] },
    { id: "2", name: "Spinner", icon: Loader2, defaultAnimation: "spin", tags: ["loading", "wait", "spinner"] },
    { id: "3", name: "Heart", icon: Heart, defaultAnimation: "pulse", tags: ["love", "like", "favorite"] },
    { id: "4", name: "Settings", icon: Settings, defaultAnimation: "spin", tags: ["gear", "config", "system"] },
    { id: "5", name: "Home", icon: Home, defaultAnimation: "scale", tags: ["house", "main", "dashboard"] },
    { id: "6", name: "User", icon: User, defaultAnimation: "bounce", tags: ["profile", "account", "person"] },
    { id: "7", name: "Bell", icon: Bell, defaultAnimation: "bounce", tags: ["notification", "alert", "alarm"] },
    { id: "8", name: "Search", icon: Search, defaultAnimation: "scale", tags: ["find", "query", "magnifier"] },
    { id: "9", name: "Menu", icon: Menu, defaultAnimation: "fade", tags: ["hamburger", "nav", "list"] },
    { id: "10", name: "Check", icon: Check, defaultAnimation: "scale", tags: ["success", "done", "tick"] },
    { id: "11", name: "X", icon: X, defaultAnimation: "scale", tags: ["close", "delete", "remove"] },
    { id: "12", name: "Star", icon: Star, defaultAnimation: "pulse", tags: ["rate", "favorite", "bookmark"] },
];
