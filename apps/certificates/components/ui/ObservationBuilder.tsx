"use client";

import { useState, useMemo } from "react";
import { PillSelector } from "./PillSelector";

export interface Observation {
  code: string;
  observation: string;
  recommendation: string;
  location: string;
  regulationReference: string;
  inspectionItemCode: string;
  actionTaken: string;
  actionRecommended: string;
}

interface ObservationBuilderProps {
  observations: Observation[];
  onChange: (observations: Observation[]) => void;
}

const CODE_OPTIONS = [
  { label: "C1", value: "C1", color: "bg-red-600 text-white" },
  { label: "C2", value: "C2", color: "bg-amber-600 text-white" },
  { label: "C3", value: "C3", color: "bg-yellow-600 text-white" },
  { label: "FI", value: "FI", color: "bg-blue-600 text-white" },
];

const CODE_BORDER: Record<string, string> = {
  C1: "border-l-red-500",
  C2: "border-l-amber-500",
  C3: "border-l-yellow-400",
  FI: "border-l-blue-500",
};

const CODE_BG: Record<string, string> = {
  C1: "bg-red-500",
  C2: "bg-amber-500",
  C3: "bg-yellow-400",
  FI: "bg-blue-500",
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

export function ObservationBuilder({ observations, onChange }: ObservationBuilderProps) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const counts = useMemo(() => {
    const c = { C1: 0, C2: 0, C3: 0, FI: 0 };
    for (const obs of observations) {
      if (obs.code in c) c[obs.code as keyof typeof c]++;
    }
    return c;
  }, [observations]);

  const addObservation = () => {
    onChange([...observations, { ...EMPTY_OBSERVATION }]);
  };

  const updateObservation = (index: number, field: keyof Observation, value: string) => {
    const updated = observations.map((obs, i) =>
      i === index ? { ...obs, [field]: value } : obs,
    );
    onChange(updated);
  };

  const removeObservation = (index: number) => {
    onChange(observations.filter((_, i) => i !== index));
    setCollapsed((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const total = observations.length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {total > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#1a1f2e] border border-white/10 px-4 py-2.5">
          <span className="text-sm font-semibold text-[#e2e8f0]">
            {total} observation{total !== 1 ? "s" : ""}
          </span>
          <div className="h-4 w-px bg-white/10" />
          {(["C1", "C2", "C3", "FI"] as const).map((code) => (
            <div key={code} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${CODE_BG[code]}`} />
              <span className="text-xs text-gray-400">
                <strong className="text-[#e2e8f0]">{counts[code]}</strong> {code}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Observation cards */}
      {observations.map((obs, index) => {
        const isCollapsed = collapsed[index];
        const borderColor = CODE_BORDER[obs.code] || "border-l-white/10";

        return (
          <div
            key={index}
            className={`bg-[#1a1f2e] border border-white/10 border-l-4 ${borderColor} rounded-lg overflow-hidden`}
          >
            {/* Header row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => toggleCollapse(index)}
            >
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isCollapsed ? "" : "rotate-90"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-sm font-semibold text-[#e2e8f0]">
                #{index + 1}
              </span>
              {obs.code && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    CODE_BG[obs.code] ? `${CODE_BG[obs.code]} text-white` : "bg-white/10 text-gray-400"
                  }`}
                >
                  {obs.code}
                </span>
              )}
              <span className="text-sm text-gray-400 truncate flex-1">
                {obs.observation || obs.location || "New observation"}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeObservation(index);
                }}
                className="text-xs text-red-400 hover:text-red-300 transition-colors shrink-0"
              >
                Remove
              </button>
            </div>

            {/* Expanded body */}
            {!isCollapsed && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                {/* Code pills */}
                <div className="pt-3">
                  <PillSelector
                    options={CODE_OPTIONS}
                    value={obs.code}
                    onChange={(val) => updateObservation(index, "code", val)}
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Location</label>
                  <input
                    value={obs.location}
                    onChange={(e) => updateObservation(index, "location", e.target.value)}
                    placeholder="Location of defect"
                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>

                {/* Observation */}
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1 block">Observation</label>
                  <textarea
                    value={obs.observation}
                    onChange={(e) => updateObservation(index, "observation", e.target.value)}
                    placeholder="Describe the observation"
                    rows={2}
                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-y"
                  />
                </div>

                {/* Regulation + Action recommended */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">Regulation Ref.</label>
                    <input
                      value={obs.regulationReference}
                      onChange={(e) => updateObservation(index, "regulationReference", e.target.value)}
                      placeholder="e.g. 411.3.3"
                      className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">Action Recommended</label>
                    <input
                      value={obs.actionRecommended}
                      onChange={(e) => updateObservation(index, "actionRecommended", e.target.value)}
                      placeholder="Recommended remedial action"
                      className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add button */}
      <button
        type="button"
        onClick={addObservation}
        className="w-full py-3 rounded-xl border-2 border-dashed border-white/10 text-sm font-medium text-gray-400 hover:border-blue-500/50 hover:text-blue-400 hover:bg-blue-500/5 transition-all"
      >
        + Add Observation
      </button>

      {observations.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No observations recorded. Click above to add one.
        </p>
      )}
    </div>
  );
}
