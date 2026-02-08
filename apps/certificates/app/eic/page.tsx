"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { getCertificateTemplate, type EICCertificate, type BoardData as BoardDataType, getSignature, setSignature, clearSignature, hasSignature, migrateAllLegacySignatures } from "@quantract/shared/certificate-types";
import type { SignatureValue } from "@quantract/shared/certificate-types";
import { applyDefaults } from "@quantract/shared/certificate-defaults";
import { useTemplateStore } from "../../lib/templateStore";
import { getLastUsedDefaults } from "../../lib/getLastUsedDefaults";
import { generateCertificatePDF } from "../../lib/pdf-generator";
import BoardViewer, { type BoardData } from "../../components/BoardViewer";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { SubCard } from "../../components/ui/SubCard";
import { FloatingInput } from "../../components/ui/FloatingInput";
import { FloatingSelect } from "../../components/ui/FloatingSelect";
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
import { InstallationTypeSelector } from "../../components/InstallationTypeSelector";
import { EICSignatorySection } from "../../components/EICSignatorySection";
import { ObservationsList } from "../../components/ObservationsList";

type SectionId = "contractor" | "installation" | "type" | "supply" | "earthing" | "origin" | "boards" | "tests" | "observations" | "signatories" | "nextInspection" | "photos";

function EICPageContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get("id");
  const hydrated = useStoreHydration();

  const { addCertificate, updateCertificate, getCertificate } = useCertificateStore();

  const [data, setData] = useState<EICCertificate>(() => {
    const rawTemplate = getCertificateTemplate("EIC");
    if (!certificateId) {
      const withDefaults = applyDefaults("EIC", rawTemplate as Record<string, unknown>, {
        companyProfile: useTemplateStore.getState().companyDefaults,
        lastUsedValues: getLastUsedDefaults("EIC"),
      });
      return withDefaults as EICCertificate;
    }
    return rawTemplate as EICCertificate;
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
      return updated as EICCertificate;
    });
  };

  // Load existing certificate if ID is provided (only after hydration)
  useEffect(() => {
    if (hydrated && certificateId) {
      const existing = getCertificate(certificateId);
      if (existing && existing.data) {
        const loaded = existing.data as EICCertificate;
        // Migrate legacy signatures into _signatures (non-destructive)
        const withMigratedSigs = migrateAllLegacySignatures("EIC", loaded as unknown as Record<string, unknown>);
        Object.assign(loaded, { _signatures: (withMigratedSigs as Record<string, unknown>)._signatures });

        setData(loaded);
        setCurrentCertId(certificateId);

        // Resume at first incomplete section
        const nextStep = getNextIncompleteStep("EIC", existing.data as Record<string, unknown>);
        if (nextStep && isCertificateEditable(existing)) {
          const sectionMap: Record<string, SectionId> = {
            contractorDetails: "contractor",
            overview: "installation",
            installationType: "type",
            supply: "supply",
            earthing: "earthing",
            origin: "origin",
            boards: "boards",
            tests: "tests",
            observations: "observations",
            signatories: "signatories",
            nextInspection: "nextInspection",
            photos: "photos",
          };
          const mapped = sectionMap[nextStep];
          if (mapped) setActiveSection(mapped);
        }
      }
    }
  }, [certificateId, getCertificate, hydrated]);

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

  const updateTests = (field: string, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
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

  const handleApplyTemplate = (mergedData: Record<string, unknown>) => {
    setData(mergedData as EICCertificate);
  };
  const handleCopyFrom = (mergedData: Record<string, unknown>) => {
    setData(mergedData as EICCertificate);
  };

  // ── Autosave hook ──
  const { saveStatus, isSaving, lastSaved, triggerSave, conflict } = useAutosave({
    certId: currentCertId,
    certType: "EIC",
    data: data as unknown as Record<string, unknown>,
    onSaveToStore: (id, d) => updateCertificate(id, {
      client_name: (d as any).overview?.clientName,
      installation_address: (d as any).overview?.installationAddress,
      data: d,
    }),
    onCreateCert: () => {
      const newCert = createNewCertificate("EIC", data as unknown as Record<string, unknown>);
      newCert.client_name = data.overview.clientName;
      newCert.installation_address = data.overview.installationAddress;
      newCert.certificate_number = data.overview.jobReference || generateCertificateNumber("EIC");
      addCertificate(newCert);
      setCurrentCertId(newCert.id);
      window.history.replaceState({}, "", `/eic?id=${newCert.id}`);
      return newCert.id;
    },
  });

  const handleDownload = async () => {
    triggerSave();

    setIsGenerating(true);
    try {
      const designSigV2 = getsig("designer");
      const pdfBytes = await generateCertificatePDF(data, {
        engineerSignature: designSigV2?.image?.dataUrl ?? null,
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

  // Section configs with icons and status functions
  const sectionConfigs: SectionConfig[] = useMemo(() => [
    {
      id: "contractor",
      label: "Contractor Details",
      icon: SECTION_ICONS.building,
      getStatus: (): SectionStatus => data.contractorDetails.companyName ? "complete" : "empty",
    },
    {
      id: "installation",
      label: "Installation Details",
      icon: SECTION_ICONS.mapPin,
      getStatus: (): SectionStatus => {
        if (data.overview.clientName && data.overview.installationAddress) return "complete";
        if (data.overview.clientName || data.overview.installationAddress) return "partial";
        return "empty";
      },
    },
    {
      id: "type",
      label: "Type of Installation",
      icon: SECTION_ICONS.fileText,
      getStatus: (): SectionStatus => data.installationType ? "complete" : "empty",
    },
    {
      id: "supply",
      label: "Supply Characteristics",
      icon: SECTION_ICONS.zap,
      getStatus: (): SectionStatus => {
        if (data.supplyCharacteristics.systemType || data.supplyCharacteristics.numberOfPhases) return "complete";
        return "empty";
      },
    },
    {
      id: "earthing",
      label: "Earthing Arrangements",
      icon: SECTION_ICONS.plug,
      getStatus: (): SectionStatus => data.earthingArrangements.meansOfEarthing ? "complete" : "empty",
    },
    {
      id: "origin",
      label: "Particulars at Origin",
      icon: SECTION_ICONS.settings,
      getStatus: (): SectionStatus => {
        const hasType = !!data.originMainSwitchType;
        const hasRating = !!data.originMainSwitchRating;
        const hasLocation = !!data.originMainSwitchLocation;
        if (hasType && hasRating && hasLocation) return "complete";
        if (hasType || hasRating || hasLocation) return "partial";
        return "empty";
      },
    },
    {
      id: "boards",
      label: "Distribution Boards",
      icon: SECTION_ICONS.layoutGrid,
      getStatus: (): SectionStatus => data.boards.length > 0 ? "complete" : "empty",
    },
    {
      id: "tests",
      label: "Test Results",
      icon: SECTION_ICONS.barChart,
      getStatus: (): SectionStatus => {
        const t = data.testResults;
        if (t.continuityOfProtectiveConductors || t.insulationResistance || t.earthFaultLoopImpedance) return "complete";
        return "empty";
      },
    },
    {
      id: "observations",
      label: "Observations",
      icon: SECTION_ICONS.eye,
      getStatus: (): SectionStatus => "complete",
    },
    {
      id: "signatories",
      label: "Design / Construction / Inspection",
      icon: SECTION_ICONS.penTool,
      getStatus: (): SectionStatus => {
        const d = data as unknown as Record<string, unknown>;
        if (hasSignature(d, "designer") || hasSignature(d, "installer") || hasSignature(d, "inspector")) return "complete";
        if (data.designSection?.name || data.constructionSection?.name || data.inspectionSection?.name) return "partial";
        return "empty";
      },
    },
    {
      id: "nextInspection",
      label: "Next Inspection",
      icon: SECTION_ICONS.calendar,
      getStatus: (): SectionStatus => data.nextInspectionDate ? "complete" : "empty",
    },
    {
      id: "photos",
      label: "Site Photos",
      icon: SECTION_ICONS.camera,
      getStatus: (): SectionStatus => "complete",
    },
  ], [data]);

  return (
    <CertificateLayout
      certType="EIC"
      sections={sectionConfigs}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as SectionId)}
      quickInfo={{
        client: data.overview.clientName || undefined,
        site: data.overview.installationAddress || undefined,
        date: undefined,
        reference: currentCertId ? `EIC-${currentCertId.slice(0, 6)}` : undefined,
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
        <ContractorDetails
          data={data.contractorDetails}
          onChange={(contractorDetails) => {
            setData((prev) => ({ ...prev, contractorDetails }));
        
          }}
        />
      )}

      {/* 2. Installation Details */}
      {activeSection === "installation" && (
        <div className="space-y-4">
          <SectionHeading number={2} title="Installation Details" fieldCount={9} />
          <div className="grid md:grid-cols-2 gap-4">
            <SubCard title="Report Info">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="jobReference">Certificate Reference</Label>
                  <Input id="jobReference" value={data.overview.jobReference} onChange={(e) => updateOverview("jobReference", e.target.value)} placeholder="e.g. EIC-2026-001" />
                </div>
                <div>
                  <Label htmlFor="dateOfInspection">Date of Inspection</Label>
                  <Input id="dateOfInspection" type="date" value={data.overview.dateOfInspection} onChange={(e) => updateOverview("dateOfInspection", e.target.value)} />
                </div>
              </div>
            </SubCard>
            <SubCard title="Client & Occupier">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input id="clientName" value={data.overview.clientName} onChange={(e) => updateOverview("clientName", e.target.value)} placeholder="Client or company name" />
                </div>
                <div>
                  <Label htmlFor="occupier">Occupier</Label>
                  <Input id="occupier" value={data.overview.occupier} onChange={(e) => updateOverview("occupier", e.target.value)} placeholder="Occupier name (if different)" />
                </div>
              </div>
            </SubCard>
          </div>
          <SubCard title="Address">
            <div className="space-y-3">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input id="siteName" value={data.overview.siteName} onChange={(e) => updateOverview("siteName", e.target.value)} placeholder="Site or property name" />
              </div>
              <div>
                <Label htmlFor="installationAddress">Installation Address</Label>
                <Textarea id="installationAddress" value={data.overview.installationAddress} onChange={(e) => updateOverview("installationAddress", e.target.value)} placeholder="Full address of the installation" className="min-h-[80px]" />
              </div>
            </div>
          </SubCard>
          <div className="grid md:grid-cols-2 gap-4">
            <SubCard title="Premises">
              <div className="space-y-3">
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
            </SubCard>
            <SubCard title="Description of Work">
              <div>
                <Label htmlFor="jobDescription">Description of Work</Label>
                <Textarea id="jobDescription" value={data.overview.jobDescription} onChange={(e) => updateOverview("jobDescription", e.target.value)} placeholder="Describe the installation work carried out" className="min-h-[80px]" />
              </div>
            </SubCard>
          </div>
        </div>
      )}

      {/* 3. Type of Installation */}
      {activeSection === "type" && (
        <InstallationTypeSelector
          installationType={data.installationType}
          commentsOnExistingInstallation={data.commentsOnExistingInstallation}
          onChange={(field, value) => {
            setData((prev) => ({ ...prev, [field]: value }));
        
          }}
        />
      )}

      {/* 4. Supply Characteristics */}
      {activeSection === "supply" && (
        <div className="space-y-4">
          <SectionHeading number={4} title="Supply Characteristics" fieldCount={11} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FloatingSelect label="System Type" value={data.supplyCharacteristics.systemType} onChange={(e) => updateSupply("systemType", e.target.value)}>
              <option value="">Select...</option>
              <option value="TN-C-S">TN-C-S (PME)</option>
              <option value="TN-S">TN-S</option>
              <option value="TT">TT</option>
              <option value="IT">IT</option>
            </FloatingSelect>
            <FloatingSelect label="No. of Phases" value={data.supplyCharacteristics.numberOfPhases} onChange={(e) => updateSupply("numberOfPhases", e.target.value)}>
              <option value="">Select...</option>
              <option value="single">Single Phase</option>
              <option value="three">Three Phase</option>
            </FloatingSelect>
            <FloatingSelect label="Nature of Supply" value={data.supplyCharacteristics.natureOfSupply} onChange={(e) => updateSupply("natureOfSupply", e.target.value)}>
              <option value="">Select...</option>
              <option value="AC">AC</option>
              <option value="DC">DC</option>
            </FloatingSelect>
            <FloatingInput label="Voltage to Earth" value={data.supplyCharacteristics.nominalVoltageToEarth} onChange={(e) => updateSupply("nominalVoltageToEarth", e.target.value)} unit="V" placeholder="230" />
            <FloatingInput label="Between Phases" value={data.supplyCharacteristics.nominalVoltageBetweenPhases} onChange={(e) => updateSupply("nominalVoltageBetweenPhases", e.target.value)} unit="V" placeholder="400" />
            <FloatingInput label="Frequency" value={data.supplyCharacteristics.frequency} onChange={(e) => updateSupply("frequency", e.target.value)} unit="Hz" placeholder="50" />
            <FloatingInput label="Prospective Fault Current" value={data.supplyCharacteristics.prospectiveFaultCurrent} onChange={(e) => updateSupply("prospectiveFaultCurrent", e.target.value)} unit="kA" placeholder="16" />
            <FloatingInput label="External Ze" value={data.supplyCharacteristics.externalLoopImpedance} onChange={(e) => updateSupply("externalLoopImpedance", e.target.value)} unit={"\u03A9"} placeholder="0.35" />
            <FloatingInput label="Device Type" value={data.supplyCharacteristics.supplyProtectiveDeviceType} onChange={(e) => updateSupply("supplyProtectiveDeviceType", e.target.value)} placeholder="BS 88 Fuse" />
            <FloatingInput label="Device Rating" value={data.supplyCharacteristics.supplyProtectiveDeviceRating} onChange={(e) => updateSupply("supplyProtectiveDeviceRating", e.target.value)} unit="A" placeholder="100" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="otherSourcesOfSupply" checked={data.supplyCharacteristics.otherSourcesOfSupply} onChange={(e) => updateSupply("otherSourcesOfSupply", e.target.checked)} className="w-5 h-5 rounded accent-blue-500" />
            <Label htmlFor="otherSourcesOfSupply" className="mb-0">Other sources of supply (e.g. generator, solar PV)</Label>
          </div>
          {data.supplyCharacteristics.otherSourcesOfSupply && (
            <FloatingInput label="Other Sources Details" value={data.supplyCharacteristics.otherSourcesDetails} onChange={(e) => updateSupply("otherSourcesDetails", e.target.value)} placeholder="Describe other sources" />
          )}
        </div>
      )}

      {/* 5. Earthing Arrangements */}
      {activeSection === "earthing" && (
        <div className="space-y-4">
          <SectionHeading number={5} title="Earthing Arrangements" fieldCount={9} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <FloatingSelect label="Means of Earthing" value={data.earthingArrangements.meansOfEarthing} onChange={(e) => updateEarthing("meansOfEarthing", e.target.value)}>
              <option value="">Select...</option>
              <option value="supply_distributor">Supply Distributor</option>
              <option value="earth_electrode">Earth Electrode</option>
              <option value="other">Other</option>
            </FloatingSelect>
            <FloatingSelect label="Electrode Type" value={data.earthingArrangements.earthElectrodeType} onChange={(e) => updateEarthing("earthElectrodeType", e.target.value)}>
              <option value="">Select...</option>
              <option value="rod">Rod</option>
              <option value="tape">Tape</option>
              <option value="plate">Plate</option>
              <option value="ring">Ring</option>
              <option value="foundation">Foundation</option>
              <option value="other">Other</option>
            </FloatingSelect>
            <FloatingInput label="Earthing Conductor Type" value={data.earthingArrangements.earthingConductorType} onChange={(e) => updateEarthing("earthingConductorType", e.target.value)} placeholder="Copper" />
            <FloatingInput label="Earthing Conductor Size" value={data.earthingArrangements.earthingConductorSize} onChange={(e) => updateEarthing("earthingConductorSize", e.target.value)} unit="mm²" placeholder="16" />
            <FloatingInput label="Main Bonding Type" value={data.earthingArrangements.mainProtectiveBondingType} onChange={(e) => updateEarthing("mainProtectiveBondingType", e.target.value)} placeholder="Copper" />
            <FloatingInput label="Main Bonding Size" value={data.earthingArrangements.mainProtectiveBondingSize} onChange={(e) => updateEarthing("mainProtectiveBondingSize", e.target.value)} unit="mm²" placeholder="10" />
            <FloatingInput label="Ze Measured" value={data.earthingArrangements.zeMeasured} onChange={(e) => updateEarthing("zeMeasured", e.target.value)} unit={"\u03A9"} placeholder="0.35" />
          </div>

          {/* Bonding checklist */}
          <SubCard title="Main Protective Bonding Connected To">
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
                  <input type="checkbox" id={key} checked={(data.earthingArrangements as Record<string, unknown>)[key] as boolean} onChange={(e) => updateEarthing(key, e.target.checked)} className="w-4 h-4 rounded accent-blue-500" />
                  <Label htmlFor={key} className="mb-0 text-sm">{label}</Label>
                </div>
              ))}
            </div>
            {data.earthingArrangements.bondingToOther && (
              <div className="mt-3">
                <FloatingInput label="Other Bonding Details" value={data.earthingArrangements.bondingToOtherDetails} onChange={(e) => updateEarthing("bondingToOtherDetails", e.target.value)} placeholder="Specify other bonding" />
              </div>
            )}
          </SubCard>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="supplementaryBondingPresent" checked={data.earthingArrangements.supplementaryBondingPresent} onChange={(e) => updateEarthing("supplementaryBondingPresent", e.target.checked)} className="w-5 h-5 rounded accent-blue-500" />
            <Label htmlFor="supplementaryBondingPresent" className="mb-0">Supplementary bonding present</Label>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="earthElectrode" checked={data.earthingArrangements.earthElectrode} onChange={(e) => updateEarthing("earthElectrode", e.target.checked)} className="w-5 h-5 rounded accent-blue-500" />
            <Label htmlFor="earthElectrode" className="mb-0">Earth electrode installed</Label>
          </div>
          {data.earthingArrangements.earthElectrode && (
            <FloatingInput label="Earth Electrode Resistance" value={data.earthingArrangements.earthElectrodeResistance} onChange={(e) => updateEarthing("earthElectrodeResistance", e.target.value)} unit={"\u03A9"} placeholder="20" />
          )}
        </div>
      )}

      {/* 6. Particulars of Installation at Origin */}
      {activeSection === "origin" && (
        <div className="space-y-4">
          <SectionHeading number={6} title="Particulars at Origin" fieldCount={5} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FloatingInput label="Main Switch Type" value={data.originMainSwitchType} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchType: e.target.value })); }} placeholder="Isolator, RCD, RCBO" />
            <FloatingInput label="Main Switch Rating" value={data.originMainSwitchRating} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchRating: e.target.value })); }} unit="A" placeholder="100" />
            <FloatingInput label="BS EN Number" value={data.originMainSwitchBsEn} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchBsEn: e.target.value })); }} placeholder="BS EN 60947-3" />
            <FloatingSelect label="Number of Poles" value={data.originMainSwitchPoles} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchPoles: e.target.value })); }}>
              <option value="">Select...</option>
              <option value="SP">Single Pole (SP)</option>
              <option value="DP">Double Pole (DP)</option>
              <option value="TP">Triple Pole (TP)</option>
              <option value="TPN">TP&N</option>
              <option value="4P">4 Pole</option>
            </FloatingSelect>
            <FloatingInput label="Location" value={data.originMainSwitchLocation} onChange={(e) => { setData((prev) => ({ ...prev, originMainSwitchLocation: e.target.value })); }} placeholder="Hallway cupboard" />
          </div>
        </div>
      )}

      {/* 7. Distribution Boards */}
      {activeSection === "boards" && (
        <div className="space-y-5">
          <div className="flex items-center justify-end">
            <button
              onClick={addBoard}
              className="px-3 py-1.5 rounded-sm text-sm font-medium bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] transition-colors"
            >
              + Add Board
            </button>
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
        <div className="space-y-4">
          <SectionHeading number={8} title="Test Results" fieldCount={6} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FloatingInput label="Continuity R1+R2" value={data.testResults.continuityOfProtectiveConductors} onChange={(e) => updateTests("continuityOfProtectiveConductors", e.target.value)} unit="Ω" placeholder="0.25" />
            <FloatingInput label="Insulation Resistance" value={data.testResults.insulationResistance} onChange={(e) => updateTests("insulationResistance", e.target.value)} unit="MΩ" placeholder=">200" />
            <FloatingInput label="Zs" value={data.testResults.earthFaultLoopImpedance} onChange={(e) => updateTests("earthFaultLoopImpedance", e.target.value)} unit="Ω" placeholder="0.45" />
            <FloatingInput label="RCD Operating Time" value={data.testResults.rcdOperatingTime} onChange={(e) => updateTests("rcdOperatingTime", e.target.value)} unit="ms" placeholder="25" />
            <FloatingInput label="RCD Operating Current" value={data.testResults.rcdOperatingCurrent} onChange={(e) => updateTests("rcdOperatingCurrent", e.target.value)} unit="mA" placeholder="30" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="polarityConfirmed" checked={data.testResults.polarityConfirmed} onChange={(e) => updateTests("polarityConfirmed", e.target.checked)} className="w-5 h-5 rounded accent-blue-500" />
            <Label htmlFor="polarityConfirmed" className="mb-0">Polarity confirmed</Label>
          </div>
        </div>
      )}

      {/* 9. Observations */}
      {activeSection === "observations" && (
        <div className="space-y-4">
          <SectionHeading number={9} title="Observations" />
          <SubCard title="General Observations">
            <Textarea
              value={data.observations}
              onChange={(e) => {
                setData((prev) => ({ ...prev, observations: e.target.value }));
              }}
              placeholder="Enter any observations, departures from BS 7671, or recommendations..."
              className="min-h-[200px]"
            />
          </SubCard>
        </div>
      )}

      {/* 10. Design / Construction / Inspection */}
      {activeSection === "signatories" && (
        <EICSignatorySection
          designSection={data.designSection}
          constructionSection={data.constructionSection}
          inspectionSection={data.inspectionSection}
          sameAsDesigner={data.sameAsDesigner}
          designSignature={getsig("designer")}
          constructionSignature={getsig("installer")}
          inspectionSignature={getsig("inspector")}
          onDesignChange={(designSection) => {
            setData((prev) => ({ ...prev, designSection }));
          }}
          onConstructionChange={(constructionSection) => {
            setData((prev) => ({ ...prev, constructionSection }));
          }}
          onInspectionChange={(inspectionSection) => {
            setData((prev) => ({ ...prev, inspectionSection }));
          }}
          onSameAsDesignerChange={(sameAsDesigner) => {
            setData((prev) => ({ ...prev, sameAsDesigner }));
          }}
          onDesignSignatureChange={(sig) => setSig("designer", sig)}
          onConstructionSignatureChange={(sig) => setSig("installer", sig)}
          onInspectionSignatureChange={(sig) => setSig("inspector", sig)}
        />
      )}

      {/* 11. Next Inspection */}
      {activeSection === "nextInspection" && (
        <div className="space-y-4">
          <SectionHeading number={11} title="Next Inspection" fieldCount={2} />
          <SubCard title="Recommended Re-inspection">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="nextInspectionDate">Next Inspection Date</Label>
                <Input id="nextInspectionDate" type="date" value={data.nextInspectionDate} onChange={(e) => { setData((prev) => ({ ...prev, nextInspectionDate: e.target.value })); }} />
              </div>
              <FloatingSelect label="Retest Interval" value={data.retestInterval} onChange={(e) => { setData((prev) => ({ ...prev, retestInterval: e.target.value })); }}>
                <option value="">Select...</option>
                <option value="1">1 year</option>
                <option value="2">2 years</option>
                <option value="3">3 years</option>
                <option value="5">5 years</option>
                <option value="10">10 years</option>
              </FloatingSelect>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              BS 7671 recommended maximum intervals: Domestic — 10 years, Commercial — 5 years, Industrial — 3 years, Swimming pools — 1 year
            </p>
          </SubCard>
        </div>
      )}

      {/* 12. Site Photos */}
      {activeSection === "photos" && (
        <div className="space-y-5">
          <PhotoCapture photos={photos} onChange={setPhotos} />
        </div>
      )}
    </CertificateLayout>
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
