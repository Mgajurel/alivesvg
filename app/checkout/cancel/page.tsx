"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CheckoutCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--alivesvg-bg)] px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md rounded-[30px] border border-slate-900/10 bg-white/85 p-8 text-center shadow-[0_20px_52px_rgba(17,28,45,0.12)] backdrop-blur-sm"
      >
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <XCircle className="h-7 w-7 text-slate-500" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Payment Cancelled
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Your payment was not processed. You can try again anytime or continue
          using AliveSVG with the free tier.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="rounded-full">
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/#pricing">View Pricing</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
