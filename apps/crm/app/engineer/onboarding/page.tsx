"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EngineerOnboarding from "./EngineerOnboarding";
// import EngineerInviteOnboarding from "./EngineerInviteOnboarding"; // TODO: File doesn't exist yet

/**
 * ✅ ROUTER: Handles both flows
 * - ?token=X -> Invite-based onboarding (pre-login, with password)
 * - no token -> Session-based profile completion (post-login)
 */
function OnboardingRouter() {
  const params = useSearchParams();
  const token = params.get("token");

  if (token) {
    // TODO: Use EngineerInviteOnboarding when it exists
    return <EngineerOnboarding />;
  }

  return <EngineerOnboarding />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
      <OnboardingRouter />
    </Suspense>
  );
}
