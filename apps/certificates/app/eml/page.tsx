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
    <main style={{ minHeight: "100vh", background: "#0A0F1C", color: "#F8FAFC" }}>
      {/* Header */}
      <header style={{
        borderBottom: "1px solid #2D3B52",
        background: "#111827",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/" style={{ color: "#94A3B8", display: "flex", alignItems: "center" }}>
              <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Emergency Lighting Certificate</h1>
              <p style={{ fontSize: "12px", color: "#94A3B8", margin: 0 }}>BS 5266 | Emergency Lighting</p>
            </div>
          </div>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </header>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px" }}>
          {/* Main Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
                      className="w-5 h-5 rounded"
                    />
                    <Label htmlFor="escapeLighting" className="mb-0">Escape Route Lighting</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="standbyLighting"
                      checked={data.systemDetails.standbyLighting}
                      onChange={(e) => updateSystemDetails("standbyLighting", e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <Label htmlFor="standbyLighting" className="mb-0">Standby Lighting</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="highRiskTaskLighting"
                      checked={data.systemDetails.highRiskTaskLighting}
                      onChange={(e) => updateSystemDetails("highRiskTaskLighting", e.target.checked)}
                      className="w-5 h-5 rounded"
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
                  <p className="text-sm text-[var(--muted-foreground)]">No luminaires added. Click "Add Luminaire" to begin.</p>
                ) : (
                  <div className="space-y-3">
                    {data.luminaires.map((lum, index) => (
                      <div
                        key={index}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 120px 140px 80px 100px auto",
                          gap: "12px",
                          padding: "12px",
                          background: "#1A2235",
                          borderRadius: "8px",
                          alignItems: "end",
                          borderLeft: lum.status === "pass" ? "3px solid #10B981" : lum.status === "fail" ? "3px solid #EF4444" : "3px solid #2D3B52",
                        }}
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
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            padding: "8px",
                          }}
                        >
                          <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        className="w-5 h-5 rounded"
                      />
                      <Label htmlFor="allLuminairesFunctional" className="mb-0">All luminaires functional</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="exitSignsVisible"
                        checked={data.testResults.exitSignsVisible}
                        onChange={(e) => updateTestResults("exitSignsVisible", e.target.checked)}
                        className="w-5 h-5 rounded"
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
                        className="w-5 h-5 rounded"
                      />
                      <Label htmlFor="illuminationAdequate" className="mb-0">Illumination adequate</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="logBookAvailable"
                        checked={data.testResults.logBookAvailable}
                        onChange={(e) => updateTestResults("logBookAvailable", e.target.checked)}
                        className="w-5 h-5 rounded"
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
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Luminaire Stats */}
            <div
              style={{
                background: "#111827",
                border: "1px solid #2D3B52",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#94A3B8" }}>
                Luminaire Summary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#94A3B8" }}>Total Luminaires</span>
                  <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "monospace" }}>{luminaireStats.total}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#10B981" }}>Passed</span>
                  <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "monospace", color: "#10B981" }}>
                    {luminaireStats.pass}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#EF4444" }}>Failed</span>
                  <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "monospace", color: "#EF4444" }}>
                    {luminaireStats.fail}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div
              style={{
                background: "#111827",
                border: "1px solid #2D3B52",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px", color: "#94A3B8" }}>
                BS 5266 Testing
              </h3>
              <div style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.6 }}>
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>Monthly</span>
                  <div>Brief functional test (flick test)</div>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>6-Monthly</span>
                  <div>1/4 duration test (central battery)</div>
                </div>
                <div>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>Annual</span>
                  <div>Full rated duration test</div>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <Button onClick={handleDownload} disabled={isGenerating} size="lg" style={{ width: "100%" }}>
              {isGenerating ? "Generating..." : "Download Certificate"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
