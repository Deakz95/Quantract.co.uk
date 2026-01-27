"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type MWCCertificate } from "../../lib/certificate-types";
import { generateCertificatePDF } from "../../lib/pdf-generator";
import {
  useCertificateStore,
  useStoreHydration,
  createNewCertificate,
  generateCertificateNumber,
} from "../../lib/certificateStore";

function MWCPageContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get("id");
  const hydrated = useStoreHydration();

  const { addCertificate, updateCertificate, getCertificate } = useCertificateStore();

  const [data, setData] = useState<MWCCertificate>(getCertificateTemplate("MWC") as MWCCertificate);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentCertId, setCurrentCertId] = useState<string | null>(certificateId);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Load existing certificate if ID is provided (only after hydration)
  useEffect(() => {
    if (hydrated && certificateId) {
      const existing = getCertificate(certificateId);
      if (existing && existing.data) {
        setData(existing.data as MWCCertificate);
        setCurrentCertId(certificateId);
        setLastSaved(new Date(existing.updated_at));
      }
    }
  }, [certificateId, getCertificate, hydrated]);

  // Show loading state until hydrated
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--muted-foreground)]">Loading certificate...</p>
        </div>
      </div>
    );
  }

  const updateOverview = (field: keyof MWCCertificate["overview"], value: string) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateCircuit = (field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      circuitDetails: { ...prev.circuitDetails, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateTests = (field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("saving");

    try {
      if (currentCertId) {
        // Update existing certificate
        updateCertificate(currentCertId, {
          client_name: data.overview.clientName,
          installation_address: data.overview.installationAddress,
          data: data as unknown as Record<string, unknown>,
        });
      } else {
        // Create new certificate
        const newCert = createNewCertificate("MWC", data as unknown as Record<string, unknown>);
        newCert.client_name = data.overview.clientName;
        newCert.installation_address = data.overview.installationAddress;
        newCert.certificate_number = data.overview.jobReference || generateCertificateNumber("MWC");
        addCertificate(newCert);
        setCurrentCertId(newCert.id);
        // Update URL without navigation
        window.history.replaceState({}, "", `/mwc?id=${newCert.id}`);
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
    // Auto-save before download
    await handleSave();

    setIsGenerating(true);
    try {
      const pdfBytes = await generateCertificatePDF(data);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MWC-${data.overview.jobReference || "certificate"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Update status to issued after download
      if (currentCertId) {
        updateCertificate(currentCertId, { status: "issued" });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkComplete = () => {
    if (currentCertId) {
      updateCertificate(currentCertId, { status: "complete" });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } else {
      handleSave();
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Minor Electrical Installation Works Certificate</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                BS 7671 • MWC
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

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Save Status Banner */}
        {!currentCertId && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>This certificate is not saved yet. Click &quot;Save&quot; to store it locally.</span>
          </div>
        )}

        {/* Overview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Installation Details</CardTitle>
            <CardDescription>Basic information about the work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jobReference">Job Reference</Label>
                <Input
                  id="jobReference"
                  value={data.overview.jobReference}
                  onChange={(e) => updateOverview("jobReference", e.target.value)}
                  placeholder="e.g. MWC-2024-001"
                />
              </div>
              <div>
                <Label htmlFor="dateOfInspection">Date of Work</Label>
                <Input
                  id="dateOfInspection"
                  type="date"
                  value={data.overview.dateOfInspection}
                  onChange={(e) => updateOverview("dateOfInspection", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={data.overview.clientName}
                onChange={(e) => updateOverview("clientName", e.target.value)}
                placeholder="Client or company name"
              />
            </div>
            <div>
              <Label htmlFor="installationAddress">Installation Address</Label>
              <Textarea
                id="installationAddress"
                value={data.overview.installationAddress}
                onChange={(e) => updateOverview("installationAddress", e.target.value)}
                placeholder="Full address of the installation"
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Description */}
        <Card>
          <CardHeader>
            <CardTitle>Work Carried Out</CardTitle>
            <CardDescription>Description of the minor works</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.workDescription}
              onChange={(e) => {
                setData((prev) => ({ ...prev, workDescription: e.target.value }));
                setSaveStatus("idle");
              }}
              placeholder="Describe the work carried out, e.g. Installation of additional socket outlet, replacement of light fitting..."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Circuit Details */}
        <Card>
          <CardHeader>
            <CardTitle>Circuit Details</CardTitle>
            <CardDescription>Details of the circuit affected</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="circuitAffected">Circuit Affected</Label>
                <Input
                  id="circuitAffected"
                  value={data.circuitDetails?.circuitAffected || ""}
                  onChange={(e) => updateCircuit("circuitAffected", e.target.value)}
                  placeholder="e.g. Ring final circuit, Lighting circuit"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={data.circuitDetails?.location || ""}
                  onChange={(e) => updateCircuit("location", e.target.value)}
                  placeholder="e.g. Kitchen, First floor"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="protectiveDevice">Protective Device</Label>
                <NativeSelect
                  id="protectiveDevice"
                  value={data.circuitDetails?.protectiveDevice || ""}
                  onChange={(e) => updateCircuit("protectiveDevice", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="MCB Type B">MCB Type B</option>
                  <option value="MCB Type C">MCB Type C</option>
                  <option value="RCBO Type A">RCBO Type A</option>
                  <option value="RCBO Type AC">RCBO Type AC</option>
                  <option value="Fuse BS 3036">Fuse BS 3036</option>
                  <option value="Fuse BS 1361">Fuse BS 1361</option>
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="rating">Rating (A)</Label>
                <NativeSelect
                  id="rating"
                  value={data.circuitDetails?.rating || ""}
                  onChange={(e) => updateCircuit("rating", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="6">6A</option>
                  <option value="10">10A</option>
                  <option value="16">16A</option>
                  <option value="20">20A</option>
                  <option value="32">32A</option>
                  <option value="40">40A</option>
                  <option value="45">45A</option>
                  <option value="50">50A</option>
                </NativeSelect>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Test measurements for the work carried out</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="continuity">Continuity of CPC (Ω)</Label>
                <Input
                  id="continuity"
                  value={data.testResults?.continuity || ""}
                  onChange={(e) => updateTests("continuity", e.target.value)}
                  placeholder="e.g. 0.25"
                />
              </div>
              <div>
                <Label htmlFor="insulationResistance">Insulation Resistance (MΩ)</Label>
                <Input
                  id="insulationResistance"
                  value={data.testResults?.insulationResistance || ""}
                  onChange={(e) => updateTests("insulationResistance", e.target.value)}
                  placeholder="e.g. >200"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="earthFaultLoopImpedance">Zs (Ω)</Label>
                <Input
                  id="earthFaultLoopImpedance"
                  value={data.testResults?.earthFaultLoopImpedance || ""}
                  onChange={(e) => updateTests("earthFaultLoopImpedance", e.target.value)}
                  placeholder="e.g. 0.45"
                />
              </div>
              <div>
                <Label htmlFor="rcdOperatingTime">RCD Operating Time (ms)</Label>
                <Input
                  id="rcdOperatingTime"
                  value={data.testResults?.rcdOperatingTime || ""}
                  onChange={(e) => updateTests("rcdOperatingTime", e.target.value)}
                  placeholder="e.g. 25"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="polarityConfirmed"
                checked={data.testResults?.polarityConfirmed || false}
                onChange={(e) => updateTests("polarityConfirmed", e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <Label htmlFor="polarityConfirmed" className="mb-0">Polarity confirmed</Label>
            </div>
          </CardContent>
        </Card>

        {/* Observations */}
        <Card>
          <CardHeader>
            <CardTitle>Observations</CardTitle>
            <CardDescription>Any observations or comments</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.observations}
              onChange={(e) => {
                setData((prev) => ({ ...prev, observations: e.target.value }));
                setSaveStatus("idle");
              }}
              placeholder="Enter any observations or comments about the work..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-[var(--border)]">
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">View All Certificates</Button>
            </Link>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleMarkComplete} disabled={isSaving}>
              Mark as Complete
            </Button>
            <Button onClick={handleDownload} disabled={isGenerating} size="lg">
              {isGenerating ? "Generating PDF..." : "Download Certificate"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function MWCPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
      </div>
    }>
      <MWCPageContent />
    </Suspense>
  );
}
