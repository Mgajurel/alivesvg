"use client";



export function HeroBackground({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative w-full min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center overflow-hidden rounded-md">
            {/* Grid Pattern */}
            <div className="absolute inset-0 w-full h-full bg-white dark:bg-black bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Radial Gradient for focus */}
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-white dark:bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

            {/* Content wrapper */}
            <div className="relative z-20 w-full max-w-7xl mx-auto px-6">
                {children}
            </div>
        </div>
    );
}
