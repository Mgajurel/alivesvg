"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";

export function UserNav() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />;
  }

  if (isSignedIn) {
    return <UserButton afterSignOutUrl="/" />;
  }

  return (
    <SignInButton mode="modal">
      <Button variant="outline" size="sm" className="rounded-full">
        Sign in
      </Button>
    </SignInButton>
  );
}
