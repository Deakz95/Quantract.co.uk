"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ClientOnboarding from "./ClientOnboarding";
// import ClientInviteOnboarding from "./ClientInviteOnboarding"; // TODO: File doesn't exist yet

/**
 * ✅ ROUTER: Handles both flows
 * - ?token=X -> Invite-based onboarding (pre-login, with password)
 * - no token -> Session-based profile completion (post-login)
 */
function OnboardingRouter() {
  const params = useSearchParams();
  const token = params.get("token");

  if (token) {
    // TODO: Use ClientInviteOnboarding when it exists
    return <ClientOnboarding />;
  }

  return <ClientOnboarding />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
      <OnboardingRouter />
    </Suspense>
  );
}
