"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CircleCheck, Sparkles, X } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

const LIFETIME_FEATURES = [
  "All 500+ animated icons",
  "Unlimited Studio exports",
  "Advanced animation controls",
  "All future icon packs",
  "Priority support",
];

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "lifetime" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm rounded-[24px] border border-slate-900/10 bg-white p-6 shadow-[0_20px_52px_rgba(0,0,0,0.2)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--alivesvg-accent-soft)]">
          <Sparkles className="h-5 w-5 text-[var(--alivesvg-accent)]" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          Upgrade to Lifetime Access
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          One-time payment, unlimited everything.
        </p>

        <p className="mt-3 text-3xl font-black text-slate-900">
          $149
          <span className="ml-1 text-sm font-medium text-slate-500">
            one-time
          </span>
        </p>

        <ul className="mt-4 space-y-2">
          {LIFETIME_FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center text-sm text-slate-700"
            >
              <CircleCheck className="mr-2 h-4 w-4 shrink-0 text-emerald-500" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex gap-3">
          <Button
            className="flex-1 rounded-full"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Get Lifetime Access"}
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onClose}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
