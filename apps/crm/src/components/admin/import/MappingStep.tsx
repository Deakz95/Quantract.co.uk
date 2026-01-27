"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export type ColumnMapping = {
  [csvColumn: string]: string;
};

export type TargetField = {
  name: string;
  label: string;
  required: boolean;
};

interface MappingStepProps {
  headers: string[];
  entityType: "contact" | "client" | "deal";
  onMappingComplete: (mapping: ColumnMapping) => void;
  onBack: () => void;
}

// Target fields for each entity type
const TARGET_FIELDS: Record<string, TargetField[]> = {
  contact: [
    { name: "firstName", label: "First Name", required: true },
    { name: "lastName", label: "Last Name", required: true },
    { name: "email", label: "Email", required: false },
    { name: "phone", label: "Phone", required: false },
    { name: "mobile", label: "Mobile", required: false },
    { name: "jobTitle", label: "Job Title", required: false },
    { name: "notes", label: "Notes", required: false },
    { name: "preferredChannel", label: "Preferred Channel", required: false },
  ],
  client: [
    { name: "name", label: "Company Name", required: true },
    { name: "email", label: "Email", required: true },
    { name: "phone", label: "Phone", required: false },
    { name: "address1", label: "Address Line 1", required: false },
    { name: "address2", label: "Address Line 2", required: false },
    { name: "city", label: "City", required: false },
    { name: "county", label: "County/State", required: false },
    { name: "postcode", label: "Postcode/ZIP", required: false },
    { name: "country", label: "Country", required: false },
    { name: "notes", label: "Notes", required: false },
  ],
  deal: [
    { name: "title", label: "Deal Title", required: true },
    { name: "value", label: "Value", required: false },
    { name: "probability", label: "Probability (%)", required: false },
    { name: "expectedCloseDate", label: "Expected Close Date", required: false },
    { name: "notes", label: "Notes", required: false },
    { name: "source", label: "Source", required: false },
  ],
};

// Auto-mapping suggestions based on common column names
const AUTO_MAP_SUGGESTIONS: Record<string, string[]> = {
  firstName: ["first name", "firstname", "first_name", "fname", "given name"],
  lastName: ["last name", "lastname", "last_name", "lname", "surname", "family name"],
  email: ["email", "e-mail", "email address", "emailaddress"],
  phone: ["phone", "telephone", "tel", "phone number", "phonenumber"],
  mobile: ["mobile", "cell", "cellphone", "mobile phone"],
  jobTitle: ["job title", "jobtitle", "title", "position", "role"],
  notes: ["notes", "note", "comments", "comment", "description"],
  preferredChannel: ["preferred channel", "channel", "contact method"],
  name: ["company", "company name", "companyname", "organization", "org", "name"],
  address1: ["address", "address1", "address 1", "street", "street address"],
  address2: ["address2", "address 2", "address line 2", "apt", "suite"],
  city: ["city", "town"],
  county: ["county", "state", "region", "province"],
  postcode: ["postcode", "postal code", "zip", "zipcode", "zip code"],
  country: ["country", "nation"],
  title: ["title", "deal title", "deal name", "opportunity", "name"],
  value: ["value", "amount", "deal value", "worth", "price"],
  probability: ["probability", "chance", "likelihood", "win probability"],
  expectedCloseDate: ["close date", "expected close", "closing date", "due date"],
  source: ["source", "lead source", "origin", "channel"],
};

export function MappingStep({
  headers,
  entityType,
  onMappingComplete,
  onBack,
}: MappingStepProps) {
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const targetFields = TARGET_FIELDS[entityType];

  // Auto-map columns on mount
  useEffect(() => {
    const autoMapping: ColumnMapping = {};

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();

      for (const field of targetFields) {
        const suggestions = AUTO_MAP_SUGGESTIONS[field.name] || [];
        if (
          suggestions.includes(normalizedHeader) ||
          normalizedHeader === field.name.toLowerCase() ||
          normalizedHeader === field.label.toLowerCase()
        ) {
          // Only map if not already mapped to another column
          const alreadyMapped = Object.values(autoMapping).includes(field.name);
          if (!alreadyMapped) {
            autoMapping[header] = field.name;
            break;
          }
        }
      }
    }

    setMapping(autoMapping);
  }, [headers, entityType, targetFields]);

  const handleMappingChange = (csvColumn: string, fieldName: string) => {
    setMapping((prev) => {
      const newMapping = { ...prev };

      if (fieldName === "") {
        // Unmapping
        delete newMapping[csvColumn];
      } else {
        // First, remove any existing mapping to this field
        for (const key of Object.keys(newMapping)) {
          if (newMapping[key] === fieldName) {
            delete newMapping[key];
          }
        }
        // Set new mapping
        newMapping[csvColumn] = fieldName;
      }

      return newMapping;
    });
  };

  const requiredFieldsMapped = targetFields
    .filter((f) => f.required)
    .every((f) => Object.values(mapping).includes(f.name));

  const getMappedColumn = (fieldName: string): string | null => {
    for (const [col, field] of Object.entries(mapping)) {
      if (field === fieldName) return col;
    }
    return null;
  };

  const handleContinue = () => {
    if (requiredFieldsMapped) {
      onMappingComplete(mapping);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Map Your Columns</CardTitle>
          <CardDescription>
            Match your CSV columns to the corresponding fields. Required fields are marked with *.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {targetFields.map((field) => {
              const mappedColumn = getMappedColumn(field.name);
              const isMapped = mappedColumn !== null;

              return (
                <div
                  key={field.name}
                  className="flex items-center gap-4 rounded-lg border border-[var(--border)] p-3"
                >
                  {/* Target field */}
                  <div className="w-1/3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {field.label}
                        {field.required && (
                          <span className="ml-1 text-[var(--error)]">*</span>
                        )}
                      </span>
                      {isMapped && (
                        <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />

                  {/* CSV column selector */}
                  <div className="flex-1">
                    <select
                      value={mappedColumn || ""}
                      onChange={(e) =>
                        e.target.value
                          ? handleMappingChange(e.target.value, field.name)
                          : mappedColumn && handleMappingChange(mappedColumn, "")
                      }
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    >
                      <option value="">-- Select column --</option>
                      {headers.map((header) => {
                        const isUsed = Boolean(
                          mapping[header] && mapping[header] !== field.name
                        );
                        return (
                          <option
                            key={header}
                            value={header}
                            disabled={isUsed}
                          >
                            {header}
                            {isUsed ? " (already mapped)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {!requiredFieldsMapped && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--warning)]/10 p-3 text-sm text-[var(--warning)]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Please map all required fields to continue</span>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleContinue} disabled={!requiredFieldsMapped}>
              Continue to Preview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
