"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type EICCertificate } from "../../lib/certificate-types";
import { generateCertificatePDF } from "../../lib/pdf-generator";

export default function EICPage() {
  const [data, setData] = useState<EICCertificate>(getCertificateTemplate("EIC") as EICCertificate);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateOverview = (field: keyof EICCertificate["overview"], value: string) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));
  };

  const updateSupply = (field: keyof EICCertificate["supplyCharacteristics"], value: string) => {
    setData((prev) => ({
      ...prev,
      supplyCharacteristics: { ...prev.supplyCharacteristics, [field]: value },
    }));
  };

  const updateEarthing = (field: keyof EICCertificate["earthingArrangements"], value: any) => {
    setData((prev) => ({
      ...prev,
      earthingArrangements: { ...prev.earthingArrangements, [field]: value },
    }));
  };

  const updateTests = (field: keyof EICCertificate["testResults"], value: any) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
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
      a.download = `EIC-${data.overview.jobReference || "certificate"}.pdf`;
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
              <h1 className="text-xl font-bold">Electrical Installation Certificate</h1>
              <p className="text-xs text-[var(--muted-foreground)]">BS 7671 • EIC</p>
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
                <Label htmlFor="jobReference">Job Reference</Label>
                <Input
                  id="jobReference"
                  value={data.overview.jobReference}
                  onChange={(e) => updateOverview("jobReference", e.target.value)}
                  placeholder="e.g. JOB-2024-001"
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
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={data.overview.siteName}
                onChange={(e) => updateOverview("siteName", e.target.value)}
                placeholder="Site or property name"
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
            <div>
              <Label htmlFor="jobDescription">Description of Work</Label>
              <Textarea
                id="jobDescription"
                value={data.overview.jobDescription}
                onChange={(e) => updateOverview("jobDescription", e.target.value)}
                placeholder="Describe the work carried out"
                className="min-h-[80px]"
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
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplyProtectiveDevice">Supply Protective Device</Label>
                <Input
                  id="supplyProtectiveDevice"
                  value={data.supplyCharacteristics.supplyProtectiveDevice}
                  onChange={(e) => updateSupply("supplyProtectiveDevice", e.target.value)}
                  placeholder="e.g. BS 88 Fuse"
                />
              </div>
              <div>
                <Label htmlFor="ratedCurrent">Rated Current (A)</Label>
                <Input
                  id="ratedCurrent"
                  value={data.supplyCharacteristics.ratedCurrent}
                  onChange={(e) => updateSupply("ratedCurrent", e.target.value)}
                  placeholder="e.g. 100"
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
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="earthElectrode"
                checked={data.earthingArrangements.earthElectrode}
                onChange={(e) => updateEarthing("earthElectrode", e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <Label htmlFor="earthElectrode" className="mb-0">Earth electrode installed</Label>
            </div>
            {data.earthingArrangements.earthElectrode && (
              <div>
                <Label htmlFor="earthElectrodeResistance">Earth Electrode Resistance (Ω)</Label>
                <Input
                  id="earthElectrodeResistance"
                  value={data.earthingArrangements.earthElectrodeResistance}
                  onChange={(e) => updateEarthing("earthElectrodeResistance", e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>
            )}
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
            <CardTitle>Observations & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={data.observations}
              onChange={(e) => setData((prev) => ({ ...prev, observations: e.target.value }))}
              placeholder="Enter any observations or recommendations..."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Download Button */}
        <div className="flex justify-end gap-4 pt-4">
          <Link href="/">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button onClick={handleDownload} disabled={isGenerating} size="lg">
            {isGenerating ? "Generating PDF..." : "Download Certificate"}
          </Button>
        </div>
      </div>
    </main>
  );
}
