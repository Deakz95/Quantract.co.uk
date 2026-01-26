"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { RefreshCw, User, Mail, AlertCircle, Check } from "lucide-react";

type Profile = {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: string;
    createdAt: string;
  };
  engineer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    hourlyRate: number | null;
    skills: string | null;
    certifications: string | null;
    status: string;
  } | null;
};

export default function EngineerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/engineer/profile");
      const data = await res.json();
      if (data.ok) {
        setProfile(data.profile);
        setFormData({
          name: data.profile.user.name || "",
          phone: data.profile.user.phone || "",
        });
      } else {
        setError(data.error || "Failed to load profile");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/engineer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.ok) {
        await loadProfile();
      } else {
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Unable to load profile</h3>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">{error}</p>
        <Button onClick={loadProfile} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">My Profile</h2>
        <p className="text-sm text-[var(--muted-foreground)]">View and update your profile information</p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Email (read-only) */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <Mail className="w-4 h-4" />
            Email
          </label>
          <Input value={profile?.user.email || ""} disabled className="bg-[var(--muted)]" />
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Contact admin to change your email</p>
        </div>

        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <User className="w-4 h-4" />
            Name
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your name"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium mb-2">
            <User className="w-4 h-4" />
            Phone
          </label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Your phone number"
          />
        </div>

        {/* Engineer Details (read-only) */}
        {profile?.engineer && (
          <div className="pt-4 border-t border-[var(--border)]">
            <h3 className="text-sm font-semibold mb-3">Engineer Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[var(--muted-foreground)]">Status:</span>{" "}
                <span className="font-medium capitalize">{profile.engineer.status}</span>
              </div>
              {profile.engineer.hourlyRate && (
                <div>
                  <span className="text-[var(--muted-foreground)]">Hourly Rate:</span>{" "}
                  <span className="font-medium">${profile.engineer.hourlyRate}/hr</span>
                </div>
              )}
              {profile.engineer.skills && (
                <div className="col-span-2">
                  <span className="text-[var(--muted-foreground)]">Skills:</span>{" "}
                  <span className="font-medium">{profile.engineer.skills}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
