"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useUserPlan } from "@/hooks/useUserPlan";

import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type SectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

type ContainerProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

const Section = ({ children, className, id }: SectionProps) => (
  <section className={cn("py-10 md:py-14", className)} id={id}>
    {children}
  </section>
);

const Container = ({ children, className, id }: ContainerProps) => (
  <div className={cn("mx-auto max-w-6xl px-6", className)} id={id}>
    {children}
  </div>
);

const FREE_FEATURES = [
  "Curated free icon set",
  "6 animation presets",
  "3 Studio exports",
  "React + Framer Motion code",
];

const LIFETIME_FEATURES = [
  "All 500+ animated icons",
  "Unlimited Studio exports",
  "Advanced animation controls",
  "Priority support",
  "All future icon packs included",
];

export default function PricingSection() {
  const { plan, isSignedIn } = useUserPlan();
  const [loading, setLoading] = React.useState(false);

  const handleLifetimeCheckout = async () => {
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

  const isLifetime = plan === "lifetime" || plan === "starter";

  return (
    <Section id="pricing">
      <Container className="flex flex-col items-center gap-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Pricing
        </p>
        <h2 className="!my-0 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          One price. Lifetime access.
        </h2>
        <p className="max-w-2xl text-base text-slate-600 md:text-lg">
          Start free, upgrade once. No subscriptions, no hidden fees.
        </p>

        <div className="not-prose mt-6 grid grid-cols-1 gap-6 min-[900px]:grid-cols-2 min-[900px]:max-w-3xl">
          {/* Free Tier */}
          <div
            className="flex h-full flex-col border border-slate-900/10 bg-white/80 p-6 text-left shadow-sm dark:border-white/10 dark:bg-[#111111]"
            aria-label="Free plan"
          >
            <div className="text-center">
              <div className="inline-flex items-center gap-2">
                <Badge variant="secondary">Free</Badge>
                {isSignedIn && plan === "free" && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Current plan
                  </span>
                )}
              </div>
              <h4 className="mb-2 mt-4 text-3xl font-semibold text-slate-900">
                $0
                <span className="ml-1 text-sm font-normal text-slate-500">
                  forever
                </span>
              </h4>
              <p className="text-sm text-slate-600">
                Perfect for trying out AliveSVG.
              </p>
            </div>

            <div className="my-5 border-t border-slate-900/10 dark:border-white/10" />

            <ul className="space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center text-sm text-slate-700">
                  <CircleCheck className="mr-2 h-4 w-4 text-slate-500" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <Link href="/library">
                <Button size="sm" className="w-full" variant="outline">
                  Browse Library
                </Button>
              </Link>
            </div>
          </div>

          {/* Lifetime Tier */}
          <div
            className="flex h-full flex-col border-primary/40 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.12)] dark:border-white/30 dark:bg-[#0f0f0f] border p-6 text-left"
            aria-label="Lifetime Access plan"
          >
            <div className="text-center">
              <div className="inline-flex items-center gap-2">
                <Badge variant="default">Lifetime Access</Badge>
                {isLifetime && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Purchased
                  </span>
                )}
              </div>
              <h4 className="mb-2 mt-4 text-3xl font-semibold text-slate-900">
                $149
                <span className="ml-1 text-sm font-normal text-slate-500">
                  one-time
                </span>
              </h4>
              <p className="text-sm text-slate-600">
                Everything, forever. No subscriptions.
              </p>
            </div>

            <div className="my-5 border-t border-slate-900/10 dark:border-white/10" />

            <ul className="space-y-3">
              {LIFETIME_FEATURES.map((feature) => (
                <li key={feature} className="flex items-center text-sm text-slate-700">
                  <CircleCheck className="mr-2 h-4 w-4 text-emerald-500" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              {isLifetime ? (
                <Link href="/library">
                  <Button size="sm" className="w-full" variant="default">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Go to Library
                  </Button>
                </Link>
              ) : (
                <Button
                  size="sm"
                  className="w-full"
                  variant="default"
                  onClick={handleLifetimeCheckout}
                  disabled={loading}
                >
                  {loading ? "Redirecting..." : "Get Lifetime Access"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
