"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type FireAlarmCertificate } from "../../lib/certificate-types";

export default function FireAlarmPage() {
  const [data, setData] = useState<FireAlarmCertificate>(getCertificateTemplate("FIRE") as FireAlarmCertificate);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateOverview = (field: keyof FireAlarmCertificate["overview"], value: string) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));
  };

  const updateSystemDetails = (field: keyof FireAlarmCertificate["systemDetails"], value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      systemDetails: { ...prev.systemDetails, [field]: value },
    }));
  };

  const updateTestResults = (field: keyof FireAlarmCertificate["testResults"], value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
    }));
  };

  const addDevice = () => {
    setData((prev) => ({
      ...prev,
      devices: [...prev.devices, { location: "", deviceType: "", zone: "", status: "", notes: "" }],
    }));
  };

  const updateDevice = (index: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      devices: prev.devices.map((device, i) =>
        i === index ? { ...device, [field]: value } : device
      ),
    }));
  };

  const removeDevice = (index: number) => {
    setData((prev) => ({
      ...prev,
      devices: prev.devices.filter((_, i) => i !== index),
    }));
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    // PDF generation would go here
    setTimeout(() => {
      alert("Fire Alarm Certificate PDF generation coming soon!");
      setIsGenerating(false);
    }, 500);
  };

  const deviceStats = {
    total: data.devices.length,
    pass: data.devices.filter((d) => d.status === "pass").length,
    fail: data.devices.filter((d) => d.status === "fail").length,
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
              <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Fire Alarm System Certificate</h1>
              <p style={{ fontSize: "12px", color: "#94A3B8", margin: 0 }}>BS 5839 | Fire Detection and Alarm</p>
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
                      placeholder="e.g. FIRE-2024-001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfInspection">Service Date</Label>
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
                <CardDescription>Fire alarm panel and configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="systemType">System Category (BS 5839)</Label>
                    <NativeSelect
                      id="systemType"
                      value={data.systemDetails.systemType}
                      onChange={(e) => updateSystemDetails("systemType", e.target.value)}
                    >
                      <option value="">Select...</option>
                      <optgroup label="Life Protection">
                        <option value="L1">L1 - Full Protection</option>
                        <option value="L2">L2 - High Risk Areas</option>
                        <option value="L3">L3 - Escape Routes</option>
                        <option value="L4">L4 - Escape Routes Only</option>
                        <option value="L5">L5 - Custom</option>
                      </optgroup>
                      <optgroup label="Property Protection">
                        <option value="P1">P1 - Full Property</option>
                        <option value="P2">P2 - Specified Areas</option>
                      </optgroup>
                      <option value="M">M - Manual Only</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="panelManufacturer">Panel Manufacturer</Label>
                    <Input
                      id="panelManufacturer"
                      value={data.systemDetails.panelManufacturer}
                      onChange={(e) => updateSystemDetails("panelManufacturer", e.target.value)}
                      placeholder="e.g. C-TEC, Morley, Gent"
                    />
                  </div>
                  <div>
                    <Label htmlFor="panelModel">Panel Model</Label>
                    <Input
                      id="panelModel"
                      value={data.systemDetails.panelModel}
                      onChange={(e) => updateSystemDetails("panelModel", e.target.value)}
                      placeholder="Model number"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="panelLocation">Panel Location</Label>
                    <Input
                      id="panelLocation"
                      value={data.systemDetails.panelLocation}
                      onChange={(e) => updateSystemDetails("panelLocation", e.target.value)}
                      placeholder="e.g. Ground Floor Reception"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfZones">Number of Zones</Label>
                    <Input
                      id="numberOfZones"
                      type="number"
                      value={data.systemDetails.numberOfZones}
                      onChange={(e) => updateSystemDetails("numberOfZones", e.target.value)}
                      placeholder="e.g. 8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numberOfDevices">Total Devices</Label>
                    <Input
                      id="numberOfDevices"
                      type="number"
                      value={data.systemDetails.numberOfDevices}
                      onChange={(e) => updateSystemDetails("numberOfDevices", e.target.value)}
                      placeholder="e.g. 24"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="batteryBackup"
                      checked={data.systemDetails.batteryBackup}
                      onChange={(e) => updateSystemDetails("batteryBackup", e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <Label htmlFor="batteryBackup" className="mb-0">Battery Backup</Label>
                  </div>
                  <div>
                    <Label htmlFor="batteryType">Battery Type</Label>
                    <Input
                      id="batteryType"
                      value={data.systemDetails.batteryType}
                      onChange={(e) => updateSystemDetails("batteryType", e.target.value)}
                      placeholder="e.g. 12V 7Ah SLA"
                    />
                  </div>
                  <div>
                    <Label htmlFor="batteryCapacity">Battery Capacity</Label>
                    <Input
                      id="batteryCapacity"
                      value={data.systemDetails.batteryCapacity}
                      onChange={(e) => updateSystemDetails("batteryCapacity", e.target.value)}
                      placeholder="e.g. 24hr standby"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Device Schedule */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Device Schedule</CardTitle>
                    <CardDescription>Test results for each detection device</CardDescription>
                  </div>
                  <Button variant="secondary" size="sm" onClick={addDevice}>
                    + Add Device
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {data.devices.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No devices added. Click "Add Device" to begin.</p>
                ) : (
                  <div className="space-y-3">
                    {data.devices.map((device, index) => (
                      <div
                        key={index}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 140px 80px 100px 1fr auto",
                          gap: "12px",
                          padding: "12px",
                          background: "#1A2235",
                          borderRadius: "8px",
                          alignItems: "end",
                          borderLeft: device.status === "pass" ? "3px solid #10B981" : device.status === "fail" ? "3px solid #EF4444" : "3px solid #2D3B52",
                        }}
                      >
                        <div>
                          <Label className="text-xs">Location</Label>
                          <Input
                            value={device.location}
                            onChange={(e) => updateDevice(index, "location", e.target.value)}
                            placeholder="e.g. Ground Floor Corridor"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Device Type</Label>
                          <NativeSelect
                            value={device.deviceType}
                            onChange={(e) => updateDevice(index, "deviceType", e.target.value)}
                          >
                            <option value="">Select...</option>
                            <option value="Smoke - Optical">Smoke (Optical)</option>
                            <option value="Smoke - Ionisation">Smoke (Ionisation)</option>
                            <option value="Heat">Heat Detector</option>
                            <option value="Multi-Sensor">Multi-Sensor</option>
                            <option value="MCP">Manual Call Point</option>
                            <option value="Sounder">Sounder</option>
                            <option value="Beacon">Beacon/Strobe</option>
                            <option value="Sounder/Beacon">Sounder/Beacon</option>
                          </NativeSelect>
                        </div>
                        <div>
                          <Label className="text-xs">Zone</Label>
                          <Input
                            value={device.zone}
                            onChange={(e) => updateDevice(index, "zone", e.target.value)}
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <NativeSelect
                            value={device.status}
                            onChange={(e) => updateDevice(index, "status", e.target.value)}
                          >
                            <option value="">-</option>
                            <option value="pass">Pass</option>
                            <option value="fail">Fail</option>
                          </NativeSelect>
                        </div>
                        <div>
                          <Label className="text-xs">Notes</Label>
                          <Input
                            value={device.notes}
                            onChange={(e) => updateDevice(index, "notes", e.target.value)}
                            placeholder="Any observations"
                          />
                        </div>
                        <button
                          onClick={() => removeDevice(index)}
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
                <CardTitle>System Tests</CardTitle>
                <CardDescription>Overall system functionality tests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="panelFunctional"
                        checked={data.testResults.panelFunctional}
                        onChange={(e) => updateTestResults("panelFunctional", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <Label htmlFor="panelFunctional" className="mb-0">Panel functional and fault-free</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="soundersAudible"
                        checked={data.testResults.soundersAudible}
                        onChange={(e) => updateTestResults("soundersAudible", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <Label htmlFor="soundersAudible" className="mb-0">All sounders audible</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="allDevicesTested"
                        checked={data.testResults.allDevicesTested}
                        onChange={(e) => updateTestResults("allDevicesTested", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <Label htmlFor="allDevicesTested" className="mb-0">All devices tested</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="faultIndicatorsTested"
                        checked={data.testResults.faultIndicatorsTested}
                        onChange={(e) => updateTestResults("faultIndicatorsTested", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <Label htmlFor="faultIndicatorsTested" className="mb-0">Fault indicators tested</Label>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="zonesLabelled"
                        checked={data.testResults.zonesLabelled}
                        onChange={(e) => updateTestResults("zonesLabelled", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <Label htmlFor="zonesLabelled" className="mb-0">All zones correctly labelled</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="logBookAvailable"
                        checked={data.testResults.logBookAvailable}
                        onChange={(e) => updateTestResults("logBookAvailable", e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <Label htmlFor="logBookAvailable" className="mb-0">Log book available and up to date</Label>
                    </div>
                    <div>
                      <Label htmlFor="batteryVoltage">Battery Voltage (V)</Label>
                      <Input
                        id="batteryVoltage"
                        value={data.testResults.batteryVoltage}
                        onChange={(e) => updateTestResults("batteryVoltage", e.target.value)}
                        placeholder="e.g. 27.2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="batteryCondition">Battery Condition</Label>
                      <NativeSelect
                        id="batteryCondition"
                        value={data.testResults.batteryCondition}
                        onChange={(e) => updateTestResults("batteryCondition", e.target.value)}
                      >
                        <option value="">Select...</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="replace">Requires Replacement</option>
                      </NativeSelect>
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
                    <Label htmlFor="nextServiceDate">Next Service Due</Label>
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
            {/* Device Stats */}
            <div
              style={{
                background: "#111827",
                border: "1px solid #2D3B52",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "#94A3B8" }}>
                Device Summary
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#94A3B8" }}>Total Devices</span>
                  <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "monospace" }}>{deviceStats.total}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#10B981" }}>Passed</span>
                  <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "monospace", color: "#10B981" }}>
                    {deviceStats.pass}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#EF4444" }}>Failed</span>
                  <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "monospace", color: "#EF4444" }}>
                    {deviceStats.fail}
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
                BS 5839 Categories
              </h3>
              <div style={{ fontSize: "12px", color: "#64748B", lineHeight: 1.6 }}>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>L1</span> - Full protection
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>L2</span> - Coverage of high-risk areas
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>L3</span> - Escape routes + areas opening onto
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>L4</span> - Escape routes only
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>P1</span> - Full property protection
                </div>
                <div>
                  <span style={{ color: "#F8FAFC", fontWeight: 600 }}>M</span> - Manual call points only
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
