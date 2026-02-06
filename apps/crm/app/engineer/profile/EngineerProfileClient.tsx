"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import {
  User,
  ImagePlus,
  Save,
  Award,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

// ── Types ──

type EngineerData = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelationship: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: string;
};

type Qualification = {
  id: string;
  name: string;
  type: string | null;
  issuer: string | null;
  certificateNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  notes: string | null;
  createdAt: string;
  document: {
    id: string;
    mimeType: string;
    originalFilename: string | null;
    sizeBytes: number;
    url: string;
  } | null;
};

type ProfileResponse = {
  ok: boolean;
  profile: {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      createdAt: string;
    };
    engineer: EngineerData | null;
    qualifications: Qualification[];
  };
};

// ── Component ──

export default function EngineerProfileClient() {
  const { toast } = useToast();

  const [tab, setTab] = useState<"profile" | "certificates">("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engineer, setEngineer] = useState<EngineerData | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [qualifications, setQualifications] = useState<Qualification[]>([]);

  // Profile form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    county: "",
    postcode: "",
    country: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelationship: "",
  });
  const [saving, setSaving] = useState(false);

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Qualification form
  const [showQualForm, setShowQualForm] = useState(false);
  const [qualForm, setQualForm] = useState({
    name: "",
    type: "",
    issuer: "",
    certificateNumber: "",
    issueDate: "",
    expiryDate: "",
    notes: "",
  });
  const [qualFile, setQualFile] = useState<File | null>(null);
  const [savingQual, setSavingQual] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<ProfileResponse>("/api/engineer/profile");
      const { engineer: eng, qualifications: quals, user } = res.profile;
      setUserEmail(user.email);
      setEngineer(eng);
      setQualifications(quals);
      setForm({
        name: eng?.name ?? user.name ?? "",
        phone: eng?.phone ?? "",
        address1: eng?.address1 ?? "",
        address2: eng?.address2 ?? "",
        city: eng?.city ?? "",
        county: eng?.county ?? "",
        postcode: eng?.postcode ?? "",
        country: eng?.country ?? "",
        emergencyName: eng?.emergencyName ?? "",
        emergencyPhone: eng?.emergencyPhone ?? "",
        emergencyRelationship: eng?.emergencyRelationship ?? "",
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Save profile ──

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiRequest("/api/engineer/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      toast({ title: "Profile updated", variant: "success" });
      await load();
    } catch (err) {
      toast({
        title: "Failed to save",
        description: getApiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Avatar upload ──

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiRequest<{ ok: boolean; avatarUrl: string }>(
        "/api/engineer/avatar",
        { method: "PUT", body: fd },
      );
      setEngineer((prev) =>
        prev ? { ...prev, avatarUrl: res.avatarUrl } : prev,
      );
      toast({ title: "Profile picture updated", variant: "success" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: getApiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Add qualification ──

  const handleAddQualification = async () => {
    if (!qualForm.name.trim()) return;
    setSavingQual(true);
    try {
      const fd = new FormData();
      fd.append(
        "metadata",
        JSON.stringify({
          name: qualForm.name.trim(),
          type: qualForm.type.trim() || undefined,
          issuer: qualForm.issuer.trim() || undefined,
          certificateNumber: qualForm.certificateNumber.trim() || undefined,
          issueDate: qualForm.issueDate || undefined,
          expiryDate: qualForm.expiryDate || undefined,
          notes: qualForm.notes.trim() || undefined,
        }),
      );
      if (qualFile) {
        fd.append("file", qualFile);
      }
      await apiRequest("/api/engineer/qualifications", {
        method: "POST",
        body: fd,
      });
      toast({ title: "Qualification added", variant: "success" });
      setShowQualForm(false);
      setQualForm({
        name: "",
        type: "",
        issuer: "",
        certificateNumber: "",
        issueDate: "",
        expiryDate: "",
        notes: "",
      });
      setQualFile(null);
      await load();
    } catch (err) {
      toast({
        title: "Failed to add",
        description: getApiErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSavingQual(false);
    }
  };

  // ── Expiry status helper ──

  function expiryBadge(expiryDate: string | null) {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    const now = new Date();
    const daysUntil = Math.ceil(
      (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" /> Expired
        </Badge>
      );
    }
    if (daysUntil <= 90) {
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="w-3 h-3" /> Expires in {daysUntil}d
        </Badge>
      );
    }
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="w-3 h-3" /> Valid
      </Badge>
    );
  }

  // ── Render ──

  if (loading)
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <LoadingSkeleton key={i} />
        ))}
      </div>
    );
  if (error) return <ErrorState description={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          My Profile
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          View and update your profile information
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        <button
          onClick={() => setTab("profile")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "profile"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <User className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Profile
        </button>
        <button
          onClick={() => setTab("certificates")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "certificates"
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <Award className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          Certificates
          {qualifications.length > 0 && (
            <span className="ml-1.5 text-xs bg-[var(--muted)] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded-full">
              {qualifications.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Profile Tab ── */}
      {tab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Avatar + summary card */}
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
              <div className="relative group">
                {engineer?.avatarUrl ? (
                  <img
                    src={engineer.avatarUrl}
                    alt={engineer.name || "Profile"}
                    className="w-28 h-28 rounded-full object-cover border-2 border-[var(--border)]"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-[var(--muted)] flex items-center justify-center border-2 border-[var(--border)]">
                    <User className="w-12 h-12 text-[var(--muted-foreground)]" />
                  </div>
                )}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {engineer?.name || form.name || "Unnamed"}
                </h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {userEmail}
                </p>
              </div>
              {engineer && (
                <Badge variant={engineer.isActive ? "success" : "secondary"}>
                  {engineer.isActive ? "Active" : "Inactive"}
                </Badge>
              )}
              {uploadingAvatar && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Uploading...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Profile form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldInput
                    label="Full Name"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                  />
                  <FieldInput
                    label="Phone"
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                    type="tel"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldInput
                    label="Address Line 1"
                    value={form.address1}
                    onChange={(v) => setForm({ ...form, address1: v })}
                  />
                  <FieldInput
                    label="Address Line 2"
                    value={form.address2}
                    onChange={(v) => setForm({ ...form, address2: v })}
                  />
                  <FieldInput
                    label="City"
                    value={form.city}
                    onChange={(v) => setForm({ ...form, city: v })}
                  />
                  <FieldInput
                    label="County"
                    value={form.county}
                    onChange={(v) => setForm({ ...form, county: v })}
                  />
                  <FieldInput
                    label="Postcode"
                    value={form.postcode}
                    onChange={(v) => setForm({ ...form, postcode: v })}
                  />
                  <FieldInput
                    label="Country"
                    value={form.country}
                    onChange={(v) => setForm({ ...form, country: v })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldInput
                    label="Contact Name"
                    value={form.emergencyName}
                    onChange={(v) => setForm({ ...form, emergencyName: v })}
                  />
                  <FieldInput
                    label="Contact Phone"
                    value={form.emergencyPhone}
                    onChange={(v) => setForm({ ...form, emergencyPhone: v })}
                    type="tel"
                  />
                  <FieldInput
                    label="Relationship"
                    value={form.emergencyRelationship}
                    onChange={(v) =>
                      setForm({ ...form, emergencyRelationship: v })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Certificates Tab ── */}
      {tab === "certificates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--foreground)]">
              Qualifications & Certificates
            </h3>
            <Button
              size="sm"
              onClick={() => setShowQualForm(!showQualForm)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Qualification
            </Button>
          </div>

          {/* Add form */}
          {showQualForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">New Qualification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldInput
                    label="Qualification Name *"
                    value={qualForm.name}
                    onChange={(v) => setQualForm({ ...qualForm, name: v })}
                    placeholder="e.g. 18th Edition"
                  />
                  <FieldInput
                    label="Type"
                    value={qualForm.type}
                    onChange={(v) => setQualForm({ ...qualForm, type: v })}
                    placeholder="e.g. electrical, gas"
                  />
                  <FieldInput
                    label="Issuer"
                    value={qualForm.issuer}
                    onChange={(v) => setQualForm({ ...qualForm, issuer: v })}
                    placeholder="e.g. City & Guilds"
                  />
                  <FieldInput
                    label="Certificate Number"
                    value={qualForm.certificateNumber}
                    onChange={(v) =>
                      setQualForm({ ...qualForm, certificateNumber: v })
                    }
                  />
                  <FieldInput
                    label="Issue Date"
                    value={qualForm.issueDate}
                    onChange={(v) =>
                      setQualForm({ ...qualForm, issueDate: v })
                    }
                    type="date"
                  />
                  <FieldInput
                    label="Expiry Date"
                    value={qualForm.expiryDate}
                    onChange={(v) =>
                      setQualForm({ ...qualForm, expiryDate: v })
                    }
                    type="date"
                  />
                </div>
                <FieldInput
                  label="Notes"
                  value={qualForm.notes}
                  onChange={(v) => setQualForm({ ...qualForm, notes: v })}
                />
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Certificate Document
                  </label>
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setQualFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-[var(--muted-foreground)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--muted)] file:text-[var(--foreground)] hover:file:bg-[var(--muted)]/80"
                  />
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    PDF, JPEG, PNG, WebP (max 10MB)
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowQualForm(false);
                      setQualFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddQualification}
                    disabled={savingQual || !qualForm.name.trim()}
                  >
                    {savingQual ? "Saving..." : "Add"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Qualifications list */}
          {qualifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Award className="w-10 h-10 mx-auto text-[var(--muted-foreground)] mb-3" />
                <p className="text-sm text-[var(--muted-foreground)]">
                  No qualifications added yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {qualifications.map((q) => (
                <Card key={q.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {q.name}
                          </span>
                          {q.type && (
                            <Badge variant="outline" className="text-xs">
                              {q.type}
                            </Badge>
                          )}
                          {expiryBadge(q.expiryDate)}
                        </div>
                        <div className="mt-1 text-xs text-[var(--muted-foreground)] space-y-0.5">
                          {q.issuer && <p>Issuer: {q.issuer}</p>}
                          {q.certificateNumber && (
                            <p>Certificate No: {q.certificateNumber}</p>
                          )}
                          <div className="flex gap-4">
                            {q.issueDate && (
                              <span>
                                Issued:{" "}
                                {new Date(q.issueDate).toLocaleDateString(
                                  "en-GB",
                                )}
                              </span>
                            )}
                            {q.expiryDate && (
                              <span>
                                Expires:{" "}
                                {new Date(q.expiryDate).toLocaleDateString(
                                  "en-GB",
                                )}
                              </span>
                            )}
                          </div>
                          {q.notes && (
                            <p className="text-[var(--muted-foreground)]">
                              {q.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      {q.document && (
                        <a
                          href={q.document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          View
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable field input ──

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
      />
    </div>
  );
}
