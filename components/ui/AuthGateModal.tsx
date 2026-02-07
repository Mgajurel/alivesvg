"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { LogIn, X } from "lucide-react";

interface AuthGateModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthGateModal({ open, onClose }: AuthGateModalProps) {
  if (!open) return null;

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

        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <LogIn className="h-5 w-5 text-slate-600" />
        </div>

        <h3 className="text-lg font-bold text-slate-900">
          Sign in to export
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Create a free account to copy icon code and use Studio exports.
        </p>

        <div className="mt-5 flex gap-3">
          <SignInButton mode="modal">
            <Button className="flex-1 rounded-full">Sign in</Button>
          </SignInButton>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
