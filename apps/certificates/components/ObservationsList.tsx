"use client";

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Label,
  NativeSelect,
  Textarea,
} from "@quantract/ui";

interface Observation {
  code: string;
  observation: string;
  recommendation: string;
  location: string;
  regulationReference: string;
  inspectionItemCode: string;
  actionTaken: string;
  actionRecommended: string;
}

interface ObservationsListProps {
  observations: Observation[];
  onChange: (observations: Observation[]) => void;
}

const CODE_BORDER_COLORS: Record<string, string> = {
  C1: "border-l-4 border-l-red-500",
  C2: "border-l-4 border-l-amber-500",
  C3: "border-l-4 border-l-yellow-400",
  FI: "border-l-4 border-l-blue-500",
};

const EMPTY_OBSERVATION: Observation = {
  code: "",
  observation: "",
  recommendation: "",
  location: "",
  regulationReference: "",
  inspectionItemCode: "",
  actionTaken: "",
  actionRecommended: "",
};

export function ObservationsList({ observations, onChange }: ObservationsListProps) {
  const addObservation = () => {
    onChange([...observations, { ...EMPTY_OBSERVATION }]);
  };

  const updateObservation = (index: number, field: keyof Observation, value: string) => {
    const updated = observations.map((obs, i) =>
      i === index ? { ...obs, [field]: value } : obs
    );
    onChange(updated);
  };

  const removeObservation = (index: number) => {
    onChange(observations.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Observations</CardTitle>
            <CardDescription>
              Record any defects or observations (C1, C2, C3, FI codes)
            </CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={addObservation}>
            Add Observation
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {observations.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No observations recorded
          </p>
        ) : (
          observations.map((obs, index) => (
            <div
              key={index}
              className={`p-4 border border-[var(--border)] rounded-xl space-y-3 ${
                CODE_BORDER_COLORS[obs.code] || ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Observation {index + 1}
                </span>
                <button
                  onClick={() => removeObservation(index)}
                  className="text-[var(--error)] text-sm hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="grid md:grid-cols-4 gap-3">
                <div>
                  <Label>Code</Label>
                  <NativeSelect
                    value={obs.code}
                    onChange={(e) =>
                      updateObservation(index, "code", e.target.value)
                    }
                  >
                    <option value="">Select...</option>
                    <option value="C1">C1 - Danger present</option>
                    <option value="C2">C2 - Potentially dangerous</option>
                    <option value="C3">C3 - Improvement recommended</option>
                    <option value="FI">FI - Further investigation</option>
                  </NativeSelect>
                </div>
                <div className="md:col-span-3">
                  <Label>Location</Label>
                  <Input
                    value={obs.location}
                    onChange={(e) =>
                      updateObservation(index, "location", e.target.value)
                    }
                    placeholder="Location of defect"
                  />
                </div>
              </div>

              <div>
                <Label>Observation</Label>
                <Textarea
                  value={obs.observation}
                  onChange={(e) =>
                    updateObservation(index, "observation", e.target.value)
                  }
                  placeholder="Describe the observation"
                  className="min-h-[60px]"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Regulation Reference</Label>
                  <Input
                    value={obs.regulationReference}
                    onChange={(e) =>
                      updateObservation(
                        index,
                        "regulationReference",
                        e.target.value
                      )
                    }
                    placeholder="e.g. 411.3.3"
                  />
                </div>
                <div>
                  <Label>Action Recommended</Label>
                  <Input
                    value={obs.actionRecommended}
                    onChange={(e) =>
                      updateObservation(
                        index,
                        "actionRecommended",
                        e.target.value
                      )
                    }
                    placeholder="Recommended remedial action"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export type { Observation, ObservationsListProps };
