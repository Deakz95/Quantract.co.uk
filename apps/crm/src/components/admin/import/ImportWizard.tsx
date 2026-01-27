"use client";

import { useState } from "react";
import { Stepper } from "@/components/ui/Stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UploadStep, type UploadResult } from "./UploadStep";
import { MappingStep, type ColumnMapping } from "./MappingStep";
import { PreviewStep } from "./PreviewStep";
import { ProgressStep } from "./ProgressStep";
import { Users, Building2, TrendingUp } from "lucide-react";

type EntityType = "contact" | "client" | "deal";
type Step = "select" | "upload" | "mapping" | "preview" | "progress";

interface ValidationResult {
  validRows: number;
  totalRows: number;
  errorRows: { row: number; errors: string[] }[];
}

const STEPS = ["Select Type", "Upload", "Map Columns", "Preview", "Import"];

export function ImportWizard() {
  const [currentStep, setCurrentStep] = useState<Step>("select");
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);

  const stepIndex = {
    select: 0,
    upload: 1,
    mapping: 2,
    preview: 3,
    progress: 4,
  };

  const handleEntitySelect = (type: EntityType) => {
    setEntityType(type);
    setCurrentStep("upload");
  };

  const handleUploadComplete = (result: UploadResult) => {
    setUploadResult(result);
    setCurrentStep("mapping");
  };

  const handleMappingComplete = (newMapping: ColumnMapping) => {
    setMapping(newMapping);
    setCurrentStep("preview");
  };

  const handleValidationComplete = () => {
    setCurrentStep("progress");
  };

  const handleComplete = () => {
    // Redirect to the entity list or reset
    window.location.href = `/admin/${entityType}s`;
  };

  const handleStartNew = () => {
    setCurrentStep("select");
    setEntityType(null);
    setUploadResult(null);
    setMapping(null);
  };

  const entityOptions = [
    {
      type: "contact" as EntityType,
      label: "Contacts",
      description: "Import contact details like names, emails, phone numbers",
      icon: Users,
    },
    {
      type: "client" as EntityType,
      label: "Clients",
      description: "Import client/company information with addresses",
      icon: Building2,
    },
    {
      type: "deal" as EntityType,
      label: "Deals",
      description: "Import deals/opportunities with values and stages",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Stepper steps={STEPS} active={stepIndex[currentStep]} />

      {/* Step Content */}
      {currentStep === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>What would you like to import?</CardTitle>
            <CardDescription>
              Select the type of data you want to import from your file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {entityOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => handleEntitySelect(option.type)}
                  className="group rounded-xl border-2 border-[var(--border)] bg-[var(--card)] p-6 text-left transition-all hover:border-[var(--primary)] hover:shadow-lg"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 transition-colors group-hover:bg-[var(--primary)]/20">
                    <option.icon className="h-6 w-6 text-[var(--primary)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    {option.label}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === "upload" && entityType && (
        <UploadStep
          entityType={entityType}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {currentStep === "mapping" && entityType && uploadResult && (
        <MappingStep
          headers={uploadResult.headers}
          entityType={entityType}
          onMappingComplete={handleMappingComplete}
          onBack={() => setCurrentStep("upload")}
        />
      )}

      {currentStep === "preview" && entityType && uploadResult && mapping && (
        <PreviewStep
          fileKey={uploadResult.fileKey}
          mapping={mapping}
          entityType={entityType}
          onValidationComplete={handleValidationComplete}
          onBack={() => setCurrentStep("mapping")}
        />
      )}

      {currentStep === "progress" && entityType && uploadResult && mapping && (
        <ProgressStep
          fileKey={uploadResult.fileKey}
          fileName={uploadResult.fileName}
          mapping={mapping}
          entityType={entityType}
          onComplete={handleComplete}
          onStartNew={handleStartNew}
        />
      )}
    </div>
  );
}
