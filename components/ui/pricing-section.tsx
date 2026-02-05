import * as React from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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

type PlanTier = "Basic" | "Standard" | "Pro";

interface PricingCardProps {
  title: PlanTier;
  price: string;
  description?: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
}

const pricingData: PricingCardProps[] = [
  {
    title: "Basic",
    price: "$3/month",
    description: "For solo makers animating a handful of icons.",
    features: [
      "60 animated SVG exports / month",
      "6 studio animation presets",
      "React + Framer Motion export",
      "Community support",
    ],
    cta: "Start Basic",
    href: "/studio",
  },
  {
    title: "Standard",
    price: "$5/month",
    description: "Best value for daily studio workflows.",
    features: [
      "Unlimited exports",
      "Advanced easing controls",
      "Motion-ready code templates",
      "Priority studio queue",
    ],
    cta: "Go Standard",
    href: "/studio",
    featured: true,
  },
  {
    title: "Pro",
    price: "$9/month",
    description: "For teams shipping animated icon systems.",
    features: [
      "Team sharing + roles",
      "Custom preset library",
      "Audit-ready export history",
      "Priority support",
    ],
    cta: "Go Pro",
    href: "/studio",
  },
];

export default function PricingSection() {
  return (
    <Section id="pricing">
      <Container className="flex flex-col items-center gap-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Pricing
        </p>
        <h2 className="!my-0 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Keep motion affordable.
        </h2>
        <p className="max-w-2xl text-base text-slate-600 md:text-lg">
          Simple plans built for shipping animated SVGs quickly.
        </p>

        <div className="not-prose mt-6 grid grid-cols-1 gap-6 min-[900px]:grid-cols-3">
          {pricingData.map((plan) => (
            <PricingCard key={plan.title} plan={plan} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

function PricingCard({ plan }: { plan: PricingCardProps }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col border border-slate-900/10 bg-white/80 p-6 text-left shadow-sm dark:border-white/10 dark:bg-[#111111]",
        plan.featured &&
          "border-primary/40 bg-white shadow-[0_18px_40px_rgba(0,0,0,0.12)] dark:border-white/30 dark:bg-[#0f0f0f]"
      )}
      aria-label={`${plan.title} plan`}
    >
      <div className="text-center">
        <div className="inline-flex items-center gap-2">
          <Badge variant={plan.featured ? "default" : "secondary"}>{plan.title}</Badge>
          {plan.featured && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Most popular
            </span>
          )}
        </div>
        <h4 className="mb-2 mt-4 text-3xl font-semibold text-slate-900">
          {plan.price}
        </h4>
        {plan.description && <p className="text-sm text-slate-600">{plan.description}</p>}
      </div>

      <div className="my-5 border-t border-slate-900/10 dark:border-white/10" />

      <ul className="space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center text-sm text-slate-700">
            <CircleCheck className="mr-2 h-4 w-4 text-slate-500" aria-hidden />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-6">
        <Link href={plan.href}>
          <Button
            size="sm"
            className="w-full"
            variant={plan.featured ? "default" : "outline"}
          >
            {plan.cta}
          </Button>
        </Link>
      </div>
    </div>
  );
}
