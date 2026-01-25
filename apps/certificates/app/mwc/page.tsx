"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type MWCCertificate } from "../../lib/certificate-types";
import { generateCertificatePDF } from "../../lib/pdf-generator";

export default function MWCPage() {
  const [data, setData] = useState<MWCCertificate>(getCertificateTemplate("MWC") as MWCCertificate);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateOverview = (field: keyof MWCCertificate["overview"], value: string) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));
  };

  const updateCircuit = (field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      circuitDetails: { ...prev.circuitDetails, [field]: value },
    }));
  };

  const updateTests = (field: string, value: any) => {
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
      a.download = `MWC-${data.overview.jobReference || "certificate"}.pdf`;
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
              <h1 className="text-xl font-bold">Minor Electrical Installation Works Certificate</h1>
              <p className="text-xs text-[var(--muted-foreground)]">BS 7671 • MWC</p>
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
              onChange={(e) => setData((prev) => ({ ...prev, workDescription: e.target.value }))}
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
              onChange={(e) => setData((prev) => ({ ...prev, observations: e.target.value }))}
              placeholder="Enter any observations or comments about the work..."
              className="min-h-[100px]"
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
