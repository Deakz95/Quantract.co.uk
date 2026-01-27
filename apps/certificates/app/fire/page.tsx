"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type FireAlarmCertificate } from "../../lib/certificate-types";
import {
  useCertificateStore,
  useStoreHydration,
  createNewCertificate,
  generateCertificateNumber,
} from "../../lib/certificateStore";

function FireAlarmPageContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get("id");
  const hydrated = useStoreHydration();

  const { addCertificate, updateCertificate, getCertificate } = useCertificateStore();

  const [data, setData] = useState<FireAlarmCertificate>(getCertificateTemplate("FIRE") as FireAlarmCertificate);
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
        setData(existing.data as FireAlarmCertificate);
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

  const updateOverview = (field: keyof FireAlarmCertificate["overview"], value: string) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateSystemDetails = (field: keyof FireAlarmCertificate["systemDetails"], value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      systemDetails: { ...prev.systemDetails, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateTestResults = (field: keyof FireAlarmCertificate["testResults"], value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const addDevice = () => {
    setData((prev) => ({
      ...prev,
      devices: [...prev.devices, { location: "", deviceType: "", zone: "", status: "", notes: "" }],
    }));
    setSaveStatus("idle");
  };

  const updateDevice = (index: number, field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      devices: prev.devices.map((device, i) =>
        i === index ? { ...device, [field]: value } : device
      ),
    }));
    setSaveStatus("idle");
  };

  const removeDevice = (index: number) => {
    setData((prev) => ({
      ...prev,
      devices: prev.devices.filter((_, i) => i !== index),
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
        const newCert = createNewCertificate("FIRE", data as unknown as Record<string, unknown>);
        newCert.client_name = data.overview.clientName;
        newCert.installation_address = data.overview.installationAddress;
        newCert.certificate_number = data.overview.jobReference || generateCertificateNumber("FIRE");
        addCertificate(newCert);
        setCurrentCertId(newCert.id);
        window.history.replaceState({}, "", `/fire?id=${newCert.id}`);
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
      alert("Fire Alarm Certificate PDF generation coming soon!");
      setIsGenerating(false);
      if (currentCertId) {
        updateCertificate(currentCertId, { status: "issued" });
      }
    }, 500);
  };

  const deviceStats = {
    total: data.devices.length,
    pass: data.devices.filter((d) => d.status === "pass").length,
    fail: data.devices.filter((d) => d.status === "fail").length,
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
              <h1 className="text-xl font-bold">Fire Alarm System Certificate</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                BS 5839 | Fire Detection and Alarm
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
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400 flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>This certificate is not saved yet. Click &quot;Save&quot; to store it locally.</span>
          </div>
        )}

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
                      className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
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
                  <p className="text-sm text-[var(--muted-foreground)]">No devices added. Click &quot;Add Device&quot; to begin.</p>
                ) : (
                  <div className="space-y-3">
                    {data.devices.map((device, index) => (
                      <div
                        key={index}
                        className={`grid grid-cols-[1fr_140px_80px_100px_1fr_auto] gap-3 p-3 bg-[var(--muted)] rounded-lg items-end border-l-[3px] ${
                          device.status === "pass" ? "border-l-[var(--success)]" : device.status === "fail" ? "border-l-[var(--error)]" : "border-l-[var(--border)]"
                        }`}
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
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                      />
                      <Label htmlFor="panelFunctional" className="mb-0">Panel functional and fault-free</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="soundersAudible"
                        checked={data.testResults.soundersAudible}
                        onChange={(e) => updateTestResults("soundersAudible", e.target.checked)}
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                      />
                      <Label htmlFor="soundersAudible" className="mb-0">All sounders audible</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="allDevicesTested"
                        checked={data.testResults.allDevicesTested}
                        onChange={(e) => updateTestResults("allDevicesTested", e.target.checked)}
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                      />
                      <Label htmlFor="allDevicesTested" className="mb-0">All devices tested</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="faultIndicatorsTested"
                        checked={data.testResults.faultIndicatorsTested}
                        onChange={(e) => updateTestResults("faultIndicatorsTested", e.target.checked)}
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
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
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
                      />
                      <Label htmlFor="zonesLabelled" className="mb-0">All zones correctly labelled</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="logBookAvailable"
                        checked={data.testResults.logBookAvailable}
                        onChange={(e) => updateTestResults("logBookAvailable", e.target.checked)}
                        className="w-5 h-5 rounded border-[var(--border)] bg-[var(--background)] accent-[var(--primary)]"
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
          <div className="flex flex-col gap-4">
            {/* Device Stats */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 text-[var(--muted-foreground)]">
                Device Summary
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">Total Devices</span>
                  <span className="text-xl font-bold font-mono">{deviceStats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--success)]">Passed</span>
                  <span className="text-xl font-bold font-mono text-[var(--success)]">
                    {deviceStats.pass}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--error)]">Failed</span>
                  <span className="text-xl font-bold font-mono text-[var(--error)]">
                    {deviceStats.fail}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3 text-[var(--muted-foreground)]">
                BS 5839 Categories
              </h3>
              <div className="text-xs text-[var(--muted-foreground)] leading-relaxed space-y-2">
                <div>
                  <span className="text-[var(--foreground)] font-semibold">L1</span> - Full protection
                </div>
                <div>
                  <span className="text-[var(--foreground)] font-semibold">L2</span> - Coverage of high-risk areas
                </div>
                <div>
                  <span className="text-[var(--foreground)] font-semibold">L3</span> - Escape routes + areas opening onto
                </div>
                <div>
                  <span className="text-[var(--foreground)] font-semibold">L4</span> - Escape routes only
                </div>
                <div>
                  <span className="text-[var(--foreground)] font-semibold">P1</span> - Full property protection
                </div>
                <div>
                  <span className="text-[var(--foreground)] font-semibold">M</span> - Manual call points only
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <Button variant="secondary" onClick={handleSave} disabled={isSaving} className="w-full">
              {saveStatus === "saving" ? "Saving..." : "Save Certificate"}
            </Button>
            <Button onClick={handleDownload} disabled={isGenerating} size="lg" className="w-full">
              {isGenerating ? "Generating..." : "Download Certificate"}
            </Button>
            <Link href="/dashboard" className="w-full">
              <Button variant="ghost" className="w-full">
                View All Certificates
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function FireAlarmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
      </div>
    }>
      <FireAlarmPageContent />
    </Suspense>
  );
}
