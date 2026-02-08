"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { SubCard } from "../../components/ui/SubCard";
import { FloatingInput } from "../../components/ui/FloatingInput";
import { FloatingSelect } from "../../components/ui/FloatingSelect";
import { PillSelector } from "../../components/ui/PillSelector";
import { getCertificateTemplate, type FireAlarmCertificate, getSignature, setSignature, clearSignature, migrateAllLegacySignatures } from "@quantract/shared/certificate-types";
import type { SignatureValue } from "@quantract/shared/certificate-types";
import {
  useCertificateStore,
  useStoreHydration,
  createNewCertificate,
  generateCertificateNumber,
} from "../../lib/certificateStore";
import { StickyActionBar } from "../../components/StickyActionBar";
import { SignatureField } from "../../components/signatures/SignatureField";
import { PhotoCapture } from "../../components/PhotoCapture";

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
  const [photos, setPhotos] = useState<string[]>([]);

  // V2 signature helpers
  const getsig = (role: string): SignatureValue | null =>
    getSignature(data as unknown as Record<string, unknown>, role) ?? null;
  const setSig = (role: string, sig: SignatureValue | null) => {
    setData((prev) => {
      const d = prev as unknown as Record<string, unknown>;
      const updated = sig ? setSignature(d, role, sig) : clearSignature(d, role);
      return updated as FireAlarmCertificate;
    });
  };

  // Load existing certificate if ID is provided (only after hydration)
  useEffect(() => {
    if (hydrated && certificateId) {
      const existing = getCertificate(certificateId);
      if (existing && existing.data) {
        const loaded = existing.data as FireAlarmCertificate;
        const withMigratedSigs = migrateAllLegacySignatures("FIRE", loaded as unknown as Record<string, unknown>);
        Object.assign(loaded, { _signatures: (withMigratedSigs as Record<string, unknown>)._signatures });
        // Migrate boolean test results → string pill values
        const boolFields = ["panelFunctional", "soundersAudible", "allDevicesTested", "faultIndicatorsTested", "zonesLabelled", "logBookAvailable"] as const;
        for (const f of boolFields) {
          const v = loaded.testResults[f];
          if (typeof v === "boolean") {
            (loaded.testResults as Record<string, unknown>)[f] = v ? "pass" : "";
          }
        }
        setData(loaded);
        setCurrentCertId(certificateId);
        setLastSaved(new Date(existing.updated_at));
      }
    }
  }, [certificateId, getCertificate, hydrated]);

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
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-sm text-sm text-amber-400 flex items-center gap-3">
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
            <div className="space-y-4">
              <SectionHeading number={1} title="Installation Details" fieldCount={5} />
              <SubCard title="Report Info">
                <div className="grid md:grid-cols-2 gap-3">
                  <FloatingInput
                    id="jobReference"
                    label="Certificate Reference"
                    value={data.overview.jobReference}
                    onChange={(e) => updateOverview("jobReference", e.target.value)}
                    placeholder="e.g. FIRE-2024-001"
                  />
                  <FloatingInput
                    id="dateOfInspection"
                    label="Service Date"
                    type="date"
                    value={data.overview.dateOfInspection}
                    onChange={(e) => updateOverview("dateOfInspection", e.target.value)}
                  />
                </div>
              </SubCard>
              <SubCard title="Client & Site">
                <div className="grid md:grid-cols-2 gap-3">
                  <FloatingInput
                    id="clientName"
                    label="Client Name"
                    value={data.overview.clientName}
                    onChange={(e) => updateOverview("clientName", e.target.value)}
                    placeholder="Client or company name"
                  />
                  <FloatingInput
                    id="siteName"
                    label="Site Name"
                    value={data.overview.siteName}
                    onChange={(e) => updateOverview("siteName", e.target.value)}
                    placeholder="Building or site name"
                  />
                </div>
              </SubCard>
              <SubCard title="Address">
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
              </SubCard>
            </div>

            {/* System Details */}
            <div className="space-y-4">
              <SectionHeading number={2} title="System Details" fieldCount={9} />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <FloatingSelect
                  id="systemType"
                  label="System Category (BS 5839)"
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
                </FloatingSelect>
                <FloatingInput
                  id="panelManufacturer"
                  label="Panel Manufacturer"
                  value={data.systemDetails.panelManufacturer}
                  onChange={(e) => updateSystemDetails("panelManufacturer", e.target.value)}
                  placeholder="e.g. C-TEC, Morley, Gent"
                />
                <FloatingInput
                  id="panelModel"
                  label="Panel Model"
                  value={data.systemDetails.panelModel}
                  onChange={(e) => updateSystemDetails("panelModel", e.target.value)}
                  placeholder="Model number"
                />
                <FloatingInput
                  id="panelLocation"
                  label="Panel Location"
                  value={data.systemDetails.panelLocation}
                  onChange={(e) => updateSystemDetails("panelLocation", e.target.value)}
                  placeholder="e.g. Ground Floor Reception"
                />
                <FloatingInput
                  id="numberOfZones"
                  label="Number of Zones"
                  type="number"
                  value={data.systemDetails.numberOfZones}
                  onChange={(e) => updateSystemDetails("numberOfZones", e.target.value)}
                  placeholder="e.g. 8"
                />
                <FloatingInput
                  id="numberOfDevices"
                  label="Total Devices"
                  type="number"
                  value={data.systemDetails.numberOfDevices}
                  onChange={(e) => updateSystemDetails("numberOfDevices", e.target.value)}
                  placeholder="e.g. 24"
                />
              </div>
              <SubCard title="Battery">
                <div className="grid md:grid-cols-3 gap-3 items-center">
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
                  <FloatingInput
                    id="batteryType"
                    label="Battery Type"
                    value={data.systemDetails.batteryType}
                    onChange={(e) => updateSystemDetails("batteryType", e.target.value)}
                    placeholder="e.g. 12V 7Ah SLA"
                  />
                  <FloatingInput
                    id="batteryCapacity"
                    label="Battery Capacity"
                    value={data.systemDetails.batteryCapacity}
                    onChange={(e) => updateSystemDetails("batteryCapacity", e.target.value)}
                    placeholder="e.g. 24hr standby"
                  />
                </div>
              </SubCard>
            </div>

            {/* Device Schedule */}
            <div>
              <SectionHeading number={3} title="Device Schedule">
                <Button variant="secondary" size="sm" onClick={addDevice}>
                  + Add Device
                </Button>
              </SectionHeading>
              {data.devices.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No devices added. Click &quot;Add Device&quot; to begin.</p>
              ) : (
                <div className="space-y-3">
                  {data.devices.map((device, index) => (
                    <div
                      key={index}
                      className={`grid grid-cols-[1fr_140px_80px_100px_1fr_auto] gap-3 p-3 bg-[var(--muted)] rounded-sm items-end border-l-[3px] ${
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
            </div>

            {/* System Tests */}
            <div className="space-y-4">
              <SectionHeading number={4} title="System Tests" fieldCount={8} />
              <div className="grid md:grid-cols-2 gap-4">
                <SubCard title="Functional Checks">
                  <div className="space-y-3">
                    {([
                      ["panelFunctional", "Panel functional and fault-free"],
                      ["soundersAudible", "All sounders audible"],
                      ["allDevicesTested", "All devices tested"],
                      ["faultIndicatorsTested", "Fault indicators tested"],
                      ["zonesLabelled", "All zones correctly labelled"],
                      ["logBookAvailable", "Log book available and up to date"],
                    ] as const).map(([field, label]) => (
                      <div key={field} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-[var(--foreground)]">{label}</span>
                        <PillSelector
                          options={[
                            { label: "Pass", value: "pass" },
                            { label: "Fail", value: "fail" },
                            { label: "N/A", value: "na" },
                          ]}
                          value={String(data.testResults[field] ?? "")}
                          onChange={(v) => updateTestResults(field, v)}
                        />
                      </div>
                    ))}
                  </div>
                </SubCard>
                <SubCard title="Battery">
                  <div className="space-y-3">
                    <FloatingInput
                      id="batteryVoltage"
                      label="Battery Voltage"
                      value={data.testResults.batteryVoltage}
                      onChange={(e) => updateTestResults("batteryVoltage", e.target.value)}
                      placeholder="e.g. 27.2"
                      unit="V"
                    />
                    <FloatingSelect
                      id="batteryCondition"
                      label="Battery Condition"
                      value={data.testResults.batteryCondition}
                      onChange={(e) => updateTestResults("batteryCondition", e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="replace">Requires Replacement</option>
                    </FloatingSelect>
                  </div>
                </SubCard>
              </div>
            </div>

            {/* Overall Assessment */}
            <div className="space-y-4">
              <SectionHeading number={5} title="Overall Assessment" fieldCount={2} />
              <SubCard title="Assessment">
                <div className="grid md:grid-cols-2 gap-3">
                  <FloatingSelect
                    id="overallCondition"
                    label="System Condition"
                    value={data.overallCondition}
                    onChange={(e) => setData((prev) => ({ ...prev, overallCondition: e.target.value as "satisfactory" | "unsatisfactory" | "" }))}
                  >
                    <option value="">Select...</option>
                    <option value="satisfactory">Satisfactory</option>
                    <option value="unsatisfactory">Unsatisfactory</option>
                  </FloatingSelect>
                  <FloatingInput
                    id="nextServiceDate"
                    label="Next Service Due"
                    type="date"
                    value={data.nextServiceDate}
                    onChange={(e) => setData((prev) => ({ ...prev, nextServiceDate: e.target.value }))}
                  />
                </div>
              </SubCard>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Device Stats */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-5">
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
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-sm p-5">
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

            <Link href="/dashboard" className="w-full">
              <Button variant="ghost" className="w-full">
                View All Certificates
              </Button>
            </Link>
          </div>
        </div>
      </div>
      {/* Signatures & Photos */}
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <div className="space-y-4">
          <SectionHeading number={6} title="Signatures & Photos" />
          <div className="grid md:grid-cols-2 gap-6">
            <SignatureField signatureId="engineer" label="Engineer Signature" value={getsig("engineer")} onChange={(sig) => setSig("engineer", sig)} />
            <SignatureField signatureId="client" label="Customer Signature" value={getsig("client")} onChange={(sig) => setSig("client", sig)} />
          </div>
          <PhotoCapture photos={photos} onChange={setPhotos} />
        </div>
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
