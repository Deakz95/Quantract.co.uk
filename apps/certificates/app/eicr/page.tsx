"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type EICRCertificate } from "../../lib/certificate-types";
import { generateCertificatePDF } from "../../lib/pdf-generator";

export default function EICRPage() {
  const [data, setData] = useState<EICRCertificate>(getCertificateTemplate("EICR") as EICRCertificate);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateOverview = (field: keyof EICRCertificate["overview"], value: string) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));
  };

  const updateSupply = (field: keyof EICRCertificate["supplyCharacteristics"], value: string) => {
    setData((prev) => ({
      ...prev,
      supplyCharacteristics: { ...prev.supplyCharacteristics, [field]: value },
    }));
  };

  const updateEarthing = (field: keyof EICRCertificate["earthingArrangements"], value: any) => {
    setData((prev) => ({
      ...prev,
      earthingArrangements: { ...prev.earthingArrangements, [field]: value },
    }));
  };

  const updateTests = (field: keyof EICRCertificate["testResults"], value: any) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
    }));
  };

  const addObservation = () => {
    setData((prev) => ({
      ...prev,
      observations: [...prev.observations, { code: "", observation: "", recommendation: "", location: "" }],
    }));
  };

  const updateObservation = (index: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      observations: prev.observations.map((obs, i) =>
        i === index ? { ...obs, [field]: value } : obs
      ),
    }));
  };

  const removeObservation = (index: number) => {
    setData((prev) => ({
      ...prev,
      observations: prev.observations.filter((_, i) => i !== index),
    }));
  };

  const handleDownload = async () => {
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
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Electrical Installation Condition Report</h1>
              <p className="text-xs text-[var(--muted-foreground)]">BS 7671 • EICR</p>
            </div>
          </div>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
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
                <Label htmlFor="externalLoopImpedance">External Ze (Ω)</Label>
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
                <Label htmlFor="earthingConductorSize">Earthing Conductor Size (mm²)</Label>
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
                <Label htmlFor="mainProtectiveBondingSize">Main Bonding Size (mm²)</Label>
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
                <Label htmlFor="continuityOfProtectiveConductors">Continuity R1+R2 (Ω)</Label>
                <Input
                  id="continuityOfProtectiveConductors"
                  value={data.testResults.continuityOfProtectiveConductors}
                  onChange={(e) => updateTests("continuityOfProtectiveConductors", e.target.value)}
                  placeholder="e.g. 0.25"
                />
              </div>
              <div>
                <Label htmlFor="insulationResistance">Insulation Resistance (MΩ)</Label>
                <Input
                  id="insulationResistance"
                  value={data.testResults.insulationResistance}
                  onChange={(e) => updateTests("insulationResistance", e.target.value)}
                  placeholder="e.g. >200"
                />
              </div>
              <div>
                <Label htmlFor="earthFaultLoopImpedance">Zs (Ω)</Label>
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
                className="w-5 h-5 rounded"
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
                  onChange={(e) => setData((prev) => ({ ...prev, overallCondition: e.target.value as any }))}
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

        {/* Download Button */}
        <div className="flex justify-end gap-4 pt-4">
          <Link href="/">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button onClick={handleDownload} disabled={isGenerating} size="lg">
            {isGenerating ? "Generating PDF..." : "Download Report"}
          </Button>
        </div>
      </div>
    </main>
  );
}
