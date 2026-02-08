"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type EICRCertificate, type BoardData as BoardDataType, migrateCircuit, getSignature, setSignature, clearSignature, hasSignature, migrateAllLegacySignatures } from "@quantract/shared/certificate-types";
import { InstrumentPicker } from "../../components/InstrumentPicker";
import type { SignatureValue } from "@quantract/shared/certificate-types";
import { applyDefaults } from "@quantract/shared/certificate-defaults";
import { useTemplateStore } from "../../lib/templateStore";
import { getLastUsedDefaults } from "../../lib/getLastUsedDefaults";
import { generateCertificatePDF } from "../../lib/pdf-generator";
import { EICRBoardSchedule } from "../../components/EICRBoardSchedule";
import {
  useCertificateStore,
  useStoreHydration,
  createNewCertificate,
  generateCertificateNumber,
  isCertificateEditable,
} from "../../lib/certificateStore";
import { useAutosave } from "../../lib/useAutosave";
import { getNextIncompleteStep } from "@quantract/shared/certificate-workflow";
import { CertificateLayout, SECTION_ICONS, type SectionConfig, type SectionStatus } from "../../components/CertificateLayout";
import { PhotoCapture } from "../../components/PhotoCapture";
import { ContractorDetails } from "../../components/ContractorDetails";
import { ExtentAndLimitations } from "../../components/ExtentAndLimitations";
import { InspectionChecklist } from "../../components/InspectionChecklist";
import { ObservationsList } from "../../components/ObservationsList";
import { SummaryOfCondition } from "../../components/SummaryOfCondition";
import { DeclarationSection } from "../../components/DeclarationSection";
import { ClientAcknowledgement } from "../../components/ClientAcknowledgement";

// BS 7671 default inspection items
const DEFAULT_INSPECTION_ITEMS = [
  // Section A - Consumer Unit / Distribution Board
  { category: "cu_distribution_board", itemCode: "A.1", description: "Consumer unit/distribution board correctly identified and labelled", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.2", description: "Adequacy of working space and accessibility", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.3", description: "Security of fixing", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.4", description: "Condition of enclosure (no damage, appropriate IP rating)", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.5", description: "Suitability for the environment (IP rating)", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.6", description: "Presence of main switch/circuit breakers", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.7", description: "Correct type and rating of protective devices", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.8", description: "RCD protection where required by BS 7671", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.9", description: "SPD (Surge Protection Device) where required", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.10", description: "Adequacy of cable connections and terminations", outcome: "" as const },
  { category: "cu_distribution_board", itemCode: "A.11", description: "Presence of danger notices and warning labels", outcome: "" as const },
  // Section B - Wiring Systems
  { category: "wiring_systems", itemCode: "B.1", description: "Identification of conductors", outcome: "" as const },
  { category: "wiring_systems", itemCode: "B.2", description: "Cables correctly supported and protected", outcome: "" as const },
  { category: "wiring_systems", itemCode: "B.3", description: "Condition of insulation of live parts", outcome: "" as const },
  { category: "wiring_systems", itemCode: "B.4", description: "Non-sheathed cables enclosed in conduit/trunking", outcome: "" as const },
  { category: "wiring_systems", itemCode: "B.5", description: "Correct selection of cable for current-carrying capacity and voltage drop", outcome: "" as const },
  { category: "wiring_systems", itemCode: "B.6", description: "Presence of fire barriers, seals and protection", outcome: "" as const },
  { category: "wiring_systems", itemCode: "B.7", description: "Cable routes do not compromise building structural integrity", outcome: "" as const },
  { category: "wiring_systems", itemCode: "B.8", description: "Cables concealed under floors/above ceilings correctly supported", outcome: "" as const },
  { category: "wiring_systems", itemCode: "B.9", description: "Condition of flexible cables and cord sets", outcome: "" as const },
  { category: "wiring_systems", itemCode: "B.10", description: "Adequacy of cables against external influences", outcome: "" as const },
  // Section C - Protection
  { category: "protection", itemCode: "C.1", description: "Protection against direct contact (basic protection)", outcome: "" as const },
  { category: "protection", itemCode: "C.2", description: "Protection against indirect contact (fault protection)", outcome: "" as const },
  { category: "protection", itemCode: "C.3", description: "Protection against overcurrent", outcome: "" as const },
  { category: "protection", itemCode: "C.4", description: "SELV / PELV systems correctly installed", outcome: "" as const },
  { category: "protection", itemCode: "C.5", description: "Coordination between overcurrent protective devices", outcome: "" as const },
  { category: "protection", itemCode: "C.6", description: "Prospective fault current does not exceed device capability", outcome: "" as const },
  // Section D - Accessories and Switchgear
  { category: "accessories_switchgear", itemCode: "D.1", description: "Condition of accessories (socket-outlets, switches, etc.)", outcome: "" as const },
  { category: "accessories_switchgear", itemCode: "D.2", description: "Suitability of accessories for their environment", outcome: "" as const },
  { category: "accessories_switchgear", itemCode: "D.3", description: "Single-pole switching in line conductor only", outcome: "" as const },
  { category: "accessories_switchgear", itemCode: "D.4", description: "Adequacy of connections at accessories", outcome: "" as const },
  { category: "accessories_switchgear", itemCode: "D.5", description: "Provision of earthing and bonding at accessories", outcome: "" as const },
  // Section E - Special Locations
  { category: "special_locations", itemCode: "E.1", description: "Bathroom/shower room zones correctly applied (BS 7671 Section 701)", outcome: "" as const },
  { category: "special_locations", itemCode: "E.2", description: "Swimming pool/spa requirements met (Section 702)", outcome: "" as const },
  { category: "special_locations", itemCode: "E.3", description: "Exterior lighting and power installations adequate (Section 714)", outcome: "" as const },
  { category: "special_locations", itemCode: "E.4", description: "Solar PV / generator installation compliant (Section 712/551)", outcome: "" as const },
];

type SectionId = "contractor" | "installation" | "extent" | "supply" | "earthing" | "inspection" | "boards" | "observations" | "summary" | "assessment" | "declaration" | "acknowledgement" | "photos";

const hasStr = (v: unknown) => typeof v === "string" && v.trim().length > 0;

function EICRPageContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get("id");
  const hydrated = useStoreHydration();

  const { addCertificate, updateCertificate, getCertificate } = useCertificateStore();

  const [data, setData] = useState<EICRCertificate>(() => {
    const rawTemplate = getCertificateTemplate("EICR");
    if (!certificateId) {
      const withDefaults = applyDefaults("EICR", rawTemplate as Record<string, unknown>, {
        companyProfile: useTemplateStore.getState().companyDefaults,
        lastUsedValues: getLastUsedDefaults("EICR"),
      });
      return withDefaults as EICRCertificate;
    }
    return rawTemplate as EICRCertificate;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCertId, setCurrentCertId] = useState<string | null>(certificateId);
  const [activeSection, setActiveSection] = useState<SectionId>("contractor");
  const [photos, setPhotos] = useState<string[]>([]);

  // V2 signature helpers — read/write from data._signatures
  const getsig = (role: string): SignatureValue | null =>
    getSignature(data as unknown as Record<string, unknown>, role) ?? null;
  const setSig = (role: string, sig: SignatureValue | null) => {
    setData((prev) => {
      const d = prev as unknown as Record<string, unknown>;
      const updated = sig ? setSignature(d, role, sig) : clearSignature(d, role);
      return updated as EICRCertificate;
    });
  };

  // Initialize inspection items if empty
  useEffect(() => {
    if (data.generalInspection.length === 0) {
      setData((prev) => ({
        ...prev,
        generalInspection: DEFAULT_INSPECTION_ITEMS,
      }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load existing certificate if ID is provided
  useEffect(() => {
    if (hydrated && certificateId) {
      const existing = getCertificate(certificateId);
      if (existing && existing.data) {
        const loaded = existing.data as EICRCertificate;
        // Ensure testInstruments exists (backward compat)
        if (!loaded.testInstruments) {
          (loaded as Record<string, unknown>).testInstruments = {
            instrumentSet: "", multiFunctionalSerial: "", insulationResistanceSerial: "",
            continuitySerial: "", earthFaultLoopSerial: "", rcdSerial: "",
          };
        }
        // Migrate legacy board circuits to new format
        if (loaded.boards) {
          loaded.boards = loaded.boards.map((b) => ({
            ...b,
            suppliedFrom: b.suppliedFrom ?? "",
            ocpdBsEn: b.ocpdBsEn ?? "",
            ocpdType: b.ocpdType ?? "",
            ocpdRating: b.ocpdRating ?? "",
            spdType: b.spdType ?? "",
            spdStatusChecked: b.spdStatusChecked ?? false,
            supplyPolarityConfirmed: b.supplyPolarityConfirmed ?? false,
            phaseSequenceConfirmed: b.phaseSequenceConfirmed ?? false,
            zsAtDb: b.zsAtDb ?? "",
            ipfAtDb: b.ipfAtDb ?? "",
            typeOfWiringOther: b.typeOfWiringOther ?? "",
            circuits: (b.circuits || []).map((c) =>
              c.circuitNumber !== undefined ? c : migrateCircuit(c as unknown as Record<string, unknown>)
            ),
          }));
        }
        // Log warning if old testResults data exists
        const tr = loaded.testResults;
        if (tr && (tr.continuityOfProtectiveConductors || tr.insulationResistance || tr.earthFaultLoopImpedance)) {
          console.warn("[EICR] Legacy testResults data found — test results are now captured per-circuit in distribution board schedules.");
        }
        // Migrate legacy signatures into _signatures (non-destructive)
        const withMigratedSigs = migrateAllLegacySignatures("EICR", loaded as unknown as Record<string, unknown>);
        Object.assign(loaded, { _signatures: (withMigratedSigs as Record<string, unknown>)._signatures });

        setData(loaded);
        setCurrentCertId(certificateId);

        // Resume at first incomplete section
        const nextStep = getNextIncompleteStep("EICR", loaded as unknown as Record<string, unknown>);
        if (nextStep && isCertificateEditable(existing)) {
          const sectionMap: Record<string, SectionId> = {
            contractorDetails: "contractor",
            overview: "installation",
            extentAndLimitations: "extent",
            supply: "supply",
            earthing: "earthing",
            generalInspection: "inspection",
            boards: "boards",
            observations: "observations",
            summaryOfCondition: "summary",
            overallAssessment: "assessment",
            declaration: "declaration",
            clientAcknowledgement: "acknowledgement",
            photos: "photos",
          };
          const mapped = sectionMap[nextStep];
          if (mapped) setActiveSection(mapped);
        }
      }
    }
  }, [certificateId, getCertificate, hydrated]);

  // Auto-calculated summary of condition
  const summaryOfCondition = useMemo(() => {
    let c1 = 0, c2 = 0, c3 = 0, fi = 0;
    // Count from observations
    for (const obs of data.observations) {
      if (obs.code === "C1") c1++;
      else if (obs.code === "C2") c2++;
      else if (obs.code === "C3") c3++;
      else if (obs.code === "FI") fi++;
    }
    // Count from inspection items
    for (const item of data.generalInspection) {
      if (item.outcome === "C1") c1++;
      else if (item.outcome === "C2") c2++;
      else if (item.outcome === "C3") c3++;
    }
    // Count from board circuits
    for (const board of data.boards) {
      for (const circuit of board.circuits) {
        if (circuit.code === "C1") c1++;
        else if (circuit.code === "C2") c2++;
        else if (circuit.code === "C3") c3++;
        else if (circuit.code === "FI") fi++;
      }
    }
    return { c1Count: c1, c2Count: c2, c3Count: c3, fiCount: fi };
  }, [data.observations, data.generalInspection, data.boards]);

  // Update summary in data when it changes
  useEffect(() => {
    setData((prev) => ({ ...prev, summaryOfCondition: summaryOfCondition }));
  }, [summaryOfCondition]);

  const updateOverview = (field: string, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      overview: { ...prev.overview, [field]: value },
    }));

  };

  const updateSupply = (field: string, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      supplyCharacteristics: { ...prev.supplyCharacteristics, [field]: value },
    }));

  };

  const updateEarthing = (field: string, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      earthingArrangements: { ...prev.earthingArrangements, [field]: value },
    }));

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
      suppliedFrom: "",
      ocpdBsEn: "",
      ocpdType: "",
      ocpdRating: "",
      spdType: "",
      spdStatusChecked: false,
      supplyPolarityConfirmed: false,
      phaseSequenceConfirmed: false,
      zsAtDb: "",
      ipfAtDb: "",
      typeOfWiringOther: "",
      circuits: [],
    };
    setData((prev) => ({
      ...prev,
      boards: [...prev.boards, newBoard],
    }));

  };

  const updateBoard = (index: number, updated: BoardDataType) => {
    setData((prev) => {
      const newBoards = [...prev.boards];
      newBoards[index] = updated;
      return { ...prev, boards: newBoards };
    });

  };

  const deleteBoard = (index: number) => {
    if (!confirm("Delete this distribution board and all its circuits?")) return;
    setData((prev) => ({
      ...prev,
      boards: prev.boards.filter((_, i) => i !== index),
    }));

  };

  const copyBoard = (index: number) => {
    const source = data.boards[index];
    const copied: BoardDataType = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} (Copy)`,
      circuits: source.circuits.map((c) => ({ ...c, id: crypto.randomUUID() })),
    };
    setData((prev) => ({
      ...prev,
      boards: [...prev.boards, copied],
    }));

  };

  const updateTestInstruments = (field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      testInstruments: { ...prev.testInstruments, [field]: value },
    }));

  };

  // ── Autosave hook ──
  const { saveStatus, isSaving, lastSaved, triggerSave, conflict } = useAutosave({
    certId: currentCertId,
    certType: "EICR",
    data: data as unknown as Record<string, unknown>,
    onSaveToStore: (id, d) => updateCertificate(id, {
      client_name: (d as any).overview?.clientName,
      installation_address: (d as any).overview?.installationAddress,
      data: d,
    }),
    onCreateCert: () => {
      const newCert = createNewCertificate("EICR", data as unknown as Record<string, unknown>);
      newCert.client_name = data.overview.clientName;
      newCert.installation_address = data.overview.installationAddress;
      newCert.certificate_number = data.overview.jobReference || generateCertificateNumber("EICR");
      addCertificate(newCert);
      setCurrentCertId(newCert.id);
      window.history.replaceState({}, "", `/eicr?id=${newCert.id}`);
      return newCert.id;
    },
  });

  const handleApplyTemplate = (mergedData: Record<string, unknown>) => {
    setData(mergedData as EICRCertificate);
  };
  const handleCopyFrom = (mergedData: Record<string, unknown>) => {
    setData(mergedData as EICRCertificate);
  };

  const handleDownload = async () => {
    triggerSave();

    setIsGenerating(true);
    try {
      const engineerSigV2 = getsig("inspector");
      const customerSigV2 = getsig("client");
      const pdfBytes = await generateCertificatePDF(data, {
        engineerSignature: engineerSigV2?.image?.dataUrl ?? null,
        customerSignature: customerSigV2?.image?.dataUrl ?? null,
        photos,
      });
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

  // ── Section configs with icons and status functions ──

  const sectionConfigs: SectionConfig[] = useMemo(() => [
    {
      id: "contractor",
      label: "Contractor Details",
      icon: SECTION_ICONS.building,
      getStatus: (): SectionStatus => hasStr(data.contractorDetails.companyName) ? "complete" : "empty",
    },
    {
      id: "installation",
      label: "Installation Details",
      icon: SECTION_ICONS.mapPin,
      getStatus: (): SectionStatus => {
        const hasClient = hasStr(data.overview.clientName);
        const hasAddress = hasStr(data.overview.installationAddress);
        if (hasClient && hasAddress) return "complete";
        if (hasClient || hasAddress) return "partial";
        return "empty";
      },
    },
    {
      id: "extent",
      label: "Extent & Limitations",
      icon: SECTION_ICONS.ruler,
      getStatus: (): SectionStatus => hasStr(data.extentAndLimitations.extentCovered) ? "complete" : "empty",
    },
    {
      id: "supply",
      label: "Supply Characteristics",
      icon: SECTION_ICONS.zap,
      getStatus: (): SectionStatus => hasStr(data.supplyCharacteristics.systemType) ? "complete" : "empty",
    },
    {
      id: "earthing",
      label: "Earthing Arrangements",
      icon: SECTION_ICONS.plug,
      getStatus: (): SectionStatus => hasStr(data.earthingArrangements.meansOfEarthing) ? "complete" : "empty",
    },
    {
      id: "inspection",
      label: "General Inspection",
      icon: SECTION_ICONS.clipboardCheck,
      getStatus: (): SectionStatus => {
        const filled = data.generalInspection.filter((item) => hasStr(item.outcome));
        if (filled.length === 0) return "empty";
        if (filled.length === data.generalInspection.length) return "complete";
        return "partial";
      },
    },
    {
      id: "boards",
      label: "Distribution Boards",
      icon: SECTION_ICONS.layoutGrid,
      getStatus: (): SectionStatus => {
        if (data.boards.length === 0) return "empty";
        const hasCircuits = data.boards.some(b => b.circuits.length > 0);
        return hasCircuits ? "complete" : "partial";
      },
    },
    {
      id: "observations",
      label: "Observations",
      icon: SECTION_ICONS.eye,
      getStatus: (): SectionStatus => "complete",
    },
    {
      id: "summary",
      label: "Summary of Condition",
      icon: SECTION_ICONS.clipboardList,
      getStatus: (): SectionStatus => "complete",
    },
    {
      id: "assessment",
      label: "Overall Assessment",
      icon: SECTION_ICONS.target,
      getStatus: (): SectionStatus => hasStr(data.overallCondition) ? "complete" : "empty",
    },
    {
      id: "declaration",
      label: "Declaration",
      icon: SECTION_ICONS.penTool,
      getStatus: (): SectionStatus => hasSignature(data as unknown as Record<string, unknown>, "inspector") ? "complete" : "empty",
    },
    {
      id: "acknowledgement",
      label: "Client Acknowledgement",
      icon: SECTION_ICONS.user,
      getStatus: (): SectionStatus => hasSignature(data as unknown as Record<string, unknown>, "client") ? "complete" : "empty",
    },
    {
      id: "photos",
      label: "Site Photos",
      icon: SECTION_ICONS.camera,
      getStatus: (): SectionStatus => "complete",
    },
  ], [
    data.contractorDetails.companyName,
    data.overview.clientName,
    data.overview.installationAddress,
    data.extentAndLimitations.extentCovered,
    data.supplyCharacteristics.systemType,
    data.earthingArrangements.meansOfEarthing,
    data.generalInspection,
    data.boards,
    data.overallCondition,
    data,
  ]);

  return (
    <CertificateLayout
      certType="EICR"
      sections={sectionConfigs}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as SectionId)}
      quickInfo={{
        client: data.overview.clientName || undefined,
        site: data.overview.installationAddress || undefined,
        date: undefined,
        reference: currentCertId ? `EICR-${currentCertId.slice(0, 6)}` : undefined,
      }}
      observationCounts={{
        c1: summaryOfCondition.c1Count,
        c2: summaryOfCondition.c2Count,
        c3: summaryOfCondition.c3Count,
        fi: summaryOfCondition.fiCount,
      }}
      saveStatus={saveStatus}
      lastSaved={lastSaved}
      onSave={triggerSave}
      onDownload={handleDownload}
      isSaving={isSaving}
      isGenerating={isGenerating}
      conflict={conflict}
      readOnly={!!conflict}
      onApplyTemplate={handleApplyTemplate}
      onCopyFrom={handleCopyFrom}
      currentData={data as unknown as Record<string, unknown>}
    >
      {/* 1. Contractor Details */}
      {activeSection === "contractor" && (
        <div className="space-y-5">
          <ContractorDetails
            data={data.contractorDetails}
            onChange={(contractorDetails) => {
              setData((prev) => ({ ...prev, contractorDetails }));
          
            }}
          />
        </div>
      )}

      {/* 2. Installation Details */}
      {activeSection === "installation" && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobReference">Report Reference</Label>
              <Input id="jobReference" value={data.overview.jobReference} onChange={(e) => updateOverview("jobReference", e.target.value)} placeholder="e.g. EICR-2026-001" />
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
              <Input id="estimatedAgeOfWiring" value={data.overview.estimatedAgeOfWiring} onChange={(e) => updateOverview("estimatedAgeOfWiring", e.target.value)} placeholder="e.g. 15 years" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfLastInspection">Date of Last Inspection</Label>
              <Input id="dateOfLastInspection" type="date" value={data.overview.dateOfLastInspection} onChange={(e) => updateOverview("dateOfLastInspection", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="previousReportReference">Previous Report Reference</Label>
              <Input id="previousReportReference" value={data.overview.previousReportReference} onChange={(e) => updateOverview("previousReportReference", e.target.value)} placeholder="Reference of previous report" />
            </div>
          </div>
          <div>
            <Label htmlFor="purposeOfReport">Purpose of Report</Label>
            <Input id="purposeOfReport" value={data.overview.purposeOfReport} onChange={(e) => updateOverview("purposeOfReport", e.target.value)} placeholder="e.g. Periodic inspection, Change of tenancy, Mortgage survey" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="evidenceOfAlterations" checked={data.overview.evidenceOfAlterations} onChange={(e) => updateOverview("evidenceOfAlterations", e.target.checked)} className="w-5 h-5 rounded accent-[var(--primary)]" />
            <Label htmlFor="evidenceOfAlterations" className="mb-0">Evidence of alterations or additions</Label>
          </div>
          {data.overview.evidenceOfAlterations && (
            <div>
              <Label htmlFor="alterationsDetails">Details of Alterations</Label>
              <Textarea id="alterationsDetails" value={data.overview.alterationsDetails} onChange={(e) => updateOverview("alterationsDetails", e.target.value)} placeholder="Describe any alterations or additions observed..." className="min-h-[60px]" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <input type="checkbox" id="recordsAvailable" checked={data.overview.recordsAvailable} onChange={(e) => updateOverview("recordsAvailable", e.target.checked)} className="w-5 h-5 rounded accent-[var(--primary)]" />
            <Label htmlFor="recordsAvailable" className="mb-0">Previous records available</Label>
          </div>
        </div>
      )}

      {/* 3. Extent & Limitations */}
      {activeSection === "extent" && (
        <div className="space-y-5">
          <ExtentAndLimitations
            data={data.extentAndLimitations}
            onChange={(extentAndLimitations) => {
              setData((prev) => ({ ...prev, extentAndLimitations }));
          
            }}
          />
        </div>
      )}

      {/* 4. Supply Characteristics */}
      {activeSection === "supply" && (
        <div className="space-y-5">
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
        </div>
      )}

      {/* 5. Earthing Arrangements */}
      {activeSection === "earthing" && (
        <div className="space-y-5">
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
        </div>
      )}

      {/* 6. General Inspection */}
      {activeSection === "inspection" && (
        <div className="space-y-5">
          <InspectionChecklist
            items={data.generalInspection}
            onChange={(generalInspection) => {
              setData((prev) => ({ ...prev, generalInspection: generalInspection as typeof prev.generalInspection }));
          
            }}
          />
        </div>
      )}

      {/* 7. Distribution Boards & Test Results */}
      {activeSection === "boards" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-[var(--muted-foreground)]">Circuit schedules and test results per BS 7671:2018+A2:2022</p>
            <Button variant="secondary" onClick={addBoard}>+ Add Board</Button>
          </div>

          {data.boards.length === 0 ? (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <p className="text-lg mb-2">No distribution boards added yet</p>
              <p className="text-sm">Click &quot;+ Add Board&quot; to add a consumer unit or distribution board</p>
            </div>
          ) : (
            data.boards.map((board, index) => (
              <EICRBoardSchedule
                key={board.id}
                board={board}
                allBoardNames={data.boards.map(b => b.name)}
                onBoardChange={(updated) => updateBoard(index, updated)}
                onDeleteBoard={() => deleteBoard(index)}
                onCopyBoard={() => copyBoard(index)}
              />
            ))
          )}

          {/* Details of Test Instruments */}
          <details className="border border-[var(--border)] rounded-xl overflow-hidden">
            <summary className="bg-[var(--muted)] px-4 py-3 cursor-pointer text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]/80 transition-colors select-none">
              Details of Test Instruments
            </summary>
            <div className="p-4 space-y-3">
              <div className="flex justify-end">
                <InstrumentPicker
                  onSelect={(fields) => {
                    Object.entries(fields).forEach(([key, val]) => {
                      if (val) updateTestInstruments(key, val);
                    });
                  }}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="instrumentSet">Instrument Set</Label>
                  <Input id="instrumentSet" value={data.testInstruments.instrumentSet} onChange={(e) => updateTestInstruments("instrumentSet", e.target.value)} placeholder="e.g. MFT1741+" />
                </div>
                <div>
                  <Label htmlFor="multiFunctionalSerial">Multi-functional Tester Serial No.</Label>
                  <Input id="multiFunctionalSerial" value={data.testInstruments.multiFunctionalSerial} onChange={(e) => updateTestInstruments("multiFunctionalSerial", e.target.value)} placeholder="Serial number" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="insulationResistanceSerial">Insulation Resistance Tester Serial No.</Label>
                  <Input id="insulationResistanceSerial" value={data.testInstruments.insulationResistanceSerial} onChange={(e) => updateTestInstruments("insulationResistanceSerial", e.target.value)} placeholder="Serial number" />
                </div>
                <div>
                  <Label htmlFor="continuitySerial">Continuity Tester Serial No.</Label>
                  <Input id="continuitySerial" value={data.testInstruments.continuitySerial} onChange={(e) => updateTestInstruments("continuitySerial", e.target.value)} placeholder="Serial number" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="earthFaultLoopSerial">Earth Fault Loop Impedance Tester Serial No.</Label>
                  <Input id="earthFaultLoopSerial" value={data.testInstruments.earthFaultLoopSerial} onChange={(e) => updateTestInstruments("earthFaultLoopSerial", e.target.value)} placeholder="Serial number" />
                </div>
                <div>
                  <Label htmlFor="rcdSerial">RCD Tester Serial No.</Label>
                  <Input id="rcdSerial" value={data.testInstruments.rcdSerial} onChange={(e) => updateTestInstruments("rcdSerial", e.target.value)} placeholder="Serial number" />
                </div>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* 8. Observations */}
      {activeSection === "observations" && (
        <div className="space-y-5">
          <ObservationsList
            observations={data.observations}
            onChange={(observations) => {
              setData((prev) => ({ ...prev, observations }));
          
            }}
          />
        </div>
      )}

      {/* 9. Summary of Condition */}
      {activeSection === "summary" && (
        <div className="space-y-5">
          <SummaryOfCondition
            c1Count={summaryOfCondition.c1Count}
            c2Count={summaryOfCondition.c2Count}
            c3Count={summaryOfCondition.c3Count}
            fiCount={summaryOfCondition.fiCount}
          />
        </div>
      )}

      {/* 10. Overall Assessment */}
      {activeSection === "assessment" && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="overallCondition">Overall Condition</Label>
              <NativeSelect id="overallCondition" value={data.overallCondition} onChange={(e) => setData((prev) => ({ ...prev, overallCondition: e.target.value as EICRCertificate["overallCondition"] }))}>
                <option value="">Select...</option>
                <option value="satisfactory">Satisfactory</option>
                <option value="unsatisfactory">Unsatisfactory</option>
                <option value="further_investigation">Further Investigation Required</option>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="recommendedRetestDate">Recommended Retest Date</Label>
              <Input id="recommendedRetestDate" type="date" value={data.recommendedRetestDate} onChange={(e) => setData((prev) => ({ ...prev, recommendedRetestDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="retestInterval">Retest Interval</Label>
            <NativeSelect id="retestInterval" value={data.retestInterval} onChange={(e) => setData((prev) => ({ ...prev, retestInterval: e.target.value }))}>
              <option value="">Select...</option>
              <option value="1">1 year</option>
              <option value="2">2 years</option>
              <option value="3">3 years</option>
              <option value="5">5 years</option>
              <option value="10">10 years</option>
            </NativeSelect>
          </div>
          <div>
            <Label htmlFor="inspectorComments">Inspector Comments</Label>
            <Textarea id="inspectorComments" value={data.inspectorComments} onChange={(e) => { setData((prev) => ({ ...prev, inspectorComments: e.target.value })); }} placeholder="Any additional comments by the inspector..." className="min-h-[100px]" />
          </div>
        </div>
      )}

      {/* 11. Declaration */}
      {activeSection === "declaration" && (
        <div className="space-y-5">
          <DeclarationSection
            role="inspector"
            data={data.declarationDetails}
            onChange={(declarationDetails) => {
              setData((prev) => ({ ...prev, declarationDetails }));
            }}
            signatureValue={getsig("inspector")}
            onSignatureChange={(sig) => setSig("inspector", sig)}
          />
        </div>
      )}

      {/* 12. Client Acknowledgement */}
      {activeSection === "acknowledgement" && (
        <div className="space-y-5">
          <ClientAcknowledgement
            data={data.clientAcknowledgement}
            onChange={(clientAcknowledgement) => {
              setData((prev) => ({ ...prev, clientAcknowledgement }));
            }}
            signatureValue={getsig("client")}
            onSignatureChange={(sig) => setSig("client", sig)}
          />
        </div>
      )}

      {/* 13. Site Photos */}
      {activeSection === "photos" && (
        <div className="space-y-5">
          <PhotoCapture photos={photos} onChange={setPhotos} />
        </div>
      )}
    </CertificateLayout>
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
