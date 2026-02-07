"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type MWCCertificate } from "@quantract/shared/certificate-types";
import { generateCertificatePDF } from "../../lib/pdf-generator";
import {
  useCertificateStore,
  useStoreHydration,
  createNewCertificate,
  generateCertificateNumber,
} from "../../lib/certificateStore";
import { StickyActionBar } from "../../components/StickyActionBar";
import { PhotoCapture } from "../../components/PhotoCapture";
import { ContractorDetails } from "../../components/ContractorDetails";
import { DeclarationSection } from "../../components/DeclarationSection";

type SectionId = "contractor" | "installation" | "work" | "circuit" | "tests" | "observations" | "declaration" | "nextInspection" | "photos";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "contractor", label: "1. Contractor Details" },
  { id: "installation", label: "2. Installation Details" },
  { id: "work", label: "3. Description of Work" },
  { id: "circuit", label: "4. Circuit Details" },
  { id: "tests", label: "5. Test Results" },
  { id: "observations", label: "6. Observations" },
  { id: "declaration", label: "7. Declaration" },
  { id: "nextInspection", label: "8. Next Inspection" },
  { id: "photos", label: "9. Site Photos" },
];

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
  const [activeSection, setActiveSection] = useState<SectionId>("contractor");
  const [engineerSig, setEngineerSig] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

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

  const updateOverview = (field: string, value: string | boolean) => {
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

  const updateTests = (field: string, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
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
        const newCert = createNewCertificate("MWC", data as unknown as Record<string, unknown>);
        newCert.client_name = data.overview.clientName;
        newCert.installation_address = data.overview.installationAddress;
        newCert.certificate_number = data.overview.jobReference || generateCertificateNumber("MWC");
        addCertificate(newCert);
        setCurrentCertId(newCert.id);
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
    await handleSave();

    setIsGenerating(true);
    try {
      const pdfBytes = await generateCertificatePDF(data, {
        engineerSignature: engineerSig,
        customerSignature: null,
        photos,
      });
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MWC-${data.overview.jobReference || "certificate"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

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

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Minor Electrical Installation Works Certificate</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                BS 7671:2018+A2:2022 | MWC
                {currentCertId && (
                  <span className="ml-2 text-[var(--primary)]">
                    {lastSaved ? `Last saved ${lastSaved.toLocaleTimeString()}` : "Not saved"}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleSave} disabled={isSaving} className="relative">
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              ) : "Save"}
            </Button>
            <Button onClick={handleDownload} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </div>
      </header>

      {/* Section Navigation */}
      <div className="max-w-[1600px] mx-auto px-6 pt-4">
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeSection === section.id
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Save Status Banner */}
        {!currentCertId && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>This certificate is not saved yet. Click &quot;Save&quot; to store it locally.</span>
          </div>
        )}

        {/* 1. Contractor Details */}
        {activeSection === "contractor" && (
          <div className="max-w-[900px]">
            <ContractorDetails
              data={data.contractorDetails}
              onChange={(contractorDetails) => {
                setData((prev) => ({ ...prev, contractorDetails }));
                setSaveStatus("idle");
              }}
            />
          </div>
        )}

        {/* 2. Installation Details */}
        {activeSection === "installation" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Installation Details</CardTitle>
                <CardDescription>Basic information about the installation and client</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jobReference">Certificate Reference</Label>
                    <Input id="jobReference" value={data.overview.jobReference} onChange={(e) => updateOverview("jobReference", e.target.value)} placeholder="e.g. MWC-2026-001" />
                  </div>
                  <div>
                    <Label htmlFor="dateOfInspection">Date of Work</Label>
                    <Input id="dateOfInspection" type="date" value={data.overview.dateOfInspection} onChange={(e) => updateOverview("dateOfInspection", e.target.value)} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input id="clientName" value={data.overview.clientName} onChange={(e) => updateOverview("clientName", e.target.value)} placeholder="Client or company name" />
                  </div>
                  <div>
                    <Label htmlFor="occupier">Occupier</Label>
                    <Input id="occupier" value={data.overview.occupier} onChange={(e) => updateOverview("occupier", e.target.value)} placeholder="Occupier name (if different from client)" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="installationAddress">Installation Address</Label>
                  <Textarea id="installationAddress" value={data.overview.installationAddress} onChange={(e) => updateOverview("installationAddress", e.target.value)} placeholder="Full address of the installation" className="min-h-[80px]" />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="descriptionOfPremises">Description of Premises</Label>
                    <NativeSelect id="descriptionOfPremises" value={data.overview.descriptionOfPremises} onChange={(e) => updateOverview("descriptionOfPremises", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="domestic">Domestic</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                      <option value="agricultural">Agricultural</option>
                      <option value="public">Public</option>
                      <option value="residential">Residential</option>
                      <option value="educational">Educational</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="other">Other</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="partOfInstallation">Part of Installation Covered</Label>
                    <Input id="partOfInstallation" value={data.partOfInstallation} onChange={(e) => { setData((prev) => ({ ...prev, partOfInstallation: e.target.value })); setSaveStatus("idle"); }} placeholder="e.g. Ground floor kitchen circuit" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 3. Description of Work */}
        {activeSection === "work" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Description of Minor Works</CardTitle>
                <CardDescription>Describe the work carried out and its extent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="extentOfWork">Extent of Work</Label>
                  <NativeSelect id="extentOfWork" value={data.extentOfWork} onChange={(e) => { setData((prev) => ({ ...prev, extentOfWork: e.target.value as MWCCertificate["extentOfWork"] })); setSaveStatus("idle"); }}>
                    <option value="">Select...</option>
                    <option value="addition_to_circuit">Addition to an existing circuit</option>
                    <option value="repair">Repair to an existing circuit</option>
                    <option value="replacement">Like-for-like replacement</option>
                    <option value="other">Other</option>
                  </NativeSelect>
                </div>
                <div>
                  <Label htmlFor="workDescription">Work Description</Label>
                  <Textarea
                    id="workDescription"
                    value={data.workDescription}
                    onChange={(e) => {
                      setData((prev) => ({ ...prev, workDescription: e.target.value }));
                      setSaveStatus("idle");
                    }}
                    placeholder="Describe the work carried out, e.g. Installation of additional socket outlet, replacement of light fitting..."
                    className="min-h-[150px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4. Circuit Details */}
        {activeSection === "circuit" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Circuit Details</CardTitle>
                <CardDescription>Details of the circuit affected by the minor works</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="circuitAffected">Circuit Affected</Label>
                    <Input id="circuitAffected" value={data.circuitDetails.circuitAffected} onChange={(e) => updateCircuit("circuitAffected", e.target.value)} placeholder="e.g. Ring final circuit, Lighting circuit" />
                  </div>
                  <div>
                    <Label htmlFor="circuitReference">Circuit Reference / Number</Label>
                    <Input id="circuitReference" value={data.circuitDetails.circuitReference} onChange={(e) => updateCircuit("circuitReference", e.target.value)} placeholder="e.g. Circuit 3, Ring 1" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={data.circuitDetails.location} onChange={(e) => updateCircuit("location", e.target.value)} placeholder="e.g. Kitchen, First floor" />
                  </div>
                  <div>
                    <Label htmlFor="meansOfProtection">Means of Protection</Label>
                    <NativeSelect id="meansOfProtection" value={data.circuitDetails.meansOfProtection} onChange={(e) => updateCircuit("meansOfProtection", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="MCB">MCB</option>
                      <option value="RCBO">RCBO</option>
                      <option value="Fuse_BS3036">Fuse BS 3036</option>
                      <option value="Fuse_BS1361">Fuse BS 1361</option>
                      <option value="Fuse_BS88">Fuse BS 88</option>
                      <option value="Other">Other</option>
                    </NativeSelect>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="protectiveDevice">Protective Device Type</Label>
                    <Input id="protectiveDevice" value={data.circuitDetails.protectiveDevice} onChange={(e) => updateCircuit("protectiveDevice", e.target.value)} placeholder="e.g. MCB Type B" />
                  </div>
                  <div>
                    <Label htmlFor="rating">Rating (A)</Label>
                    <NativeSelect id="rating" value={data.circuitDetails.rating} onChange={(e) => updateCircuit("rating", e.target.value)}>
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
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bsEnNumber">BS EN Number</Label>
                    <Input id="bsEnNumber" value={data.circuitDetails.bsEnNumber} onChange={(e) => updateCircuit("bsEnNumber", e.target.value)} placeholder="e.g. BS EN 60898" />
                  </div>
                  <div>
                    <Label htmlFor="cableReference">Cable Reference</Label>
                    <Input id="cableReference" value={data.circuitDetails.cableReference} onChange={(e) => updateCircuit("cableReference", e.target.value)} placeholder="e.g. 6242Y T&E" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cableCsaLive">Cable CSA - Live (mm2)</Label>
                    <Input id="cableCsaLive" value={data.circuitDetails.cableCsaLive} onChange={(e) => updateCircuit("cableCsaLive", e.target.value)} placeholder="e.g. 2.5" />
                  </div>
                  <div>
                    <Label htmlFor="cableCsaCpc">Cable CSA - CPC (mm2)</Label>
                    <Input id="cableCsaCpc" value={data.circuitDetails.cableCsaCpc} onChange={(e) => updateCircuit("cableCsaCpc", e.target.value)} placeholder="e.g. 1.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 5. Test Results */}
        {activeSection === "tests" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>Test measurements for the work carried out</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="continuity">Continuity of CPC R1+R2 (Ohm)</Label>
                    <Input id="continuity" value={data.testResults.continuity} onChange={(e) => updateTests("continuity", e.target.value)} placeholder="e.g. 0.25" />
                  </div>
                  <div>
                    <Label htmlFor="r2">R2 (Ohm)</Label>
                    <Input id="r2" value={data.testResults.r2} onChange={(e) => updateTests("r2", e.target.value)} placeholder="e.g. 0.15" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="insulationResistanceLE">Insulation Resistance L-E (MOhm)</Label>
                    <Input id="insulationResistanceLE" value={data.testResults.insulationResistanceLE} onChange={(e) => updateTests("insulationResistanceLE", e.target.value)} placeholder="e.g. >200" />
                  </div>
                  <div>
                    <Label htmlFor="insulationResistanceLN">Insulation Resistance L-N (MOhm)</Label>
                    <Input id="insulationResistanceLN" value={data.testResults.insulationResistanceLN} onChange={(e) => updateTests("insulationResistanceLN", e.target.value)} placeholder="e.g. >200" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="earthFaultLoopImpedance">Zs (Ohm)</Label>
                    <Input id="earthFaultLoopImpedance" value={data.testResults.earthFaultLoopImpedance} onChange={(e) => updateTests("earthFaultLoopImpedance", e.target.value)} placeholder="e.g. 0.45" />
                  </div>
                  <div>
                    <Label htmlFor="rcdOperatingTime">RCD Operating Time (ms)</Label>
                    <Input id="rcdOperatingTime" value={data.testResults.rcdOperatingTime} onChange={(e) => updateTests("rcdOperatingTime", e.target.value)} placeholder="e.g. 25" />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rcdOperatingCurrent">RCD Operating Current (mA)</Label>
                    <Input id="rcdOperatingCurrent" value={data.testResults.rcdOperatingCurrent} onChange={(e) => updateTests("rcdOperatingCurrent", e.target.value)} placeholder="e.g. 30" />
                  </div>
                  <div>
                    <Label htmlFor="rcdType">RCD Type</Label>
                    <NativeSelect id="rcdType" value={data.testResults.rcdType} onChange={(e) => updateTests("rcdType", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="AC">Type AC</option>
                      <option value="A">Type A</option>
                      <option value="B">Type B</option>
                      <option value="F">Type F</option>
                    </NativeSelect>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="polarityConfirmed" checked={data.testResults.polarityConfirmed} onChange={(e) => updateTests("polarityConfirmed", e.target.checked)} className="w-5 h-5 rounded accent-[var(--primary)]" />
                  <Label htmlFor="polarityConfirmed" className="mb-0">Polarity confirmed</Label>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="testButtonOperates" checked={data.testResults.testButtonOperates} onChange={(e) => updateTests("testButtonOperates", e.target.checked)} className="w-5 h-5 rounded accent-[var(--primary)]" />
                  <Label htmlFor="testButtonOperates" className="mb-0">RCD test button operates correctly</Label>
                </div>

                {/* Ring circuit fields - shown conditionally */}
                <div className="border border-[var(--border)] rounded-xl p-4 space-y-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Ring Final Circuit Tests (if applicable)</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="ringContinuityR1">Ring R1 (Ohm)</Label>
                      <Input id="ringContinuityR1" value={data.testResults.ringContinuityR1} onChange={(e) => updateTests("ringContinuityR1", e.target.value)} placeholder="e.g. 0.28" />
                    </div>
                    <div>
                      <Label htmlFor="ringContinuityRn">Ring Rn (Ohm)</Label>
                      <Input id="ringContinuityRn" value={data.testResults.ringContinuityRn} onChange={(e) => updateTests("ringContinuityRn", e.target.value)} placeholder="e.g. 0.30" />
                    </div>
                    <div>
                      <Label htmlFor="ringContinuityR2">Ring R2 (Ohm)</Label>
                      <Input id="ringContinuityR2" value={data.testResults.ringContinuityR2} onChange={(e) => updateTests("ringContinuityR2", e.target.value)} placeholder="e.g. 0.45" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 6. Observations */}
        {activeSection === "observations" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Observations</CardTitle>
                <CardDescription>Any observations or comments about the work</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.observations}
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, observations: e.target.value }));
                    setSaveStatus("idle");
                  }}
                  placeholder="Enter any observations or comments about the work carried out..."
                  className="min-h-[150px]"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 7. Declaration */}
        {activeSection === "declaration" && (
          <div className="max-w-[900px]">
            <DeclarationSection
              role="installer"
              data={data.declarationDetails}
              onChange={(declarationDetails) => {
                setData((prev) => ({ ...prev, declarationDetails }));
                setSaveStatus("idle");
              }}
              signatureValue={engineerSig}
              onSignatureChange={setEngineerSig}
            />
          </div>
        )}

        {/* 8. Next Inspection */}
        {activeSection === "nextInspection" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Next Inspection</CardTitle>
                <CardDescription>Recommended date for the next periodic inspection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="nextInspectionDate">Recommended Next Inspection Date</Label>
                  <Input id="nextInspectionDate" type="date" value={data.nextInspectionDate} onChange={(e) => { setData((prev) => ({ ...prev, nextInspectionDate: e.target.value })); setSaveStatus("idle"); }} />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  This should be consistent with the periodic inspection interval for the installation
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 9. Site Photos */}
        {activeSection === "photos" && (
          <div className="max-w-[1200px]">
            <Card>
              <CardHeader>
                <CardTitle>Site Photos</CardTitle>
                <CardDescription>Attach photos from the work</CardDescription>
              </CardHeader>
              <CardContent>
                <PhotoCapture photos={photos} onChange={setPhotos} />
              </CardContent>
            </Card>
          </div>
        )}
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
