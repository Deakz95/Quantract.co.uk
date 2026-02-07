"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type EICCertificate, type BoardData as BoardDataType } from "@quantract/shared/certificate-types";
import { generateCertificatePDF } from "../../lib/pdf-generator";
import BoardViewer, { type BoardData } from "../../components/BoardViewer";
import {
  useCertificateStore,
  useStoreHydration,
  createNewCertificate,
  generateCertificateNumber,
} from "../../lib/certificateStore";
import { StickyActionBar } from "../../components/StickyActionBar";
import { PhotoCapture } from "../../components/PhotoCapture";
import { ContractorDetails } from "../../components/ContractorDetails";
import { InstallationTypeSelector } from "../../components/InstallationTypeSelector";
import { EICSignatorySection } from "../../components/EICSignatorySection";
import { ObservationsList } from "../../components/ObservationsList";

type SectionId = "contractor" | "installation" | "type" | "supply" | "earthing" | "origin" | "boards" | "tests" | "observations" | "signatories" | "nextInspection" | "photos";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "contractor", label: "1. Contractor Details" },
  { id: "installation", label: "2. Installation Details" },
  { id: "type", label: "3. Type of Installation" },
  { id: "supply", label: "4. Supply Characteristics" },
  { id: "earthing", label: "5. Earthing Arrangements" },
  { id: "origin", label: "6. Particulars at Origin" },
  { id: "boards", label: "7. Distribution Boards" },
  { id: "tests", label: "8. Test Results" },
  { id: "observations", label: "9. Observations" },
  { id: "signatories", label: "10. Design / Construction / Inspection" },
  { id: "nextInspection", label: "11. Next Inspection" },
  { id: "photos", label: "12. Site Photos" },
];

function EICPageContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get("id");
  const hydrated = useStoreHydration();

  const { addCertificate, updateCertificate, getCertificate } = useCertificateStore();

  const [data, setData] = useState<EICCertificate>(getCertificateTemplate("EIC") as EICCertificate);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentCertId, setCurrentCertId] = useState<string | null>(certificateId);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeSection, setActiveSection] = useState<SectionId>("contractor");
  const [designSig, setDesignSig] = useState<string | null>(null);
  const [constructionSig, setConstructionSig] = useState<string | null>(null);
  const [inspectionSig, setInspectionSig] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  // Load existing certificate if ID is provided (only after hydration)
  useEffect(() => {
    if (hydrated && certificateId) {
      const existing = getCertificate(certificateId);
      if (existing && existing.data) {
        setData(existing.data as EICCertificate);
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

  const updateSupply = (field: string, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      supplyCharacteristics: { ...prev.supplyCharacteristics, [field]: value },
    }));
    setSaveStatus("idle");
  };

  const updateEarthing = (field: string, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      earthingArrangements: { ...prev.earthingArrangements, [field]: value },
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

  // Board management
  const addBoard = () => {
    const newBoard: BoardDataType = {
      id: crypto.randomUUID(),
      name: `DB ${data.boards.length + 1}`,
      description: "",
      designation: `DB${data.boards.length + 1}`,
      type: "single-phase",
      manufacturer: "",
      model: "",
      location: "",
      ipRating: "",
      mainSwitch: { rating: "", type: "" },
      rcdDetails: "",
      circuits: [],
    };
    setData((prev) => ({
      ...prev,
      boards: [...prev.boards, newBoard],
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
        const newCert = createNewCertificate("EIC", data as unknown as Record<string, unknown>);
        newCert.client_name = data.overview.clientName;
        newCert.installation_address = data.overview.installationAddress;
        newCert.certificate_number = data.overview.jobReference || generateCertificateNumber("EIC");
        addCertificate(newCert);
        setCurrentCertId(newCert.id);
        window.history.replaceState({}, "", `/eic?id=${newCert.id}`);
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
        engineerSignature: designSig,
        customerSignature: null,
        photos,
      });
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `EIC-${data.overview.jobReference || "certificate"}.pdf`;
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
              <h1 className="text-xl font-bold">Electrical Installation Certificate</h1>
              <p className="text-xs text-[var(--muted-foreground)]">
                BS 7671:2018+A2:2022 | EIC
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
          <div className="max-w-[900px] flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Installation Details</CardTitle>
                <CardDescription>Basic information about the installation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jobReference">Certificate Reference</Label>
                    <Input id="jobReference" value={data.overview.jobReference} onChange={(e) => updateOverview("jobReference", e.target.value)} placeholder="e.g. EIC-2026-001" />
                  </div>
                  <div>
                    <Label htmlFor="dateOfInspection">Date of Inspection</Label>
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
                    <Input id="occupier" value={data.overview.occupier} onChange={(e) => updateOverview("occupier", e.target.value)} placeholder="Occupier name (if different)" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input id="siteName" value={data.overview.siteName} onChange={(e) => updateOverview("siteName", e.target.value)} placeholder="Site or property name" />
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
                    <Label htmlFor="estimatedAgeOfWiring">Estimated Age of Wiring</Label>
                    <Input id="estimatedAgeOfWiring" value={data.overview.estimatedAgeOfWiring} onChange={(e) => updateOverview("estimatedAgeOfWiring", e.target.value)} placeholder="e.g. New / 15 years" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="jobDescription">Description of Work</Label>
                  <Textarea id="jobDescription" value={data.overview.jobDescription} onChange={(e) => updateOverview("jobDescription", e.target.value)} placeholder="Describe the installation work carried out" className="min-h-[80px]" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 3. Type of Installation */}
        {activeSection === "type" && (
          <div className="max-w-[900px]">
            <InstallationTypeSelector
              installationType={data.installationType}
              commentsOnExistingInstallation={data.commentsOnExistingInstallation}
              onChange={(field, value) => {
                setData((prev) => ({ ...prev, [field]: value }));
                setSaveStatus("idle");
              }}
            />
          </div>
        )}

        {/* 4. Supply Characteristics */}
        {activeSection === "supply" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Supply Characteristics</CardTitle>
                <CardDescription>Details of the electrical supply per BS 7671</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="systemType">System Type (Earthing)</Label>
                    <NativeSelect id="systemType" value={data.supplyCharacteristics.systemType} onChange={(e) => updateSupply("systemType", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="TN-C-S">TN-C-S (PME)</option>
                      <option value="TN-S">TN-S</option>
                      <option value="TT">TT</option>
                      <option value="IT">IT</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="numberOfPhases">Number of Phases</Label>
                    <NativeSelect id="numberOfPhases" value={data.supplyCharacteristics.numberOfPhases} onChange={(e) => updateSupply("numberOfPhases", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="single">Single Phase</option>
                      <option value="three">Three Phase</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="natureOfSupply">Nature of Supply</Label>
                    <NativeSelect id="natureOfSupply" value={data.supplyCharacteristics.natureOfSupply} onChange={(e) => updateSupply("natureOfSupply", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="AC">AC</option>
                      <option value="DC">DC</option>
                    </NativeSelect>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="nominalVoltageToEarth">Nominal Voltage to Earth (V)</Label>
                    <Input id="nominalVoltageToEarth" value={data.supplyCharacteristics.nominalVoltageToEarth} onChange={(e) => updateSupply("nominalVoltageToEarth", e.target.value)} placeholder="230" />
                  </div>
                  <div>
                    <Label htmlFor="nominalVoltageBetweenPhases">Voltage Between Phases (V)</Label>
                    <Input id="nominalVoltageBetweenPhases" value={data.supplyCharacteristics.nominalVoltageBetweenPhases} onChange={(e) => updateSupply("nominalVoltageBetweenPhases", e.target.value)} placeholder="400" />
                  </div>
                  <div>
                    <Label htmlFor="frequency">Frequency (Hz)</Label>
                    <Input id="frequency" value={data.supplyCharacteristics.frequency} onChange={(e) => updateSupply("frequency", e.target.value)} placeholder="50" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prospectiveFaultCurrent">Prospective Fault Current (kA)</Label>
                    <Input id="prospectiveFaultCurrent" value={data.supplyCharacteristics.prospectiveFaultCurrent} onChange={(e) => updateSupply("prospectiveFaultCurrent", e.target.value)} placeholder="e.g. 16" />
                  </div>
                  <div>
                    <Label htmlFor="externalLoopImpedance">External Ze (Ohm)</Label>
                    <Input id="externalLoopImpedance" value={data.supplyCharacteristics.externalLoopImpedance} onChange={(e) => updateSupply("externalLoopImpedance", e.target.value)} placeholder="e.g. 0.35" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="supplyProtectiveDeviceType">Supply Protective Device Type</Label>
                    <Input id="supplyProtectiveDeviceType" value={data.supplyCharacteristics.supplyProtectiveDeviceType} onChange={(e) => updateSupply("supplyProtectiveDeviceType", e.target.value)} placeholder="e.g. BS 88 Fuse" />
                  </div>
                  <div>
                    <Label htmlFor="supplyProtectiveDeviceRating">Supply Protective Device Rating (A)</Label>
                    <Input id="supplyProtectiveDeviceRating" value={data.supplyCharacteristics.supplyProtectiveDeviceRating} onChange={(e) => updateSupply("supplyProtectiveDeviceRating", e.target.value)} placeholder="e.g. 100" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="otherSourcesOfSupply" checked={data.supplyCharacteristics.otherSourcesOfSupply} onChange={(e) => updateSupply("otherSourcesOfSupply", e.target.checked)} className="w-5 h-5 rounded accent-[var(--primary)]" />
                  <Label htmlFor="otherSourcesOfSupply" className="mb-0">Other sources of supply (e.g. generator, solar PV)</Label>
                </div>
                {data.supplyCharacteristics.otherSourcesOfSupply && (
                  <div>
                    <Label htmlFor="otherSourcesDetails">Other Sources Details</Label>
                    <Input id="otherSourcesDetails" value={data.supplyCharacteristics.otherSourcesDetails} onChange={(e) => updateSupply("otherSourcesDetails", e.target.value)} placeholder="Describe other sources of supply" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 5. Earthing Arrangements */}
        {activeSection === "earthing" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Earthing Arrangements</CardTitle>
                <CardDescription>Details of earthing and bonding per BS 7671</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="meansOfEarthing">Means of Earthing</Label>
                    <NativeSelect id="meansOfEarthing" value={data.earthingArrangements.meansOfEarthing} onChange={(e) => updateEarthing("meansOfEarthing", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="supply_distributor">Supply Distributor</option>
                      <option value="earth_electrode">Earth Electrode</option>
                      <option value="other">Other</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <Label htmlFor="earthElectrodeType">Earth Electrode Type</Label>
                    <NativeSelect id="earthElectrodeType" value={data.earthingArrangements.earthElectrodeType} onChange={(e) => updateEarthing("earthElectrodeType", e.target.value)}>
                      <option value="">Select...</option>
                      <option value="rod">Rod</option>
                      <option value="tape">Tape</option>
                      <option value="plate">Plate</option>
                      <option value="ring">Ring</option>
                      <option value="foundation">Foundation</option>
                      <option value="other">Other</option>
                    </NativeSelect>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="earthingConductorType">Earthing Conductor Type</Label>
                    <Input id="earthingConductorType" value={data.earthingArrangements.earthingConductorType} onChange={(e) => updateEarthing("earthingConductorType", e.target.value)} placeholder="e.g. Copper" />
                  </div>
                  <div>
                    <Label htmlFor="earthingConductorSize">Earthing Conductor Size (mm2)</Label>
                    <Input id="earthingConductorSize" value={data.earthingArrangements.earthingConductorSize} onChange={(e) => updateEarthing("earthingConductorSize", e.target.value)} placeholder="e.g. 16" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="mainProtectiveBondingType">Main Bonding Type</Label>
                    <Input id="mainProtectiveBondingType" value={data.earthingArrangements.mainProtectiveBondingType} onChange={(e) => updateEarthing("mainProtectiveBondingType", e.target.value)} placeholder="e.g. Copper" />
                  </div>
                  <div>
                    <Label htmlFor="mainProtectiveBondingSize">Main Bonding Size (mm2)</Label>
                    <Input id="mainProtectiveBondingSize" value={data.earthingArrangements.mainProtectiveBondingSize} onChange={(e) => updateEarthing("mainProtectiveBondingSize", e.target.value)} placeholder="e.g. 10" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="zeMeasured">Ze Measured (Ohm)</Label>
                  <Input id="zeMeasured" value={data.earthingArrangements.zeMeasured} onChange={(e) => updateEarthing("zeMeasured", e.target.value)} placeholder="e.g. 0.35" />
                </div>

                {/* Bonding checklist */}
                <div className="border border-[var(--border)] rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Main Protective Bonding Connected To:</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    {[
                      { key: "bondingToWater", label: "Water" },
                      { key: "bondingToGas", label: "Gas" },
                      { key: "bondingToOil", label: "Oil" },
                      { key: "bondingToStructuralSteel", label: "Structural Steel" },
                      { key: "bondingToLightningProtection", label: "Lightning Protection" },
                      { key: "bondingToOther", label: "Other" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <input type="checkbox" id={key} checked={(data.earthingArrangements as Record<string, unknown>)[key] as boolean} onChange={(e) => updateEarthing(key, e.target.checked)} className="w-4 h-4 rounded accent-[var(--primary)]" />
                        <Label htmlFor={key} className="mb-0 text-sm">{label}</Label>
                      </div>
                    ))}
                  </div>
                  {data.earthingArrangements.bondingToOther && (
                    <div>
                      <Label htmlFor="bondingToOtherDetails">Other Bonding Details</Label>
                      <Input id="bondingToOtherDetails" value={data.earthingArrangements.bondingToOtherDetails} onChange={(e) => updateEarthing("bondingToOtherDetails", e.target.value)} placeholder="Specify other bonding" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="supplementaryBondingPresent" checked={data.earthingArrangements.supplementaryBondingPresent} onChange={(e) => updateEarthing("supplementaryBondingPresent", e.target.checked)} className="w-5 h-5 rounded accent-[var(--primary)]" />
                  <Label htmlFor="supplementaryBondingPresent" className="mb-0">Supplementary bonding present</Label>
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="earthElectrode" checked={data.earthingArrangements.earthElectrode} onChange={(e) => updateEarthing("earthElectrode", e.target.checked)} className="w-5 h-5 rounded accent-[var(--primary)]" />
                  <Label htmlFor="earthElectrode" className="mb-0">Earth electrode installed</Label>
                </div>
                {data.earthingArrangements.earthElectrode && (
                  <div>
                    <Label htmlFor="earthElectrodeResistance">Earth Electrode Resistance (Ohm)</Label>
                    <Input id="earthElectrodeResistance" value={data.earthingArrangements.earthElectrodeResistance} onChange={(e) => updateEarthing("earthElectrodeResistance", e.target.value)} placeholder="e.g. 20" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 6. Particulars of Installation at Origin */}
        {activeSection === "origin" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Particulars of Installation at Origin</CardTitle>
                <CardDescription>Details of the main switch and main protective devices at the origin of the installation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="originMainSwitchType">Main Switch Type</Label>
                    <Input id="originMainSwitchType" value={data.originMainSwitchType} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchType: e.target.value })); setSaveStatus("idle"); }} placeholder="e.g. Isolator, RCD, RCBO" />
                  </div>
                  <div>
                    <Label htmlFor="originMainSwitchRating">Main Switch Rating (A)</Label>
                    <Input id="originMainSwitchRating" value={data.originMainSwitchRating} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchRating: e.target.value })); setSaveStatus("idle"); }} placeholder="e.g. 100" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="originMainSwitchBsEn">BS EN Number</Label>
                    <Input id="originMainSwitchBsEn" value={data.originMainSwitchBsEn} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchBsEn: e.target.value })); setSaveStatus("idle"); }} placeholder="e.g. BS EN 60947-3" />
                  </div>
                  <div>
                    <Label htmlFor="originMainSwitchPoles">Number of Poles</Label>
                    <NativeSelect id="originMainSwitchPoles" value={data.originMainSwitchPoles} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchPoles: e.target.value })); setSaveStatus("idle"); }}>
                      <option value="">Select...</option>
                      <option value="SP">Single Pole (SP)</option>
                      <option value="DP">Double Pole (DP)</option>
                      <option value="TP">Triple Pole (TP)</option>
                      <option value="TPN">TP&N</option>
                      <option value="4P">4 Pole</option>
                    </NativeSelect>
                  </div>
                </div>
                <div>
                  <Label htmlFor="originMainSwitchLocation">Location</Label>
                  <Input id="originMainSwitchLocation" value={data.originMainSwitchLocation} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchLocation: e.target.value })); setSaveStatus("idle"); }} placeholder="e.g. Hallway cupboard, Meter cabinet" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 7. Distribution Boards */}
        {activeSection === "boards" && (
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Distribution Boards</h2>
                <p className="text-[var(--muted-foreground)]">Visual and table views of circuit schedules and test results</p>
              </div>
              <Button variant="secondary" onClick={addBoard}>+ Add Board</Button>
            </div>

            {data.boards.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted-foreground)]">
                <p className="text-lg mb-2">No distribution boards added yet</p>
                <p className="text-sm">Click &quot;+ Add Board&quot; to add a consumer unit or distribution board</p>
              </div>
            ) : (
              data.boards.map((board) => (
                <BoardViewer key={board.id} board={board as unknown as BoardData} />
              ))
            )}
          </div>
        )}

        {/* 8. Test Results */}
        {activeSection === "tests" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Test Results Summary</CardTitle>
                <CardDescription>Key test measurements at the origin of the installation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="continuityOfProtectiveConductors">Continuity R1+R2 (Ohm)</Label>
                    <Input id="continuityOfProtectiveConductors" value={data.testResults.continuityOfProtectiveConductors} onChange={(e) => updateTests("continuityOfProtectiveConductors", e.target.value)} placeholder="e.g. 0.25" />
                  </div>
                  <div>
                    <Label htmlFor="insulationResistance">Insulation Resistance (MOhm)</Label>
                    <Input id="insulationResistance" value={data.testResults.insulationResistance} onChange={(e) => updateTests("insulationResistance", e.target.value)} placeholder="e.g. >200" />
                  </div>
                  <div>
                    <Label htmlFor="earthFaultLoopImpedance">Zs (Ohm)</Label>
                    <Input id="earthFaultLoopImpedance" value={data.testResults.earthFaultLoopImpedance} onChange={(e) => updateTests("earthFaultLoopImpedance", e.target.value)} placeholder="e.g. 0.45" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rcdOperatingTime">RCD Operating Time (ms)</Label>
                    <Input id="rcdOperatingTime" value={data.testResults.rcdOperatingTime} onChange={(e) => updateTests("rcdOperatingTime", e.target.value)} placeholder="e.g. 25" />
                  </div>
                  <div>
                    <Label htmlFor="rcdOperatingCurrent">RCD Operating Current (mA)</Label>
                    <Input id="rcdOperatingCurrent" value={data.testResults.rcdOperatingCurrent} onChange={(e) => updateTests("rcdOperatingCurrent", e.target.value)} placeholder="e.g. 30" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="polarityConfirmed" checked={data.testResults.polarityConfirmed} onChange={(e) => updateTests("polarityConfirmed", e.target.checked)} className="w-5 h-5 rounded accent-[var(--primary)]" />
                  <Label htmlFor="polarityConfirmed" className="mb-0">Polarity confirmed</Label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 9. Observations */}
        {activeSection === "observations" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Observations & Recommendations</CardTitle>
                <CardDescription>Record any observations or departures from BS 7671</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.observations}
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, observations: e.target.value }));
                    setSaveStatus("idle");
                  }}
                  placeholder="Enter any observations, departures from BS 7671, or recommendations..."
                  className="min-h-[200px]"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 10. Design / Construction / Inspection */}
        {activeSection === "signatories" && (
          <div className="max-w-[900px]">
            <EICSignatorySection
              designSection={data.designSection}
              constructionSection={data.constructionSection}
              inspectionSection={data.inspectionSection}
              sameAsDesigner={data.sameAsDesigner}
              designSignature={designSig}
              constructionSignature={constructionSig}
              inspectionSignature={inspectionSig}
              onDesignChange={(designSection) => {
                setData((prev) => ({ ...prev, designSection }));
                setSaveStatus("idle");
              }}
              onConstructionChange={(constructionSection) => {
                setData((prev) => ({ ...prev, constructionSection }));
                setSaveStatus("idle");
              }}
              onInspectionChange={(inspectionSection) => {
                setData((prev) => ({ ...prev, inspectionSection }));
                setSaveStatus("idle");
              }}
              onSameAsDesignerChange={(sameAsDesigner) => {
                setData((prev) => ({ ...prev, sameAsDesigner }));
                setSaveStatus("idle");
              }}
              onDesignSignatureChange={setDesignSig}
              onConstructionSignatureChange={setConstructionSig}
              onInspectionSignatureChange={setInspectionSig}
            />
          </div>
        )}

        {/* 11. Next Inspection */}
        {activeSection === "nextInspection" && (
          <div className="max-w-[900px]">
            <Card>
              <CardHeader>
                <CardTitle>Next Inspection</CardTitle>
                <CardDescription>Recommended date and interval for the next periodic inspection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nextInspectionDate">Next Inspection Date</Label>
                    <Input id="nextInspectionDate" type="date" value={data.nextInspectionDate} onChange={(e) => { setData((prev) => ({ ...prev, nextInspectionDate: e.target.value })); setSaveStatus("idle"); }} />
                  </div>
                  <div>
                    <Label htmlFor="retestInterval">Retest Interval</Label>
                    <NativeSelect id="retestInterval" value={data.retestInterval} onChange={(e) => { setData((prev) => ({ ...prev, retestInterval: e.target.value })); setSaveStatus("idle"); }}>
                      <option value="">Select...</option>
                      <option value="1">1 year</option>
                      <option value="2">2 years</option>
                      <option value="3">3 years</option>
                      <option value="5">5 years</option>
                      <option value="10">10 years</option>
                    </NativeSelect>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  BS 7671 recommended maximum intervals: Domestic - 10 years, Commercial - 5 years, Industrial - 3 years, Swimming pools - 1 year
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 12. Site Photos */}
        {activeSection === "photos" && (
          <div className="max-w-[1200px]">
            <Card>
              <CardHeader>
                <CardTitle>Site Photos</CardTitle>
                <CardDescription>Attach photos from the installation</CardDescription>
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

export default function EICPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
      </div>
    }>
      <EICPageContent />
    </Suspense>
  );
}
