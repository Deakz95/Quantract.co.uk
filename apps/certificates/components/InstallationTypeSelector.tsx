"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, Label, Textarea } from "@quantract/ui";

interface InstallationTypeSelectorProps {
  installationType: string;
  commentsOnExistingInstallation: string;
  onChange: (field: "installationType" | "commentsOnExistingInstallation", value: string) => void;
}

export function InstallationTypeSelector({ installationType, commentsOnExistingInstallation, onChange }: InstallationTypeSelectorProps) {
  const options = [
    { value: "new", label: "New Installation", description: "A completely new electrical installation" },
    { value: "addition", label: "Addition to Existing Installation", description: "New circuits or equipment added to an existing installation" },
    { value: "alteration", label: "Alteration to Existing Installation", description: "Changes made to an existing installation" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Type of Installation</CardTitle>
        <CardDescription>Select whether this is a new installation, addition, or alteration per BS 7671</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                installationType === option.value
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
              }`}
            >
              <input
                type="radio"
                name="installationType"
                value={option.value}
                checked={installationType === option.value}
                onChange={(e) => onChange("installationType", e.target.value)}
                className="mt-1 w-4 h-4 accent-[var(--primary)]"
              />
              <div>
                <p className="font-medium text-[var(--foreground)]">{option.label}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        {(installationType === "addition" || installationType === "alteration") && (
          <div className="mt-4">
            <Label htmlFor="commentsOnExisting">Comments on Existing Installation</Label>
            <Textarea
              id="commentsOnExisting"
              value={commentsOnExistingInstallation}
              onChange={(e) => onChange("commentsOnExistingInstallation", e.target.value)}
              placeholder="Describe the condition and any observations regarding the existing installation that may affect the new work..."
              className="min-h-[100px]"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Required when adding to or altering an existing installation
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
