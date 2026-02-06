"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stepper } from "@/components/ui/Stepper";
import { Check } from "lucide-react";

type TeamSize = "just_me" | "small" | "large";
type Certificates = "yes" | "no";
type Comfort = "simple" | "everything";

function computeUiMode(
  teamSize: TeamSize | null,
  certificates: Certificates | null,
  comfort: Comfort | null,
): "simple" | "standard" | "full" {
  // Start from team size
  let mode: "simple" | "standard" | "full" =
    teamSize === "just_me" ? "simple" : teamSize === "small" ? "standard" : "full";

  // If they issue certificates and mode is simple, bump to standard
  if (certificates === "yes" && mode === "simple") mode = "standard";

  // Comfort level overrides
  if (comfort === "simple" && mode === "full") mode = "standard";
  if (comfort === "everything") mode = "full";

  return mode;
}

export default function AdminOnboarding() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Step 2 answers
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null);
  const [certificates, setCertificates] = useState<Certificates | null>(null);
  const [comfort, setComfort] = useState<Comfort | null>(null);

  async function finish() {
    setLoading(true);
    setErr(null);
    try {
      // 1. Complete profile with name
      const profileRes = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const profileData = await profileRes.json().catch(() => ({}));
      if (!profileRes.ok) {
        setErr(profileData?.error || "Could not save profile");
        return;
      }

      // 2. Save settings with uiMode and mark onboarded
      const uiMode = computeUiMode(teamSize, certificates, comfort);
      const settingsRes = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uiMode, markOnboarded: true }),
      });
      const settingsData = await settingsRes.json().catch(() => ({}));
      if (!settingsRes.ok) {
        setErr(settingsData?.error || "Could not save settings");
        return;
      }

      document.cookie = "qt_onboarded=1; path=/; samesite=lax";
      router.replace(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function ChoiceCard({
    selected,
    onClick,
    title,
    desc,
  }: {
    selected: boolean;
    onClick: () => void;
    title: string;
    desc?: string;
  }) {
    return (
      <button
        onClick={onClick}
        className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-[1.02] w-full ${
          selected
            ? "border-[var(--primary)] shadow-lg ring-2 ring-[var(--primary)]/30 bg-[var(--primary)]/5"
            : "border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--card)]"
        }`}
      >
        {selected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="font-semibold text-sm text-[var(--foreground)]">{title}</div>
        {desc && <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">{desc}</p>}
      </button>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl mb-4">
            <span className="text-white font-bold text-2xl">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Welcome to Quantract</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Let's finish setting up your account</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-center mb-6">
          <Stepper steps={["Your Name", "About Your Business"]} active={step} />
        </div>

        <div className="bg-[var(--card)] rounded-2xl shadow-lg p-6 space-y-6 border border-[var(--border)]">
          {err && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm font-medium text-red-700">Error</p>
              <p className="text-xs text-red-600 mt-0.5">{err}</p>
            </div>
          )}

          {/* Step 1: Your Name */}
          {step === 0 && (
            <>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Create Your Profile</h2>
                <p className="text-sm text-[var(--muted-foreground)]">Enter your name to get started</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--muted-foreground)]">Your Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <button
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={() => { setErr(null); setStep(1); }}
                disabled={!name.trim()}
              >
                Continue &rarr;
              </button>

              <p className="text-xs text-[var(--muted-foreground)] text-center">
                You'll be able to update this later in settings
              </p>
            </>
          )}

          {/* Step 2: About Your Business */}
          {step === 1 && (
            <>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">About Your Business</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Help us tailor the app to your needs
                </p>
              </div>

              {/* Q1: Team size */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">How big is your team?</label>
                <div className="grid grid-cols-3 gap-3">
                  <ChoiceCard
                    selected={teamSize === "just_me"}
                    onClick={() => setTeamSize("just_me")}
                    title="Just me"
                  />
                  <ChoiceCard
                    selected={teamSize === "small"}
                    onClick={() => setTeamSize("small")}
                    title="2-5 people"
                  />
                  <ChoiceCard
                    selected={teamSize === "large"}
                    onClick={() => setTeamSize("large")}
                    title="6+ people"
                  />
                </div>
              </div>

              {/* Q2: Certificates */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Do you issue electrical certificates?</label>
                <div className="grid grid-cols-2 gap-3">
                  <ChoiceCard
                    selected={certificates === "yes"}
                    onClick={() => setCertificates("yes")}
                    title="Yes"
                  />
                  <ChoiceCard
                    selected={certificates === "no"}
                    onClick={() => setCertificates("no")}
                    title="No"
                  />
                </div>
              </div>

              {/* Q3: Software comfort */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">How comfortable are you with software?</label>
                <div className="grid grid-cols-2 gap-3">
                  <ChoiceCard
                    selected={comfort === "simple"}
                    onClick={() => setComfort("simple")}
                    title="Keep it simple"
                    desc="Show me the essentials"
                  />
                  <ChoiceCard
                    selected={comfort === "everything"}
                    onClick={() => setComfort("everything")}
                    title="Show me everything"
                    desc="I want all the tools"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className="py-3 px-4 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-[var(--muted)] transition-colors"
                  onClick={() => { setErr(null); setStep(0); }}
                >
                  &larr; Back
                </button>
                <button
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  onClick={finish}
                  disabled={loading || !teamSize || !certificates || !comfort}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Finish Setup"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
