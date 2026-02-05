"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle() {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const activeTheme = theme === "system" ? resolvedTheme : theme;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 border border-slate-900/10 bg-white/90 px-1 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur">
            <button
                type="button"
                onClick={() => setTheme("light")}
                className={`px-3 py-1 transition ${activeTheme === "light"
                    ? "bg-[#ededed] text-[#222222]"
                    : "text-slate-500 hover:bg-[#f0f0f0]"
                    }`}
            >
                Light
            </button>
            <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`px-3 py-1 transition ${activeTheme === "dark"
                    ? "bg-[#ededed] text-[#222222]"
                    : "text-slate-500 hover:bg-[#f0f0f0]"
                    }`}
            >
                Dark
            </button>
        </div>
    );
}
