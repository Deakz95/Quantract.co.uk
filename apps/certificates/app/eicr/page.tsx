"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type EICRCertificate } from "../../lib/certificate-types";
import { generateCertificatePDF } from "../../lib/pdf-generator";
import BoardViewer, { type BoardData, type Circuit } from "../../components/BoardViewer";
import {
  useCertificateStore,
  useStoreHydration,
  createNewCertificate,
  generateCertificateNumber,
} from "../../lib/certificateStore";

// Example board data - in production this would come from form input
const EXAMPLE_BOARD: BoardData = {
  id: "db1",
  name: "DB 1 - Main Consumer Unit",
  description: "Hager 12-Way Split Load | 100A Main Switch | 2x 63A RCDs",
  type: "single-phase",
  mainSwitch: { rating: "100A", type: "Switch" },
  circuits: [
    { id: "c1", num: 1, description: "Cooker", type: "B", rating: "32A", bsen: "60898", cableMm2: "6.0", cpcMm2: "2.5", maxZs: "1.37", zs: "0.42", r1r2: "0.28", r2: "0.14", insMohm: ">200", rcdMa: "30", rcdMs: "18", status: "pass" },
    { id: "c2", num: 2, description: "Shower", type: "B", rating: "32A", bsen: "60898", cableMm2: "6.0", cpcMm2: "2.5", maxZs: "1.37", zs: "0.38", r1r2: "0.25", r2: "0.12", insMohm: ">200", rcdMa: "30", rcdMs: "22", status: "pass" },
    { id: "c3", num: 3, description: "Ring 1 (GF)", type: "B", rating: "32A", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "1.37", zs: "0.65", r1r2: "0.41", r2: "0.24", insMohm: ">200", rcdMa: "30", rcdMs: "24", status: "pass" },
    { id: "c4", num: 4, description: "Ring 2 (FF)", type: "B", rating: "32A", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "1.37", zs: "0.72", r1r2: "0.48", r2: "0.28", insMohm: ">200", rcdMa: "30", rcdMs: "21", status: "pass" },
    { id: "c5", num: 5, description: "Immersion", type: "B", rating: "16A", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "2.73", zs: "0.85", r1r2: "0.52", r2: "0.31", insMohm: ">200", status: "pass" },
    { id: "c6", num: 6, description: "Lights GF", type: "B", rating: "6A", bsen: "60898", cableMm2: "1.5", cpcMm2: "1.0", maxZs: "7.28", zs: "1.12", r1r2: "0.68", r2: "0.44", insMohm: ">200", status: "pass" },
    { id: "c7", num: 7, description: "Lights FF", type: "B", rating: "6A", bsen: "60898", cableMm2: "1.5", cpcMm2: "1.0", maxZs: "7.28", zs: "1.45", r1r2: "0.92", r2: "0.58", insMohm: "185", status: "warning", code: "C3" },
    { id: "c8", num: 8, description: "Smoke Det", type: "B", rating: "6A", bsen: "60898", cableMm2: "1.5", cpcMm2: "1.0", maxZs: "7.28", zs: "2.35", r1r2: "1.85", r2: "1.12", insMohm: "45", status: "fail", code: "C2" },
    { id: "c9", num: 9, description: "Garage", type: "B", rating: "20A", bsen: "60898", cableMm2: "4.0", cpcMm2: "2.5", maxZs: "2.19", zs: "0.95", r1r2: "0.62", r2: "0.38", insMohm: ">200", rcdMa: "30", rcdMs: "19", status: "pass" },
    { id: "c10", num: 10, description: "Spare", type: "-", rating: "-", status: "untested", isEmpty: true },
    { id: "c11", num: 11, description: "Spare", type: "-", rating: "-", status: "untested", isEmpty: true },
    { id: "c12", num: 12, description: "Spare", type: "-", rating: "-", status: "untested", isEmpty: true },
  ],
};

const EXAMPLE_3PHASE_BOARD: BoardData = {
  id: "db2",
  name: "DB 2 - 3-Phase Distribution Board",
  description: "Schneider Acti9 24-Way TP&N | 125A Triple Pole Isolator | 400V",
  type: "three-phase",
  mainSwitch: { rating: "125A", type: "TP&N Isolator" },
  circuits: [
    // L1 circuits
    { id: "3p-1", num: 1, description: "Sockets A", type: "C", rating: "32A", phase: "L1", bsen: "60898", cableMm2: "4.0", cpcMm2: "2.5", maxZs: "0.92", zs: "0.38", r1r2: "0.22", insMohm: ">200", rcdMa: "30", rcdMs: "18", status: "pass" },
    { id: "3p-2", num: 2, description: "Lights 1", type: "B", rating: "20A", phase: "L1", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "2.19", zs: "0.85", r1r2: "0.52", insMohm: ">200", status: "pass" },
    { id: "3p-3", num: 3, description: "AC Unit 1", type: "C", rating: "16A", phase: "L1", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "1.37", zs: "0.52", r1r2: "0.31", insMohm: ">200", status: "pass" },
    { id: "3p-4", num: 4, description: "Emergency", type: "B", rating: "10A", phase: "L1", bsen: "60898", cableMm2: "1.5", cpcMm2: "1.0", maxZs: "4.36", zs: "1.85", r1r2: "1.42", insMohm: "165", status: "warning", code: "C3" },
    { id: "3p-5", num: 5, description: "Fire Alarm", type: "B", rating: "6A", phase: "L1", bsen: "60898", cableMm2: "1.5", cpcMm2: "1.0", maxZs: "7.28", zs: "0.95", r1r2: "0.62", insMohm: ">200", status: "pass" },
    { id: "3p-6", num: 6, description: "Spare", type: "-", rating: "-", phase: "L1", status: "untested", isEmpty: true },
    // L2 circuits
    { id: "3p-7", num: 7, description: "Sockets B", type: "C", rating: "32A", phase: "L2", bsen: "60898", cableMm2: "4.0", cpcMm2: "2.5", maxZs: "0.92", zs: "0.41", r1r2: "0.25", insMohm: ">200", rcdMa: "30", rcdMs: "21", status: "pass" },
    { id: "3p-8", num: 8, description: "Lights 2", type: "B", rating: "20A", phase: "L2", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "2.19", zs: "0.92", r1r2: "0.58", insMohm: ">200", status: "pass" },
    { id: "3p-9", num: 9, description: "AC Unit 2", type: "C", rating: "16A", phase: "L2", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "1.37", zs: "1.65", r1r2: "1.28", insMohm: "85", status: "fail", code: "C2" },
    { id: "3p-10", num: 10, description: "Security", type: "B", rating: "10A", phase: "L2", bsen: "60898", cableMm2: "1.5", cpcMm2: "1.0", maxZs: "4.36", zs: "0.95", r1r2: "0.62", insMohm: ">200", status: "pass" },
    { id: "3p-11", num: 11, description: "Water Htr", type: "C", rating: "32A", phase: "L2", bsen: "60898", cableMm2: "6.0", cpcMm2: "2.5", maxZs: "0.92", zs: "0.45", r1r2: "0.28", insMohm: ">200", status: "pass" },
    { id: "3p-12", num: 12, description: "Kitchen", type: "B", rating: "20A", phase: "L2", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "2.19", zs: "0.78", r1r2: "0.45", insMohm: ">200", status: "pass" },
    // L3 circuits
    { id: "3p-13", num: 13, description: "Sockets C", type: "C", rating: "32A", phase: "L3", bsen: "60898", cableMm2: "4.0", cpcMm2: "2.5", maxZs: "0.92", zs: "0.35", r1r2: "0.19", insMohm: ">200", rcdMa: "30", rcdMs: "19", status: "pass" },
    { id: "3p-14", num: 14, description: "Lights 3", type: "B", rating: "20A", phase: "L3", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "2.19", zs: "0.78", r1r2: "0.45", insMohm: ">200", status: "pass" },
    { id: "3p-15", num: 15, description: "AC Unit 3", type: "C", rating: "16A", phase: "L3", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "1.37", zs: "0.48", r1r2: "0.28", insMohm: ">200", status: "pass" },
    { id: "3p-16", num: 16, description: "Server Rm", type: "C", rating: "16A", phase: "L3", bsen: "60898", cableMm2: "2.5", cpcMm2: "1.5", maxZs: "1.37", zs: "0.42", r1r2: "0.25", insMohm: ">200", rcdMa: "30", rcdMs: "16", status: "pass" },
    { id: "3p-17", num: 17, description: "CCTV", type: "B", rating: "6A", phase: "L3", bsen: "60898", cableMm2: "1.5", cpcMm2: "1.0", maxZs: "7.28", zs: "0.88", r1r2: "0.55", insMohm: ">200", status: "pass" },
    { id: "3p-18", num: 18, description: "Spare", type: "-", rating: "-", phase: "L3", status: "untested", isEmpty: true },
    // TPN circuits
    { id: "tpn-1", num: "TP1", description: "Compressor", type: "C", rating: "63A", phase: "TPN", bsen: "60898", cableMm2: "16.0", cpcMm2: "6.0", maxZs: "0.47", zs: "0.18", r1r2: "0.09", insMohm: ">200", status: "pass" },
    { id: "tpn-2", num: "TP2", description: "Motor 1", type: "D", rating: "32A", phase: "TPN", bsen: "60898", cableMm2: "6.0", cpcMm2: "4.0", maxZs: "0.46", zs: "0.22", r1r2: "0.12", insMohm: ">200", status: "pass" },
    { id: "tpn-3", num: "TP3", description: "Motor 2", type: "D", rating: "32A", phase: "TPN", bsen: "60898", cableMm2: "6.0", cpcMm2: "4.0", maxZs: "0.46", zs: "0.25", r1r2: "0.14", insMohm: ">200", status: "pass" },
    { id: "tpn-4", num: "TP4", description: "Sub-DB", type: "C", rating: "40A", phase: "TPN", bsen: "60898", cableMm2: "10.0", cpcMm2: "6.0", maxZs: "0.73", zs: "0.28", r1r2: "0.15", insMohm: ">200", status: "pass" },
  ],
};

function EICRPageContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get("id");
  const hydrated = useStoreHydration();

  const { addCertificate, updateCertificate, getCertificate } = useCertificateStore();

  const [data, setData] = useState<EICRCertificate>(getCertificateTemplate("EICR") as EICRCertificate);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentCertId, setCurrentCertId] = useState<string | null>(certificateId);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTab, setActiveTab] = useState<"details" | "boards">("boards");
  const [boards, setBoards] = useState<BoardData[]>([EXAMPLE_BOARD, EXAMPLE_3PHASE_BOARD]);

  // Load existing certificate if ID is provided (only after hydration)
  useEffect(() => {
    if (hydrated && certificateId) {
      const existing = getCertificate(certificateId);
      if (existing && existing.data) {
        setData(existing.data as EICRCertificate);
        setCurrentCertId(certificateId);
        setLastSaved(new Date(existing.updated_at));
      }
    }
  }, [certificateId, getCertificate, hydrated]);

  const updateOverview = (field: keyof EICRCertificate["overview"], value: string) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateSupply = (field: keyof EICRCertificate["supplyCharacteristics"], value: string) => {
    setData((prev) => ({
      ...prev,
      supplyCharacteristics: { ...prev.supplyCharacteristics, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateEarthing = (field: keyof EICRCertificate["earthingArrangements"], value: string) => {
    setData((prev) => ({
      ...prev,
      earthingArrangements: { ...prev.earthingArrangements, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateTests = (field: keyof EICRCertificate["testResults"], value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const addObservation = () => {
    setData((prev) => ({
      ...prev,
      observations: [...prev.observations, { code: "", observation: "", recommendation: "", location: "" }],
    }));
    setSaveStatus("idle");
  };

  const updateObservation = (index: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      observations: prev.observations.map((obs, i) =>
        i === index ? { ...obs, [field]: value } : obs
      ),
    }));
    setSaveStatus("idle");
  };

  const removeObservation = (index: number) => {
    setData((prev) => ({
      ...prev,
      observations: prev.observations.filter((_, i) => i !== index),
    }));
    setSaveStatus("idle");
  };

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
        const newCert = createNewCertificate("EICR", data as unknown as Record<string, unknown>);
        newCert.client_name = data.overview.clientName;
        newCert.installation_address = data.overview.installationAddress;
        newCert.certificate_number = data.overview.jobReference || generateCertificateNumber("EICR");
        addCertificate(newCert);
        setCurrentCertId(newCert.id);
        window.history.replaceState({}, "", `/eicr?id=${newCert.id}`);
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
      const pdfBytes = await generateCertificatePDF(data);
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EICR-${data.overview.jobReference || "certificate"}.pdf`;
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
              <h1 className="text-xl font-bold">Electrical Installation Condition Report</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                BS 7671:2018+A2:2022 | EICR
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

      {/* Tab Navigation */}
      <div className="max-w-[1600px] mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-[var(--muted)] p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("boards")}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeTab === "boards"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Distribution Boards
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
              activeTab === "details"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            Certificate Details
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Save Status Banner */}
        {!currentCertId && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>This report is not saved yet. Click &quot;Save&quot; to store it locally.</span>
          </div>
        )}

        {/* Boards Tab */}
        {activeTab === "boards" && (
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Distribution Boards</h2>
                <p className="text-[var(--muted-foreground)]">Visual and table views of circuit schedules and test results</p>
              </div>
              <Button variant="secondary">+ Add Board</Button>
            </div>

            {boards.map((board) => (
              <BoardViewer key={board.id} board={board} />
            ))}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="max-w-[900px] flex flex-col gap-6">
            {/* Overview Section */}
            <Card>
              <CardHeader>
                <CardTitle>Installation Details</CardTitle>
                <CardDescription>Basic information about the installation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jobReference">Report Reference</Label>
                    <Input
                      id="jobReference"
                      value={data.overview.jobReference}
                      onChange={(e) => updateOverview("jobReference", e.target.value)}
                      placeholder="e.g. EICR-2024-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfInspection">Date of Inspection</Label>
                    <Input
                      id="dateOfInspection"
                      type="date"
                      value={data.overview.dateOfInspection}
                      onChange={(e) => updateOverview("dateOfInspection", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
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
                    <Label htmlFor="occupier">Occupier</Label>
                    <Input
                      id="occupier"
                      value={data.overview.occupier}
                      onChange={(e) => updateOverview("occupier", e.target.value)}
                      placeholder="Occupier name (if different)"
                    />
                  </div>
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
                <div>
                  <Label htmlFor="jobDescription">Purpose of Report</Label>
                  <Input
                    id="jobDescription"
                    value={data.overview.jobDescription}
                    onChange={(e) => updateOverview("jobDescription", e.target.value)}
                    placeholder="e.g. Periodic inspection, Change of tenancy"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Supply Characteristics */}
            <Card>
              <CardHeader>
                <CardTitle>Supply Characteristics</CardTitle>
                <CardDescription>Details of the electrical supply</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="systemType">System Type</Label>
                    <NativeSelect
                      id="systemType"
                      value={data.supplyCharacteristics.systemType}
                      onChange={(e) => updateSupply("systemType", e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="TN-C-S">TN-C-S (PME)</option>
                      <option value="TN-S">TN-S</option>
                      <option value="TT">TT</option>
                      <option value="IT">IT</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="supplyVoltage">Supply Voltage (V)</Label>
                    <Input
                      id="supplyVoltage"
                      value={data.supplyCharacteristics.supplyVoltage}
                      onChange={(e) => updateSupply("supplyVoltage", e.target.value)}
                      placeholder="230"
                    />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequency (Hz)</Label>
                    <Input
                      id="frequency"
                      value={data.supplyCharacteristics.frequency}
                      onChange={(e) => updateSupply("frequency", e.target.value)}
                      placeholder="50"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prospectiveFaultCurrent">Prospective Fault Current (kA)</Label>
                    <Input
                      id="prospectiveFaultCurrent"
                      value={data.supplyCharacteristics.prospectiveFaultCurrent}
                      onChange={(e) => updateSupply("prospectiveFaultCurrent", e.target.value)}
                      placeholder="e.g. 16"
                    />
                  </div>
                  <div>
                    <Label htmlFor="externalLoopImpedance">External Ze (Ohm)</Label>
                    <Input
                      id="externalLoopImpedance"
                      value={data.supplyCharacteristics.externalLoopImpedance}
                      onChange={(e) => updateSupply("externalLoopImpedance", e.target.value)}
                      placeholder="e.g. 0.35"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Earthing Arrangements */}
            <Card>
              <CardHeader>
                <CardTitle>Earthing Arrangements</CardTitle>
                <CardDescription>Details of earthing and bonding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="earthingConductorType">Earthing Conductor Type</Label>
                    <Input
                      id="earthingConductorType"
                      value={data.earthingArrangements.earthingConductorType}
                      onChange={(e) => updateEarthing("earthingConductorType", e.target.value)}
                      placeholder="e.g. Copper"
                    />
                  </div>
                  <div>
                    <Label htmlFor="earthingConductorSize">Earthing Conductor Size (mm2)</Label>
                    <Input
                      id="earthingConductorSize"
                      value={data.earthingArrangements.earthingConductorSize}
                      onChange={(e) => updateEarthing("earthingConductorSize", e.target.value)}
                      placeholder="e.g. 16"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mainProtectiveBondingType">Main Bonding Type</Label>
                    <Input
                      id="mainProtectiveBondingType"
                      value={data.earthingArrangements.mainProtectiveBondingType}
                      onChange={(e) => updateEarthing("mainProtectiveBondingType", e.target.value)}
                      placeholder="e.g. Copper"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mainProtectiveBondingSize">Main Bonding Size (mm2)</Label>
                    <Input
                      id="mainProtectiveBondingSize"
                      value={data.earthingArrangements.mainProtectiveBondingSize}
                      onChange={(e) => updateEarthing("mainProtectiveBondingSize", e.target.value)}
                      placeholder="e.g. 10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Results */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results Summary</CardTitle>
                <CardDescription>Key test measurements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="continuityOfProtectiveConductors">Continuity R1+R2 (Ohm)</Label>
                    <Input
                      id="continuityOfProtectiveConductors"
                      value={data.testResults.continuityOfProtectiveConductors}
                      onChange={(e) => updateTests("continuityOfProtectiveConductors", e.target.value)}
                      placeholder="e.g. 0.25"
                    />
                  </div>
                  <div>
                    <Label htmlFor="insulationResistance">Insulation Resistance (MOhm)</Label>
                    <Input
                      id="insulationResistance"
                      value={data.testResults.insulationResistance}
                      onChange={(e) => updateTests("insulationResistance", e.target.value)}
                      placeholder="e.g. >200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="earthFaultLoopImpedance">Zs (Ohm)</Label>
                    <Input
                      id="earthFaultLoopImpedance"
                      value={data.testResults.earthFaultLoopImpedance}
                      onChange={(e) => updateTests("earthFaultLoopImpedance", e.target.value)}
                      placeholder="e.g. 0.45"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rcdOperatingTime">RCD Operating Time (ms)</Label>
                    <Input
                      id="rcdOperatingTime"
                      value={data.testResults.rcdOperatingTime}
                      onChange={(e) => updateTests("rcdOperatingTime", e.target.value)}
                      placeholder="e.g. 25"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rcdOperatingCurrent">RCD Operating Current (mA)</Label>
                    <Input
                      id="rcdOperatingCurrent"
                      value={data.testResults.rcdOperatingCurrent}
                      onChange={(e) => updateTests("rcdOperatingCurrent", e.target.value)}
                      placeholder="e.g. 30"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="polarityConfirmed"
                    checked={data.testResults.polarityConfirmed}
                    onChange={(e) => updateTests("polarityConfirmed", e.target.checked)}
                    className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                  />
                  <Label htmlFor="polarityConfirmed" className="mb-0">Polarity confirmed</Label>
                </div>
              </CardContent>
            </Card>

            {/* Observations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Observations</CardTitle>
                    <CardDescription>Record any defects or observations (C1, C2, C3, FI codes)</CardDescription>
                  </div>
                  <Button variant="secondary" size="sm" onClick={addObservation}>
                    Add Observation
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.observations.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No observations recorded. Click &quot;Add Observation&quot; to add one.</p>
                ) : (
                  data.observations.map((obs, index) => (
                    <div key={index} className="p-4 border border-[var(--border)] rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Observation {index + 1}</span>
                        <button
                          onClick={() => removeObservation(index)}
                          className="text-[var(--error)] text-sm hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid md:grid-cols-4 gap-3">
                        <div>
                          <Label>Code</Label>
                          <NativeSelect
                            value={obs.code}
                            onChange={(e) => updateObservation(index, "code", e.target.value)}
                          >
                            <option value="">Select...</option>
                            <option value="C1">C1 - Danger present</option>
                            <option value="C2">C2 - Potentially dangerous</option>
                            <option value="C3">C3 - Improvement recommended</option>
                            <option value="FI">FI - Further investigation</option>
                          </NativeSelect>
                        </div>
                        <div className="md:col-span-3">
                          <Label>Location</Label>
                          <Input
                            value={obs.location}
                            onChange={(e) => updateObservation(index, "location", e.target.value)}
                            placeholder="Location of defect"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Observation</Label>
                        <Input
                          value={obs.observation}
                          onChange={(e) => updateObservation(index, "observation", e.target.value)}
                          placeholder="Describe the observation"
                        />
                      </div>
                      <div>
                        <Label>Recommendation</Label>
                        <Input
                          value={obs.recommendation}
                          onChange={(e) => updateObservation(index, "recommendation", e.target.value)}
                          placeholder="Recommended action"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Overall Condition */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Assessment</CardTitle>
                <CardDescription>Overall condition of the installation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="overallCondition">Overall Condition</Label>
                    <NativeSelect
                      id="overallCondition"
                      value={data.overallCondition}
                      onChange={(e) => setData((prev) => ({ ...prev, overallCondition: e.target.value as "satisfactory" | "unsatisfactory" | "" }))}
                    >
                      <option value="">Select...</option>
                      <option value="satisfactory">Satisfactory</option>
                      <option value="unsatisfactory">Unsatisfactory</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="recommendedRetestDate">Recommended Retest Date</Label>
                    <Input
                      id="recommendedRetestDate"
                      type="date"
                      value={data.recommendedRetestDate}
                      onChange={(e) => setData((prev) => ({ ...prev, recommendedRetestDate: e.target.value }))}
                    />
                  </div>
                </div>
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
                <Button variant="secondary" onClick={handleSave} disabled={isSaving}>
                  {saveStatus === "saving" ? "Saving..." : "Save"}
                </Button>
                <Button onClick={handleDownload} disabled={isGenerating} size="lg">
                  {isGenerating ? "Generating PDF..." : "Download Report"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function EICRPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
      </div>
    }>
      <EICRPageContent />
    </Suspense>
  );
}
