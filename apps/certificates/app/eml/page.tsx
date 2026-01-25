"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type EmergencyLightingCertificate } from "../../lib/certificate-types";

export default function EmergencyLightingPage() {
  const [data, setData] = useState<EmergencyLightingCertificate>(getCertificateTemplate("EML") as EmergencyLightingCertificate);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateOverview = (field: keyof EmergencyLightingCertificate["overview"], value: string) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));
  };

  const updateSystemDetails = (field: keyof EmergencyLightingCertificate["systemDetails"], value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      systemDetails: { ...prev.systemDetails, [field]: value },
    }));
  };

  const updateTestResults = (field: keyof EmergencyLightingCertificate["testResults"], value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
    }));
  };

  const addLuminaire = () => {
    setData((prev) => ({
      ...prev,
      luminaires: [...prev.luminaires, { location: "", type: "", luminaireType: "", duration: "", status: "", notes: "" }],
    }));
  };

  const updateLuminaire = (index: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      luminaires: prev.luminaires.map((lum, i) =>
        i === index ? { ...lum, [field]: value } : lum
      ),
    }));
  };

  const removeLuminaire = (index: number) => {
    setData((prev) => ({
      ...prev,
      luminaires: prev.luminaires.filter((_, i) => i !== index),
    }));
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    // PDF generation would go here
    setTimeout(() => {
      alert("Emergency Lighting Certificate PDF generation coming soon!");
      setIsGenerating(false);
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
            <Link href="/" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Emergency Lighting Certificate</h1>
              <p className="text-xs text-[var(--muted-foreground)]">BS 5266 | Emergency Lighting</p>
            </div>
          </div>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Main Content */}
          <div className="flex flex-col gap-6">
            {/* Installation Details */}
            <Card>
              <CardHeader>
                <CardTitle>Installation Details</CardTitle>
                <CardDescription>Site and client information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jobReference">Certificate Reference</Label>
                    <Input
                      id="jobReference"
                      value={data.overview.jobReference}
                      onChange={(e) => updateOverview("jobReference", e.target.value)}
                      placeholder="e.g. EML-2024-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfInspection">Test Date</Label>
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
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={data.overview.siteName}
                      onChange={(e) => updateOverview("siteName", e.target.value)}
                      placeholder="Building or site name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="installationAddress">Site Address</Label>
                  <Textarea
                    id="installationAddress"
                    value={data.overview.installationAddress}
                    onChange={(e) => updateOverview("installationAddress", e.target.value)}
                    placeholder="Full address"
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* System Details */}
            <Card>
              <CardHeader>
                <CardTitle>System Details</CardTitle>
                <CardDescription>Emergency lighting configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="systemType">System Type</Label>
                    <NativeSelect
                      id="systemType"
                      value={data.systemDetails.systemType}
                      onChange={(e) => updateSystemDetails("systemType", e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="maintained">Maintained</option>
                      <option value="non-maintained">Non-Maintained</option>
                      <option value="sustained">Sustained</option>
                      <option value="combined">Combined</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="designDuration">Design Duration</Label>
                    <NativeSelect
                      id="designDuration"
                      value={data.systemDetails.designDuration}
                      onChange={(e) => updateSystemDetails("designDuration", e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="1hr">1 Hour</option>
                      <option value="3hr">3 Hours</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="numberOfLuminaires">Total Luminaires</Label>
                    <Input
                      id="numberOfLuminaires"
                      type="number"
                      value={data.systemDetails.numberOfLuminaires}
                      onChange={(e) => updateSystemDetails("numberOfLuminaires", e.target.value)}
                      placeholder="e.g. 32"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="riskAssessmentRef">Risk Assessment Reference</Label>
                    <Input
                      id="riskAssessmentRef"
                      value={data.systemDetails.riskAssessmentRef}
                      onChange={(e) => updateSystemDetails("riskAssessmentRef", e.target.value)}
                      placeholder="e.g. RA-2024-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="centralBatteryLocation">Central Battery Location (if applicable)</Label>
                    <Input
                      id="centralBatteryLocation"
                      value={data.systemDetails.centralBatteryLocation}
                      onChange={(e) => updateSystemDetails("centralBatteryLocation", e.target.value)}
                      placeholder="e.g. Plant Room"
                    />
                  </div>
                </div>
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
              </CardContent>
            </Card>

            {/* Luminaire Schedule */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Luminaire Schedule</CardTitle>
                    <CardDescription>Test results for each emergency light</CardDescription>
                  </div>
                  <Button variant="secondary" size="sm" onClick={addLuminaire}>
                    + Add Luminaire
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.luminaires.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No luminaires added. Click &quot;Add Luminaire&quot; to begin.</p>
                ) : (
                  <div className="space-y-3">
                    {data.luminaires.map((lum, index) => (
                      <div
                        key={index}
                        className={`grid grid-cols-[1fr_120px_140px_80px_100px_auto] gap-3 p-3 bg-[var(--muted)] rounded-lg items-end border-l-[3px] ${
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
              </CardContent>
            </Card>

            {/* Test Results */}
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>Functional and duration test results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="functionalTestDate">Functional Test Date</Label>
                    <Input
                      id="functionalTestDate"
                      type="date"
                      value={data.testResults.functionalTestDate}
                      onChange={(e) => updateTestResults("functionalTestDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fullDurationTestDate">Full Duration Test Date</Label>
                    <Input
                      id="fullDurationTestDate"
                      type="date"
                      value={data.testResults.fullDurationTestDate}
                      onChange={(e) => updateTestResults("fullDurationTestDate", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="durationTestResult">Duration Test Result</Label>
                    <NativeSelect
                      id="durationTestResult"
                      value={data.testResults.durationTestResult}
                      onChange={(e) => updateTestResults("durationTestResult", e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="actualDuration">Actual Duration Achieved</Label>
                    <Input
                      id="actualDuration"
                      value={data.testResults.actualDuration}
                      onChange={(e) => updateTestResults("actualDuration", e.target.value)}
                      placeholder="e.g. 3hr 15min"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="allLuminairesFunctional"
                        checked={data.testResults.allLuminairesFunctional}
                        onChange={(e) => updateTestResults("allLuminairesFunctional", e.target.checked)}
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                      />
                      <Label htmlFor="allLuminairesFunctional" className="mb-0">All luminaires functional</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="exitSignsVisible"
                        checked={data.testResults.exitSignsVisible}
                        onChange={(e) => updateTestResults("exitSignsVisible", e.target.checked)}
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                      />
                      <Label htmlFor="exitSignsVisible" className="mb-0">Exit signs visible and legible</Label>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="illuminationAdequate"
                        checked={data.testResults.illuminationAdequate}
                        onChange={(e) => updateTestResults("illuminationAdequate", e.target.checked)}
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                      />
                      <Label htmlFor="illuminationAdequate" className="mb-0">Illumination adequate</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="logBookAvailable"
                        checked={data.testResults.logBookAvailable}
                        onChange={(e) => updateTestResults("logBookAvailable", e.target.checked)}
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                      />
                      <Label htmlFor="logBookAvailable" className="mb-0">Log book available</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>Overall Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="overallCondition">System Condition</Label>
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
                    <Label htmlFor="nextServiceDate">Next Test Due</Label>
                    <Input
                      id="nextServiceDate"
                      type="date"
                      value={data.nextServiceDate}
                      onChange={(e) => setData((prev) => ({ ...prev, nextServiceDate: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Luminaire Stats */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
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
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
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

            {/* Download Button */}
            <Button onClick={handleDownload} disabled={isGenerating} size="lg" className="w-full">
              {isGenerating ? "Generating..." : "Download Certificate"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
