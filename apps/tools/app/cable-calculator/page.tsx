"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { saveOutput } from "../../lib/savedOutputs";

// BS 7671 Cable data - mV/A/m values at 70°C conductor temperature
// Reference: BS 7671 Appendix 4, Table 4Ab (voltage drop)
const CABLE_DATA = {
  // Twin & Earth (flat cables) - Reference Method C (clipped direct)
  "twin-earth": {
    name: "Twin & Earth (6242Y)",
    sizes: [
      { size: 1.0, currentRating: 14, mvAm: 44 },
      { size: 1.5, currentRating: 18, mvAm: 29 },
      { size: 2.5, currentRating: 24, mvAm: 18 },
      { size: 4, currentRating: 32, mvAm: 11 },
      { size: 6, currentRating: 40, mvAm: 7.3 },
      { size: 10, currentRating: 54, mvAm: 4.4 },
      { size: 16, currentRating: 73, mvAm: 2.8 },
    ],
  },
  // Singles in conduit/trunking - Reference Method B
  singles: {
    name: "Singles in Conduit (6491X)",
    sizes: [
      { size: 1.0, currentRating: 13.5, mvAm: 44 },
      { size: 1.5, currentRating: 17.5, mvAm: 29 },
      { size: 2.5, currentRating: 24, mvAm: 18 },
      { size: 4, currentRating: 32, mvAm: 11 },
      { size: 6, currentRating: 41, mvAm: 7.3 },
      { size: 10, currentRating: 57, mvAm: 4.4 },
      { size: 16, currentRating: 76, mvAm: 2.8 },
      { size: 25, currentRating: 101, mvAm: 1.75 },
      { size: 35, currentRating: 125, mvAm: 1.25 },
      { size: 50, currentRating: 151, mvAm: 0.93 },
    ],
  },
  // SWA Cable - Reference Method C (clipped direct)
  swa: {
    name: "SWA Cable (6944X)",
    sizes: [
      { size: 1.5, currentRating: 21, mvAm: 29 },
      { size: 2.5, currentRating: 28, mvAm: 18 },
      { size: 4, currentRating: 37, mvAm: 11 },
      { size: 6, currentRating: 47, mvAm: 7.3 },
      { size: 10, currentRating: 64, mvAm: 4.4 },
      { size: 16, currentRating: 85, mvAm: 2.8 },
      { size: 25, currentRating: 110, mvAm: 1.75 },
      { size: 35, currentRating: 135, mvAm: 1.25 },
      { size: 50, currentRating: 164, mvAm: 0.93 },
      { size: 70, currentRating: 203, mvAm: 0.63 },
      { size: 95, currentRating: 245, mvAm: 0.46 },
      { size: 120, currentRating: 283, mvAm: 0.36 },
    ],
  },
  // Flex Cable
  flex: {
    name: "Flexible Cable (3183Y)",
    sizes: [
      { size: 0.75, currentRating: 6, mvAm: 60 },
      { size: 1.0, currentRating: 10, mvAm: 44 },
      { size: 1.5, currentRating: 15, mvAm: 29 },
      { size: 2.5, currentRating: 20, mvAm: 18 },
      { size: 4, currentRating: 25, mvAm: 11 },
    ],
  },
};

type CableType = keyof typeof CABLE_DATA;

// Correction factors
const AMBIENT_TEMP_FACTORS: Record<number, number> = {
  25: 1.03,
  30: 1.0,
  35: 0.94,
  40: 0.87,
  45: 0.79,
  50: 0.71,
  55: 0.61,
  60: 0.5,
};

const GROUPING_FACTORS: Record<string, number> = {
  "1": 1.0,
  "2": 0.8,
  "3": 0.7,
  "4": 0.65,
  "5": 0.6,
  "6-7": 0.55,
  "8-9": 0.52,
  "10-12": 0.48,
  "13+": 0.45,
};

const INSULATION_FACTORS: Record<string, number> = {
  none: 1.0,
  "50mm": 0.89,
  "100mm": 0.81,
  "200mm": 0.68,
  "400mm": 0.55,
};

export default function CableCalculatorPage() {
  const [current, setCurrent] = useState<string>("20");
  const [length, setLength] = useState<string>("30");
  const [cableType, setCableType] = useState<CableType>("twin-earth");
  const [phaseType, setPhaseType] = useState<"single" | "three">("single");
  const [circuitType, setCircuitType] = useState<"lighting" | "power">("power");
  const [ambientTemp, setAmbientTemp] = useState<string>("30");
  const [grouping, setGrouping] = useState<string>("1");
  const [insulation, setInsulation] = useState<string>("none");
  const [saved, setSaved] = useState(false);

  const supplyVoltage = phaseType === "single" ? 230 : 400;
  const maxVoltageDrop = circuitType === "lighting" ? 3 : 5; // Percentage

  // Calculate results
  const results = useMemo(() => {
    const currentVal = parseFloat(current) || 0;
    const lengthVal = parseFloat(length) || 0;

    if (currentVal <= 0 || lengthVal <= 0) {
      return null;
    }

    // Get correction factors
    const Ca = AMBIENT_TEMP_FACTORS[parseInt(ambientTemp)] || 1.0;
    const Cg = GROUPING_FACTORS[grouping] || 1.0;
    const Ci = INSULATION_FACTORS[insulation] || 1.0;

    // Calculate design current with correction factors
    const correctionFactor = Ca * Cg * Ci;
    const designCurrent = currentVal / correctionFactor;

    // Find suitable cable size
    const cableData = CABLE_DATA[cableType];
    const suitableSizes = cableData.sizes.filter((s) => s.currentRating >= designCurrent);

    if (suitableSizes.length === 0) {
      return { error: "No suitable cable size found. Consider using a larger cable type." };
    }

    // For each suitable size, calculate voltage drop
    const calculations = suitableSizes.map((cable) => {
      // Voltage drop calculation: mV/A/m × I × L / 1000
      let voltageDrop = (cable.mvAm * currentVal * lengthVal) / 1000;

      // For 3-phase, multiply by sqrt(3) / 2 (approximately 0.866)
      if (phaseType === "three") {
        voltageDrop = voltageDrop * 0.866;
      }

      const voltageDropPercent = (voltageDrop / supplyVoltage) * 100;
      const isCompliant = voltageDropPercent <= maxVoltageDrop;

      return {
        size: cable.size,
        currentRating: cable.currentRating,
        correctedRating: Math.round(cable.currentRating * correctionFactor),
        voltageDrop: voltageDrop.toFixed(2),
        voltageDropPercent: voltageDropPercent.toFixed(2),
        isCompliant,
      };
    });

    // Find recommended cable (smallest that meets all requirements)
    const recommended = calculations.find((c) => c.isCompliant);

    return {
      designCurrent: designCurrent.toFixed(1),
      correctionFactor: correctionFactor.toFixed(3),
      calculations,
      recommended,
      maxVoltageDrop,
      supplyVoltage,
    };
  }, [current, length, cableType, phaseType, circuitType, ambientTemp, grouping, insulation, maxVoltageDrop, supplyVoltage]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    background: "var(--muted)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    color: "var(--foreground)",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--muted-foreground)",
    marginBottom: "4px",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    overflow: "hidden",
  };

  const cardHeaderStyle: React.CSSProperties = {
    padding: "12px 16px",
    borderBottom: "1px solid var(--border)",
  };

  const cardContentStyle: React.CSSProperties = {
    padding: "16px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Link
          href="/"
          style={{
            color: "var(--muted-foreground)",
            display: "flex",
            alignItems: "center",
            transition: "color 0.2s",
          }}
        >
          <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Cable Calculator</h1>
          <span
            style={{
              fontSize: "11px",
              color: "var(--muted-foreground)",
              background: "var(--muted)",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            BS 7671
          </span>
        </div>
      </header>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 20px" }}>
        <div className="cable-calc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Input Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Basic Parameters */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Circuit Parameters</h2>
              </div>
              <div style={cardContentStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={labelStyle}>Design Current (A)</label>
                    <input
                      type="number"
                      value={current}
                      onChange={(e) => setCurrent(e.target.value)}
                      placeholder="e.g. 20"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Cable Length (m)</label>
                    <input
                      type="number"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      placeholder="e.g. 30"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={labelStyle}>Cable Type</label>
                  <select
                    value={cableType}
                    onChange={(e) => setCableType(e.target.value as CableType)}
                    style={inputStyle}
                  >
                    {Object.entries(CABLE_DATA).map(([key, data]) => (
                      <option key={key} value={key}>
                        {data.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>Supply Type</label>
                    <select
                      value={phaseType}
                      onChange={(e) => setPhaseType(e.target.value as "single" | "three")}
                      style={inputStyle}
                    >
                      <option value="single">Single Phase (230V)</option>
                      <option value="three">Three Phase (400V)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Circuit Type</label>
                    <select
                      value={circuitType}
                      onChange={(e) => setCircuitType(e.target.value as "lighting" | "power")}
                      style={inputStyle}
                    >
                      <option value="power">Power (5% max VD)</option>
                      <option value="lighting">Lighting (3% max VD)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Correction Factors */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Correction Factors</h2>
              </div>
              <div style={cardContentStyle}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={labelStyle}>Ambient Temperature (Ca)</label>
                  <select
                    value={ambientTemp}
                    onChange={(e) => setAmbientTemp(e.target.value)}
                    style={inputStyle}
                  >
                    {Object.entries(AMBIENT_TEMP_FACTORS).map(([temp, factor]) => (
                      <option key={temp} value={temp}>
                        {temp}°C (Ca = {factor})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={labelStyle}>Cable Grouping (Cg)</label>
                  <select
                    value={grouping}
                    onChange={(e) => setGrouping(e.target.value)}
                    style={inputStyle}
                  >
                    {Object.entries(GROUPING_FACTORS).map(([count, factor]) => (
                      <option key={count} value={count}>
                        {count} cable{count !== "1" ? "s" : ""} (Cg = {factor})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Thermal Insulation (Ci)</label>
                  <select
                    value={insulation}
                    onChange={(e) => setInsulation(e.target.value)}
                    style={inputStyle}
                  >
                    {Object.entries(INSULATION_FACTORS).map(([depth, factor]) => (
                      <option key={depth} value={depth}>
                        {depth === "none" ? "No insulation" : `${depth} insulation`} (Ci = {factor})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {results && !("error" in results) ? (
              <>
                {/* Recommended Cable */}
                {results.recommended ? (
                  <div
                    style={{
                      ...cardStyle,
                      borderColor: "var(--success)",
                      background: "rgba(16, 185, 129, 0.05)",
                    }}
                  >
                    <div style={{ ...cardHeaderStyle, borderColor: "rgba(16, 185, 129, 0.2)" }}>
                      <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0, color: "var(--success)" }}>
                        Recommended Cable
                      </h2>
                    </div>
                    <div style={cardContentStyle}>
                      <div style={{ fontSize: "32px", fontWeight: 900, marginBottom: "12px" }}>
                        {results.recommended.size}mm²
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "13px" }}>
                        <div>
                          <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginBottom: "2px" }}>
                            Current Rating
                          </div>
                          <div style={{ fontWeight: 600 }}>
                            {results.recommended.currentRating}A (derated: {results.recommended.correctedRating}A)
                          </div>
                        </div>
                        <div>
                          <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginBottom: "2px" }}>
                            Voltage Drop
                          </div>
                          <div style={{ fontWeight: 600 }}>
                            {results.recommended.voltageDrop}V ({results.recommended.voltageDropPercent}%)
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      ...cardStyle,
                      borderColor: "var(--warning)",
                      background: "rgba(245, 158, 11, 0.05)",
                    }}
                  >
                    <div style={{ ...cardHeaderStyle, borderColor: "rgba(245, 158, 11, 0.2)" }}>
                      <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0, color: "var(--warning)" }}>
                        No Compliant Cable
                      </h2>
                    </div>
                    <div style={cardContentStyle}>
                      <p style={{ fontSize: "13px", margin: 0 }}>
                        No cable size meets the voltage drop requirements ({results.maxVoltageDrop}% max). Consider
                        reducing cable length or splitting the circuit.
                      </p>
                    </div>
                  </div>
                )}

                {/* Calculation Details */}
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Calculation Details</h2>
                  </div>
                  <div style={cardContentStyle}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                      <div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginBottom: "2px" }}>
                          Combined Factor
                        </div>
                        <div style={{ fontWeight: 600 }}>{results.correctionFactor}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginBottom: "2px" }}>
                          Tabulated Current
                        </div>
                        <div style={{ fontWeight: 600 }}>{results.designCurrent}A</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginBottom: "2px" }}>
                          Supply Voltage
                        </div>
                        <div style={{ fontWeight: 600 }}>{results.supplyVoltage}V</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: "11px", marginBottom: "2px" }}>
                          Max Voltage Drop
                        </div>
                        <div style={{ fontWeight: 600 }}>
                          {results.maxVoltageDrop}% ({((results.supplyVoltage * results.maxVoltageDrop) / 100).toFixed(1)}V)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* All Cable Options */}
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>All Cable Options</h2>
                  </div>
                  <div className="cable-table-wrap" style={{ ...cardContentStyle, padding: 0 }}>
                    <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--muted)" }}>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Size</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Rating</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>VD</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>VD %</th>
                          <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.calculations.map((calc) => (
                          <tr
                            key={calc.size}
                            style={{
                              borderTop: "1px solid var(--border)",
                              background:
                                results.recommended?.size === calc.size ? "rgba(16, 185, 129, 0.1)" : "transparent",
                            }}
                          >
                            <td style={{ padding: "8px 12px", fontWeight: 500 }}>{calc.size}mm²</td>
                            <td style={{ padding: "8px 12px" }}>{calc.correctedRating}A</td>
                            <td style={{ padding: "8px 12px" }}>{calc.voltageDrop}V</td>
                            <td style={{ padding: "8px 12px" }}>{calc.voltageDropPercent}%</td>
                            <td style={{ padding: "8px 12px" }}>
                              {calc.isCompliant ? (
                                <span style={{ color: "var(--success)", fontWeight: 500 }}>OK</span>
                              ) : (
                                <span style={{ color: "var(--error)", fontWeight: 500 }}>Exceeds</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : results && "error" in results ? (
              <div
                style={{
                  ...cardStyle,
                  borderColor: "var(--error)",
                  background: "rgba(239, 68, 68, 0.05)",
                }}
              >
                <div style={{ ...cardHeaderStyle, borderColor: "rgba(239, 68, 68, 0.2)" }}>
                  <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0, color: "var(--error)" }}>Error</h2>
                </div>
                <div style={cardContentStyle}>
                  <p style={{ fontSize: "13px", margin: 0 }}>{results.error}</p>
                </div>
              </div>
            ) : (
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Results</h2>
                </div>
                <div style={cardContentStyle}>
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0 }}>
                    Enter circuit parameters to calculate cable size.
                  </p>
                </div>
              </div>
            )}

            {/* Save Result */}
            {results && !("error" in results) && results.recommended && (
              <button
                onClick={() => {
                  saveOutput(
                    "cable-calculator",
                    `${results.recommended!.size}mm² ${CABLE_DATA[cableType].name} — ${current}A × ${length}m`,
                    { current, length, cableType, phaseType, circuitType, ambientTemp, grouping, insulation },
                    {
                      recommendedSize: results.recommended!.size,
                      voltageDrop: results.recommended!.voltageDrop,
                      voltageDropPercent: results.recommended!.voltageDropPercent,
                      correctionFactor: results.correctionFactor,
                    }
                  );
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: saved ? "var(--success)" : "var(--primary)",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {saved ? "Saved!" : "Save Result"}
              </button>
            )}

            {/* Reference Info */}
            <div style={{ ...cardStyle, background: "var(--muted)" }}>
              <div style={cardContentStyle}>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.5 }}>
                  Calculations based on BS 7671:2018+A2:2022. Cable ratings from Appendix 4, Table 4D1A/4D2A. Voltage
                  drop values from Table 4Ab. For final installation, always verify with manufacturer data and consult
                  a qualified electrician.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
