"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Input, Label, NativeSelect, Textarea } from "@quantract/ui";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { SubCard } from "../../components/ui/SubCard";
import { FloatingInput } from "../../components/ui/FloatingInput";
import { FloatingSelect } from "../../components/ui/FloatingSelect";
import { getCertificateTemplate, type MWCCertificate, getSignature, setSignature, clearSignature, hasSignature, migrateAllLegacySignatures } from "@quantract/shared/certificate-types";
import type { SignatureValue } from "@quantract/shared/certificate-types";
import { applyDefaults } from "@quantract/shared/certificate-defaults";
import { useTemplateStore } from "../../lib/templateStore";
import { getLastUsedDefaults } from "../../lib/getLastUsedDefaults";
import { generateCertificatePDF } from "../../lib/pdf-generator";
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
import { DeclarationSection } from "../../components/DeclarationSection";

type SectionId = "contractor" | "installation" | "work" | "circuit" | "tests" | "observations" | "declaration" | "nextInspection" | "photos";

function MWCPageContent() {
  const searchParams = useSearchParams();
  const certificateId = searchParams.get("id");
  const hydrated = useStoreHydration();

  const { addCertificate, updateCertificate, getCertificate } = useCertificateStore();

  const [data, setData] = useState<MWCCertificate>(() => {
    const rawTemplate = getCertificateTemplate("MWC");
    if (!certificateId) {
      const withDefaults = applyDefaults("MWC", rawTemplate as Record<string, unknown>, {
        companyProfile: useTemplateStore.getState().companyDefaults,
        lastUsedValues: getLastUsedDefaults("MWC"),
      });
      return withDefaults as MWCCertificate;
    }
    return rawTemplate as MWCCertificate;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCertId, setCurrentCertId] = useState<string | null>(certificateId);
  const [activeSection, setActiveSection] = useState<SectionId>("contractor");
  const [photos, setPhotos] = useState<string[]>([]);

  // V2 signature helpers
  const getsig = (role: string): SignatureValue | null =>
    getSignature(data as unknown as Record<string, unknown>, role) ?? null;
  const setSig = (role: string, sig: SignatureValue | null) => {
    setData((prev) => {
      const d = prev as unknown as Record<string, unknown>;
      const updated = sig ? setSignature(d, role, sig) : clearSignature(d, role);
      return updated as MWCCertificate;
    });
  };

  // Load existing certificate if ID is provided (only after hydration)
  useEffect(() => {
    if (hydrated && certificateId) {
      const existing = getCertificate(certificateId);
      if (existing && existing.data) {
        const loaded = existing.data as MWCCertificate;
        const withMigratedSigs = migrateAllLegacySignatures("MWC", loaded as unknown as Record<string, unknown>);
        Object.assign(loaded, { _signatures: (withMigratedSigs as Record<string, unknown>)._signatures });

        setData(loaded);
        setCurrentCertId(certificateId);

        // Resume at first incomplete section
        const nextStep = getNextIncompleteStep("MWC", loaded as unknown as Record<string, unknown>);
        if (nextStep && isCertificateEditable(existing)) {
          const sectionMap: Record<string, SectionId> = {
            contractorDetails: "contractor",
            overview: "installation",
            workDescription: "work",
            circuitDetails: "circuit",
            tests: "tests",
            observations: "observations",
            declaration: "declaration",
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

  const updateCircuit = (field: string, value: string) => {
    setData((prev) => ({
      ...prev,
      circuitDetails: { ...prev.circuitDetails, [field]: value },
    }));

  };

  const updateTests = (field: string, value: string | boolean) => {
    setData((prev) => ({
      ...prev,
      testResults: { ...prev.testResults, [field]: value },
    }));

  };

  const handleApplyTemplate = (mergedData: Record<string, unknown>) => {
    setData(mergedData as MWCCertificate);
  };
  const handleCopyFrom = (mergedData: Record<string, unknown>) => {
    setData(mergedData as MWCCertificate);
  };

  // ── Autosave hook ──
  const { saveStatus, isSaving, lastSaved, triggerSave, conflict } = useAutosave({
    certId: currentCertId,
    certType: "MWC",
    data: data as unknown as Record<string, unknown>,
    onSaveToStore: (id, d) => updateCertificate(id, {
      client_name: (d as any).overview?.clientName,
      installation_address: (d as any).overview?.installationAddress,
      data: d,
    }),
    onCreateCert: () => {
      const newCert = createNewCertificate("MWC", data as unknown as Record<string, unknown>);
      newCert.client_name = data.overview.clientName;
      newCert.installation_address = data.overview.installationAddress;
      newCert.certificate_number = data.overview.jobReference || generateCertificateNumber("MWC");
      addCertificate(newCert);
      setCurrentCertId(newCert.id);
      window.history.replaceState({}, "", `/mwc?id=${newCert.id}`);
      return newCert.id;
    },
  });

  const handleDownload = async () => {
    triggerSave();

    setIsGenerating(true);
    try {
      const installerSigV2 = getsig("installer");
      const pdfBytes = await generateCertificatePDF(data, {
        engineerSignature: installerSigV2?.image?.dataUrl ?? null,
        customerSignature: null,
        photos,
      });
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MWC-${data.overview.jobReference || "certificate"}.pdf`;
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
      getStatus: (): SectionStatus => {
        if (data.contractorDetails.companyName) return "complete";
        const has = Object.values(data.contractorDetails).some((v) => typeof v === "string" && v.trim());
        return has ? "partial" : "empty";
      },
    },
    {
      id: "installation",
      label: "Installation Details",
      icon: SECTION_ICONS.mapPin,
      getStatus: (): SectionStatus => {
        if (data.overview.clientName && data.overview.installationAddress) return "complete";
        const has = data.overview.clientName || data.overview.installationAddress || data.overview.jobReference || data.overview.dateOfInspection;
        return has ? "partial" : "empty";
      },
    },
    {
      id: "work",
      label: "Description of Work",
      icon: SECTION_ICONS.wrench,
      getStatus: (): SectionStatus => {
        if (data.workDescription || data.overview.jobDescription) return "complete";
        if (data.extentOfWork) return "partial";
        return "empty";
      },
    },
    {
      id: "circuit",
      label: "Circuit Details",
      icon: SECTION_ICONS.zap,
      getStatus: (): SectionStatus => {
        if (data.circuitDetails.circuitReference) return "complete";
        const has = Object.values(data.circuitDetails).some((v) => typeof v === "string" && v.trim());
        return has ? "partial" : "empty";
      },
    },
    {
      id: "tests",
      label: "Test Results",
      icon: SECTION_ICONS.barChart,
      getStatus: (): SectionStatus => {
        const vals = Object.values(data.testResults).filter((v) => typeof v === "string" && v.trim());
        if (vals.length >= 3) return "complete";
        if (vals.length > 0) return "partial";
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
      id: "declaration",
      label: "Declaration",
      icon: SECTION_ICONS.penTool,
      getStatus: (): SectionStatus => {
        if (hasSignature(data as unknown as Record<string, unknown>, "installer")) return "complete";
        const has = Object.values(data.declarationDetails || {}).some((v) => typeof v === "string" && v.trim());
        return has ? "partial" : "empty";
      },
    },
    {
      id: "nextInspection",
      label: "Next Inspection",
      icon: SECTION_ICONS.calendar,
      getStatus: (): SectionStatus => {
        if (data.nextInspectionDate) return "complete";
        return "empty";
      },
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
      certType="MWC"
      sections={sectionConfigs}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as SectionId)}
      quickInfo={{
        client: data.overview.clientName || undefined,
        site: data.overview.installationAddress || undefined,
        date: undefined,
        reference: currentCertId ? `MWC-${currentCertId.slice(0, 6)}` : undefined,
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
          <SectionHeading number={2} title="Installation Details" fieldCount={7} />
          <div className="grid md:grid-cols-2 gap-4">
            <SubCard title="Report Info">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="jobReference">Certificate Reference</Label>
                  <Input id="jobReference" value={data.overview.jobReference} onChange={(e) => updateOverview("jobReference", e.target.value)} placeholder="e.g. MWC-2026-001" />
                </div>
                <div>
                  <Label htmlFor="dateOfInspection">Date of Work</Label>
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
            <div>
              <Label htmlFor="installationAddress">Installation Address</Label>
              <Textarea id="installationAddress" value={data.overview.installationAddress} onChange={(e) => updateOverview("installationAddress", e.target.value)} placeholder="Full address of the installation" className="min-h-[80px]" />
            </div>
          </SubCard>
          <div className="grid md:grid-cols-2 gap-4">
            <SubCard title="Premises">
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
            </SubCard>
            <SubCard title="Scope">
              <div>
                <Label htmlFor="partOfInstallation">Part of Installation Covered</Label>
                <Input id="partOfInstallation" value={data.partOfInstallation} onChange={(e) => { setData((prev) => ({ ...prev, partOfInstallation: e.target.value })); }} placeholder="e.g. Ground floor kitchen circuit" />
              </div>
            </SubCard>
          </div>
        </div>
      )}

      {/* 3. Description of Work */}
      {activeSection === "work" && (
        <div className="space-y-4">
          <SectionHeading number={3} title="Description of Work" fieldCount={2} />
          <SubCard title="Extent & Description">
            <div className="space-y-3">
              <FloatingSelect label="Extent of Work" value={data.extentOfWork} onChange={(e) => { setData((prev) => ({ ...prev, extentOfWork: e.target.value as MWCCertificate["extentOfWork"] })); }}>
                <option value="">Select...</option>
                <option value="addition_to_circuit">Addition to an existing circuit</option>
                <option value="repair">Repair to an existing circuit</option>
                <option value="replacement">Like-for-like replacement</option>
                <option value="other">Other</option>
              </FloatingSelect>
              <div>
                <Label htmlFor="workDescription">Work Description</Label>
                <Textarea
                  id="workDescription"
                  value={data.workDescription}
                  onChange={(e) => {
                    setData((prev) => ({ ...prev, workDescription: e.target.value }));
                  }}
                  placeholder="Describe the work carried out, e.g. Installation of additional socket outlet, replacement of light fitting..."
                  className="min-h-[150px]"
                />
              </div>
            </div>
          </SubCard>
        </div>
      )}

      {/* 4. Circuit Details */}
      {activeSection === "circuit" && (
        <div className="space-y-4">
          <SectionHeading number={4} title="Circuit Details" fieldCount={10} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FloatingInput label="Circuit Affected" value={data.circuitDetails.circuitAffected} onChange={(e) => updateCircuit("circuitAffected", e.target.value)} placeholder="Ring final, Lighting" />
            <FloatingInput label="Circuit Reference" value={data.circuitDetails.circuitReference} onChange={(e) => updateCircuit("circuitReference", e.target.value)} placeholder="Circuit 3, Ring 1" />
            <FloatingInput label="Location" value={data.circuitDetails.location} onChange={(e) => updateCircuit("location", e.target.value)} placeholder="Kitchen, First floor" />
            <FloatingSelect label="Means of Protection" value={data.circuitDetails.meansOfProtection} onChange={(e) => updateCircuit("meansOfProtection", e.target.value)}>
              <option value="">Select...</option>
              <option value="MCB">MCB</option>
              <option value="RCBO">RCBO</option>
              <option value="Fuse_BS3036">Fuse BS 3036</option>
              <option value="Fuse_BS1361">Fuse BS 1361</option>
              <option value="Fuse_BS88">Fuse BS 88</option>
              <option value="Other">Other</option>
            </FloatingSelect>
            <FloatingInput label="Protective Device" value={data.circuitDetails.protectiveDevice} onChange={(e) => updateCircuit("protectiveDevice", e.target.value)} placeholder="MCB Type B" />
            <FloatingSelect label="Rating" value={data.circuitDetails.rating} onChange={(e) => updateCircuit("rating", e.target.value)}>
              <option value="">Select...</option>
              <option value="6">6A</option>
              <option value="10">10A</option>
              <option value="16">16A</option>
              <option value="20">20A</option>
              <option value="32">32A</option>
              <option value="40">40A</option>
              <option value="45">45A</option>
              <option value="50">50A</option>
            </FloatingSelect>
            <FloatingInput label="BS EN Number" value={data.circuitDetails.bsEnNumber} onChange={(e) => updateCircuit("bsEnNumber", e.target.value)} placeholder="BS EN 60898" />
            <FloatingInput label="Cable Reference" value={data.circuitDetails.cableReference} onChange={(e) => updateCircuit("cableReference", e.target.value)} placeholder="6242Y T&E" />
            <FloatingInput label="Cable CSA - Live" value={data.circuitDetails.cableCsaLive} onChange={(e) => updateCircuit("cableCsaLive", e.target.value)} unit="mm²" placeholder="2.5" />
            <FloatingInput label="Cable CSA - CPC" value={data.circuitDetails.cableCsaCpc} onChange={(e) => updateCircuit("cableCsaCpc", e.target.value)} unit="mm²" placeholder="1.5" />
          </div>
        </div>
      )}

      {/* 5. Test Results */}
      {activeSection === "tests" && (
        <div className="space-y-4">
          <SectionHeading number={5} title="Test Results" fieldCount={10} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <FloatingInput label="Continuity R1+R2" value={data.testResults.continuity} onChange={(e) => updateTests("continuity", e.target.value)} unit="Ω" placeholder="0.25" />
            <FloatingInput label="R2" value={data.testResults.r2} onChange={(e) => updateTests("r2", e.target.value)} unit="Ω" placeholder="0.15" />
            <FloatingInput label="Insulation L-E" value={data.testResults.insulationResistanceLE} onChange={(e) => updateTests("insulationResistanceLE", e.target.value)} unit="MΩ" placeholder=">200" />
            <FloatingInput label="Insulation L-N" value={data.testResults.insulationResistanceLN} onChange={(e) => updateTests("insulationResistanceLN", e.target.value)} unit="MΩ" placeholder=">200" />
            <FloatingInput label="Zs" value={data.testResults.earthFaultLoopImpedance} onChange={(e) => updateTests("earthFaultLoopImpedance", e.target.value)} unit="Ω" placeholder="0.45" />
            <FloatingInput label="RCD Operating Time" value={data.testResults.rcdOperatingTime} onChange={(e) => updateTests("rcdOperatingTime", e.target.value)} unit="ms" placeholder="25" />
            <FloatingInput label="RCD Operating Current" value={data.testResults.rcdOperatingCurrent} onChange={(e) => updateTests("rcdOperatingCurrent", e.target.value)} unit="mA" placeholder="30" />
            <FloatingSelect label="RCD Type" value={data.testResults.rcdType} onChange={(e) => updateTests("rcdType", e.target.value)}>
              <option value="">Select...</option>
              <option value="AC">Type AC</option>
              <option value="A">Type A</option>
              <option value="B">Type B</option>
              <option value="F">Type F</option>
            </FloatingSelect>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="polarityConfirmed" checked={data.testResults.polarityConfirmed} onChange={(e) => updateTests("polarityConfirmed", e.target.checked)} className="w-5 h-5 rounded accent-blue-500" />
            <Label htmlFor="polarityConfirmed" className="mb-0">Polarity confirmed</Label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="testButtonOperates" checked={data.testResults.testButtonOperates} onChange={(e) => updateTests("testButtonOperates", e.target.checked)} className="w-5 h-5 rounded accent-blue-500" />
            <Label htmlFor="testButtonOperates" className="mb-0">RCD test button operates correctly</Label>
          </div>

          <SubCard title="Ring Final Circuit Tests (if applicable)">
            <div className="grid grid-cols-3 gap-3">
              <FloatingInput label="Ring R1" value={data.testResults.ringContinuityR1} onChange={(e) => updateTests("ringContinuityR1", e.target.value)} unit="Ω" placeholder="0.28" />
              <FloatingInput label="Ring Rn" value={data.testResults.ringContinuityRn} onChange={(e) => updateTests("ringContinuityRn", e.target.value)} unit="Ω" placeholder="0.30" />
              <FloatingInput label="Ring R2" value={data.testResults.ringContinuityR2} onChange={(e) => updateTests("ringContinuityR2", e.target.value)} unit="Ω" placeholder="0.45" />
            </div>
          </SubCard>
        </div>
      )}

      {/* 6. Observations */}
      {activeSection === "observations" && (
        <div className="space-y-4">
          <SectionHeading number={6} title="Observations" />
          <SubCard title="General Observations">
            <Textarea
              value={data.observations}
              onChange={(e) => {
                setData((prev) => ({ ...prev, observations: e.target.value }));
              }}
              placeholder="Enter any observations or comments about the work carried out..."
              className="min-h-[150px]"
            />
          </SubCard>
        </div>
      )}

      {/* 7. Declaration */}
      {activeSection === "declaration" && (
        <DeclarationSection
          role="installer"
          data={data.declarationDetails}
          onChange={(declarationDetails) => {
            setData((prev) => ({ ...prev, declarationDetails }));
          }}
          signatureValue={getsig("installer")}
          onSignatureChange={(sig) => setSig("installer", sig)}
        />
      )}

      {/* 8. Next Inspection */}
      {activeSection === "nextInspection" && (
        <div className="space-y-4">
          <SectionHeading number={8} title="Next Inspection" fieldCount={1} />
          <SubCard title="Recommended Re-inspection">
            <div>
              <Label htmlFor="nextInspectionDate">Recommended Next Inspection Date</Label>
              <Input id="nextInspectionDate" type="date" value={data.nextInspectionDate} onChange={(e) => { setData((prev) => ({ ...prev, nextInspectionDate: e.target.value })); }} />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              This should be consistent with the periodic inspection interval for the installation
            </p>
          </SubCard>
        </div>
      )}

      {/* 9. Site Photos */}
      {activeSection === "photos" && (
        <div className="space-y-5">
          <PhotoCapture photos={photos} onChange={setPhotos} />
        </div>
      )}
    </CertificateLayout>
  );
}

export default function MWCPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
      </div>
    }>
      <MWCPageContent />
    </Suspense>
  );
}
