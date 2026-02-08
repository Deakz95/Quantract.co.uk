"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { SubCard } from "../../components/ui/SubCard";
import { FloatingInput } from "../../components/ui/FloatingInput";
import { FloatingSelect } from "../../components/ui/FloatingSelect";
import { PillSelector } from "../../components/ui/PillSelector";
import { getCertificateTemplate, type EmergencyLightingCertificate, getSignature, setSignature, clearSignature, migrateAllLegacySignatures } from "@quantract/shared/certificate-types";
import type { SignatureValue } from "@quantract/shared/certificate-types";
import {
  useCertificateStore,
  useStoreHydration,
  createNewCertificate,
  generateCertificateNumber,
} from "../../lib/certificateStore";
import { StickyActionBar } from "../../components/StickyActionBar";
import { SignatureField } from "../../components/signatures/SignatureField";
import { PhotoCapture } from "../../components/PhotoCapture";

function EmergencyLightingPageContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get("id");
  const hydrated = useStoreHydration();

  const { addCertificate, updateCertificate, getCertificate } = useCertificateStore();

  const [data, setData] = useState<EmergencyLightingCertificate>(getCertificateTemplate("EML") as EmergencyLightingCertificate);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentCertId, setCurrentCertId] = useState<string | null>(certificateId);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [photos, setPhotos] = useState<string[]>([]);

  // V2 signature helpers
  const getsig = (role: string): SignatureValue | null =>
    getSignature(data as unknown as Record<string, unknown>, role) ?? null;
  const setSig = (role: string, sig: SignatureValue | null) => {
    setData((prev) => {
      const d = prev as unknown as Record<string, unknown>;
      const updated = sig ? setSignature(d, role, sig) : clearSignature(d, role);
      return updated as EmergencyLightingCertificate;
    });
  };

  // Load existing certificate if ID is provided (only after hydration)
  useEffect(() => {
    if (hydrated && certificateId) {
      const existing = getCertificate(certificateId);
      if (existing && existing.data) {
        const loaded = existing.data as EmergencyLightingCertificate;
        const withMigratedSigs = migrateAllLegacySignatures("EML", loaded as unknown as Record<string, unknown>);
        Object.assign(loaded, { _signatures: (withMigratedSigs as Record<string, unknown>)._signatures });
        // Migrate boolean test results → string pill values
        const boolFields = ["allLuminairesFunctional", "exitSignsVisible", "illuminationAdequate", "logBookAvailable"] as const;
        for (const f of boolFields) {
          const v = loaded.testResults[f];
          if (typeof v === "boolean") {
            (loaded.testResults as Record<string, unknown>)[f] = v ? "pass" : "";
          }
        }
        setData(loaded);
        setCurrentCertId(certificateId);
        setLastSaved(new Date(existing.updated_at));
      }
    }
  }, [certificateId, getCertificate, hydrated]);

  const updateOverview = (field: keyof EmergencyLightingCertificate["overview"], value: string) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateSystemDetails = (field: keyof EmergencyLightingCertificate["systemDetails"], value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      systemDetails: { ...prev.systemDetails, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateTestResults = (field: keyof EmergencyLightingCertificate["testResults"], value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const addLuminaire = () => {
    setData((prev) => ({
      ...prev,
      luminaires: [...prev.luminaires, { location: "", type: "", luminaireType: "", duration: "", status: "", notes: "" }],
    }));
    setSaveStatus("idle");
  };

  const updateLuminaire = (index: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      luminaires: prev.luminaires.map((lum, i) =>
        i === index ? { ...lum, [field]: value } : lum
      ),
    }));
    setSaveStatus("idle");
  };

  const removeLuminaire = (index: number) => {
    setData((prev) => ({
      ...prev,
      luminaires: prev.luminaires.filter((_, i) => i !== index),
    }));
    setSaveStatus("idle");
  };

  // Auto-save: debounce 2s after any state change
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const doAutoSave = useCallback(() => {
    if (!currentCertId) return;
    updateCertificate(currentCertId, {
      client_name: dataRef.current.overview.clientName,
      installation_address: dataRef.current.overview.installationAddress,
      data: dataRef.current as unknown as Record<string, unknown>,
    });
    setLastSaved(new Date());
  }, [currentCertId, updateCertificate]);

  useEffect(() => {
    if (!currentCertId || saveStatus !== "idle") return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(doAutoSave, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [data, currentCertId, saveStatus, doAutoSave]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      if (currentCertId) {
        updateCertificate(currentCertId, {
          client_name: data.overview.clientName,
          installation_address: data.overview.installationAddress,
          data: data as unknown as Record<string, unknown>,
        });
      } else {
        const newCert = createNewCertificate("EML", data as unknown as Record<string, unknown>);
        newCert.client_name = data.overview.clientName;
        newCert.installation_address = data.overview.installationAddress;
        newCert.certificate_number = data.overview.jobReference || generateCertificateNumber("EML");
        addCertificate(newCert);
        setCurrentCertId(newCert.id);
        window.history.replaceState({}, "", `/eml?id=${newCert.id}`);
      }

      setLastSaved(new Date());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Error saving certificate:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    await handleSave();

    setIsGenerating(true);
    // PDF generation would go here
    setTimeout(() => {
      alert("Emergency Lighting Certificate PDF generation coming soon!");
      setIsGenerating(false);
      if (currentCertId) {
        updateCertificate(currentCertId, { status: "issued" });
      }
    }, 500);
  };

  const luminaireStats = {
    total: data.luminaires.length,
    pass: data.luminaires.filter((l) => l.status === "pass").length,
    fail: data.luminaires.filter((l) => l.status === "fail").length,
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Emergency Lighting Certificate</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                BS 5266 | Emergency Lighting
                {currentCertId && (
                  <span className="ml-2 text-[var(--primary)]">
                    • {lastSaved ? `Last saved ${lastSaved.toLocaleTimeString()}` : "Not saved"}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={isSaving}
              className="relative"
            >
              {saveStatus === "saving" ? (
                "Saving..."
              ) : saveStatus === "saved" ? (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              ) : (
                "Save"
              )}
            </Button>
            <Button onClick={handleDownload} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Save Status Banner */}
        {!currentCertId && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-sm text-sm text-amber-400 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>This certificate is not saved yet. Click &quot;Save&quot; to store it locally.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Main Content */}
          <div className="flex flex-col gap-6">
            {/* 1. Installation Details */}
            <div className="space-y-4">
              <SectionHeading number={1} title="Installation Details" fieldCount={5} />
              <SubCard title="Report Info">
                <div className="grid md:grid-cols-2 gap-3">
                  <FloatingInput
                    id="jobReference"
                    label="Certificate Reference"
                    value={data.overview.jobReference}
                    onChange={(e) => updateOverview("jobReference", e.target.value)}
                    placeholder="e.g. EML-2024-001"
                  />
                  <FloatingInput
                    id="dateOfInspection"
                    label="Test Date"
                    type="date"
                    value={data.overview.dateOfInspection}
                    onChange={(e) => updateOverview("dateOfInspection", e.target.value)}
                  />
                </div>
              </SubCard>
              <SubCard title="Client & Site">
                <div className="grid md:grid-cols-2 gap-3">
                  <FloatingInput
                    id="clientName"
                    label="Client Name"
                    value={data.overview.clientName}
                    onChange={(e) => updateOverview("clientName", e.target.value)}
                    placeholder="Client or company name"
                  />
                  <FloatingInput
                    id="siteName"
                    label="Site Name"
                    value={data.overview.siteName}
                    onChange={(e) => updateOverview("siteName", e.target.value)}
                    placeholder="Building or site name"
                  />
                </div>
              </SubCard>
              <SubCard title="Address">
                <div>
                  <Label htmlFor="installationAddress" className="sr-only">Site Address</Label>
                  <Textarea
                    id="installationAddress"
                    value={data.overview.installationAddress}
                    onChange={(e) => updateOverview("installationAddress", e.target.value)}
                    placeholder="Full address"
                    className="min-h-[80px]"
                  />
                </div>
              </SubCard>
            </div>

            {/* 2. System Details */}
            <div className="space-y-4">
              <SectionHeading number={2} title="System Details" fieldCount={8} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <FloatingSelect
                  id="systemType"
                  label="System Type"
                  value={data.systemDetails.systemType}
                  onChange={(e) => updateSystemDetails("systemType", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="maintained">Maintained</option>
                  <option value="non-maintained">Non-Maintained</option>
                  <option value="sustained">Sustained</option>
                  <option value="combined">Combined</option>
                </FloatingSelect>
                <FloatingSelect
                  id="designDuration"
                  label="Design Duration"
                  value={data.systemDetails.designDuration}
                  onChange={(e) => updateSystemDetails("designDuration", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="1hr">1 Hour</option>
                  <option value="3hr">3 Hours</option>
                </FloatingSelect>
                <FloatingInput
                  id="numberOfLuminaires"
                  label="Total Luminaires"
                  type="number"
                  value={data.systemDetails.numberOfLuminaires}
                  onChange={(e) => updateSystemDetails("numberOfLuminaires", e.target.value)}
                  placeholder="e.g. 32"
                />
                <FloatingInput
                  id="riskAssessmentRef"
                  label="Risk Assessment Reference"
                  value={data.systemDetails.riskAssessmentRef}
                  onChange={(e) => updateSystemDetails("riskAssessmentRef", e.target.value)}
                  placeholder="e.g. RA-2024-001"
                />
                <FloatingInput
                  id="centralBatteryLocation"
                  label="Central Battery Location"
                  value={data.systemDetails.centralBatteryLocation}
                  onChange={(e) => updateSystemDetails("centralBatteryLocation", e.target.value)}
                  placeholder="e.g. Plant Room"
                />
              </div>
              <SubCard title="Coverage">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="escapeLighting"
                      checked={data.systemDetails.escapeLighting}
                      onChange={(e) => updateSystemDetails("escapeLighting", e.target.checked)}
                      className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                    />
                    <Label htmlFor="escapeLighting" className="mb-0">Escape Route Lighting</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="standbyLighting"
                      checked={data.systemDetails.standbyLighting}
                      onChange={(e) => updateSystemDetails("standbyLighting", e.target.checked)}
                      className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                    />
                    <Label htmlFor="standbyLighting" className="mb-0">Standby Lighting</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="highRiskTaskLighting"
                      checked={data.systemDetails.highRiskTaskLighting}
                      onChange={(e) => updateSystemDetails("highRiskTaskLighting", e.target.checked)}
                      className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                    />
                    <Label htmlFor="highRiskTaskLighting" className="mb-0">High Risk Task Lighting</Label>
                  </div>
                </div>
              </SubCard>
            </div>

            {/* 3. Luminaire Schedule */}
            <div>
              <SectionHeading number={3} title="Luminaire Schedule">
                <Button variant="secondary" size="sm" onClick={addLuminaire}>
                  + Add Luminaire
                </Button>
              </SectionHeading>
              {data.luminaires.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No luminaires added. Click &quot;Add Luminaire&quot; to begin.</p>
              ) : (
                <div className="space-y-3">
                  {data.luminaires.map((lum, index) => (
                    <div
                      key={index}
                      className={`grid grid-cols-[1fr_120px_140px_80px_100px_auto] gap-3 p-3 bg-[var(--muted)] rounded-sm items-end border-l-[3px] ${
                        lum.status === "pass" ? "border-l-[var(--success)]" : lum.status === "fail" ? "border-l-[var(--error)]" : "border-l-[var(--border)]"
                      }`}
                    >
                      <div>
                        <Label className="text-xs">Location</Label>
                        <Input
                          value={lum.location}
                          onChange={(e) => updateLuminaire(index, "location", e.target.value)}
                          placeholder="e.g. Corridor A"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <NativeSelect
                          value={lum.type}
                          onChange={(e) => updateLuminaire(index, "type", e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="self-contained">Self-Contained</option>
                          <option value="central-battery">Central Battery</option>
                          <option value="combined">Combined</option>
                        </NativeSelect>
                      </div>
                      <div>
                        <Label className="text-xs">Luminaire Type</Label>
                        <NativeSelect
                          value={lum.luminaireType}
                          onChange={(e) => updateLuminaire(index, "luminaireType", e.target.value)}
                        >
                          <option value="">Select...</option>
                          <option value="Exit Sign">Exit Sign</option>
                          <option value="Bulkhead">Bulkhead</option>
                          <option value="Downlight">Downlight</option>
                          <option value="Recessed">Recessed</option>
                          <option value="Twin Spot">Twin Spot</option>
                          <option value="Striplight">Striplight</option>
                        </NativeSelect>
                      </div>
                      <div>
                        <Label className="text-xs">Duration</Label>
                        <NativeSelect
                          value={lum.duration}
                          onChange={(e) => updateLuminaire(index, "duration", e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="1hr">1hr</option>
                          <option value="3hr">3hr</option>
                        </NativeSelect>
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <NativeSelect
                          value={lum.status}
                          onChange={(e) => updateLuminaire(index, "status", e.target.value)}
                        >
                          <option value="">-</option>
                          <option value="pass">Pass</option>
                          <option value="fail">Fail</option>
                        </NativeSelect>
                      </div>
                      <button
                        onClick={() => removeLuminaire(index)}
                        className="text-[var(--error)] p-2 hover:opacity-70 bg-transparent border-none cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Test Results */}
            <div className="space-y-4">
              <SectionHeading number={4} title="Test Results" fieldCount={8} />
              <SubCard title="Test Dates">
                <div className="grid md:grid-cols-2 gap-3">
                  <FloatingInput
                    id="functionalTestDate"
                    label="Functional Test Date"
                    type="date"
                    value={data.testResults.functionalTestDate}
                    onChange={(e) => updateTestResults("functionalTestDate", e.target.value)}
                  />
                  <FloatingInput
                    id="fullDurationTestDate"
                    label="Full Duration Test Date"
                    type="date"
                    value={data.testResults.fullDurationTestDate}
                    onChange={(e) => updateTestResults("fullDurationTestDate", e.target.value)}
                  />
                </div>
              </SubCard>
              <SubCard title="Duration">
                <div className="grid md:grid-cols-2 gap-3">
                  <FloatingSelect
                    id="durationTestResult"
                    label="Duration Test Result"
                    value={data.testResults.durationTestResult}
                    onChange={(e) => updateTestResults("durationTestResult", e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                  </FloatingSelect>
                  <FloatingInput
                    id="actualDuration"
                    label="Actual Duration Achieved"
                    value={data.testResults.actualDuration}
                    onChange={(e) => updateTestResults("actualDuration", e.target.value)}
                    placeholder="e.g. 3hr 15min"
                  />
                </div>
              </SubCard>
              <SubCard title="Checks">
                <div className="space-y-3">
                  {([
                    ["allLuminairesFunctional", "All luminaires functional"],
                    ["exitSignsVisible", "Exit signs visible and legible"],
                    ["illuminationAdequate", "Illumination adequate"],
                    ["logBookAvailable", "Log book available"],
                  ] as const).map(([field, label]) => (
                    <div key={field} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--foreground)]">{label}</span>
                      <PillSelector
                        options={[
                          { label: "Pass", value: "pass" },
                          { label: "Fail", value: "fail" },
                          { label: "N/A", value: "na" },
                        ]}
                        value={String(data.testResults[field] ?? "")}
                        onChange={(v) => updateTestResults(field, v)}
                      />
                    </div>
                  ))}
                </div>
              </SubCard>
            </div>

            {/* 5. Overall Assessment */}
            <div className="space-y-4">
              <SectionHeading number={5} title="Overall Assessment" fieldCount={2} />
              <SubCard title="Assessment">
                <div className="grid md:grid-cols-2 gap-3">
                  <FloatingSelect
                    id="overallCondition"
                    label="System Condition"
                    value={data.overallCondition}
                    onChange={(e) => setData((prev) => ({ ...prev, overallCondition: e.target.value as "satisfactory" | "unsatisfactory" | "" }))}
                  >
                    <option value="">Select...</option>
                    <option value="satisfactory">Satisfactory</option>
                    <option value="unsatisfactory">Unsatisfactory</option>
                  </FloatingSelect>
                  <FloatingInput
                    id="nextServiceDate"
                    label="Next Test Due"
                    type="date"
                    value={data.nextServiceDate}
                    onChange={(e) => setData((prev) => ({ ...prev, nextServiceDate: e.target.value }))}
                  />
                </div>
              </SubCard>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Luminaire Stats */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-5">
              <h3 className="text-sm font-semibold mb-4 text-[var(--muted-foreground)]">
                Luminaire Summary
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">Total Luminaires</span>
                  <span className="text-xl font-bold font-mono">{luminaireStats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--success)]">Passed</span>
                  <span className="text-xl font-bold font-mono text-[var(--success)]">
                    {luminaireStats.pass}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--error)]">Failed</span>
                  <span className="text-xl font-bold font-mono text-[var(--error)]">
                    {luminaireStats.fail}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-5">
              <h3 className="text-sm font-semibold mb-3 text-[var(--muted-foreground)]">
                BS 5266 Testing
              </h3>
              <div className="text-xs text-[var(--muted-foreground)] leading-relaxed space-y-3">
                <div>
                  <span className="text-[var(--foreground)] font-semibold">Monthly</span>
                  <div>Brief functional test (flick test)</div>
                </div>
                <div>
                  <span className="text-[var(--foreground)] font-semibold">6-Monthly</span>
                  <div>1/4 duration test (central battery)</div>
                </div>
                <div>
                  <span className="text-[var(--foreground)] font-semibold">Annual</span>
                  <div>Full rated duration test</div>
                </div>
              </div>
            </div>

            <Link href="/dashboard" className="w-full">
              <Button variant="ghost" className="w-full">
                View All Certificates
              </Button>
            </Link>
          </div>
        </div>
      </div>
      {/* 6. Signatures & Photos */}
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <div className="space-y-4">
          <SectionHeading number={6} title="Signatures & Photos" />
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <SignatureField signatureId="engineer" label="Engineer Signature" value={getsig("engineer")} onChange={(sig) => setSig("engineer", sig)} />
              <SignatureField signatureId="client" label="Customer Signature" value={getsig("client")} onChange={(sig) => setSig("client", sig)} />
            </div>
            <PhotoCapture photos={photos} onChange={setPhotos} />
          </div>
        </div>
      </div>

      <StickyActionBar
        onSave={handleSave}
        onDownload={handleDownload}
        isSaving={isSaving}
        isGenerating={isGenerating}
        saveStatus={saveStatus}
        downloadLabel="Download Certificate"
      />
    </main>
  );
}

export default function EmergencyLightingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
      </div>
    }>
      <EmergencyLightingPageContent />
    </Suspense>
  );
}
