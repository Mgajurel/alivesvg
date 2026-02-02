"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { IconCard } from "@/components/library/IconCard";
import { LIBRARY_ICONS } from "@/constants/library";
import { Search } from "lucide-react";

export default function LibraryPage() {
    const [search, setSearch] = useState("");

    const filteredIcons = LIBRARY_ICONS.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                <header className="space-y-4">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Icon Library</h1>
                    <p className="text-slate-500 text-lg max-w-2xl">
                        Browse our collection of animated interactions. Hover to preview.
                    </p>

                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Search icons (e.g. arrow, loading)..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </header>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                    {filteredIcons.map((item) => (
                        <IconCard key={item.id} item={item} />
                    ))}
                </div>

                {filteredIcons.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        No icons found matching &quot;{search}&quot;
                    </div>
                )}

            </div>
        </div>
    );
}
