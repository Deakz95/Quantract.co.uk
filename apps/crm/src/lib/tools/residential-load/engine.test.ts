import { describe, it, expect } from "vitest";
import { calculateResidentialLoad } from "./engine";

describe("calculateResidentialLoad", () => {
  it("calculates lighting with 66% diversity", () => {
    const result = calculateResidentialLoad({
      lightingPoints: 10,
      lightingWattsPerPoint: 100,
      ringMains: 0, radialCircuits: 0, cookerWatts: 0,
      showers: 0, showerWattsEach: 0, immersionWatts: 0,
      storageHeaterWatts: 0, evChargerWatts: 0, otherFixedWatts: 0,
      supplyVoltage: 230,
    });
    expect(result.totalConnected).toBe(1000);
    expect(result.totalAfterDiversity).toBe(660);
  });

  it("applies ring main diversity correctly", () => {
    const result = calculateResidentialLoad({
      lightingPoints: 0, lightingWattsPerPoint: 0,
      ringMains: 3, radialCircuits: 0, cookerWatts: 0,
      showers: 0, showerWattsEach: 0, immersionWatts: 0,
      storageHeaterWatts: 0, evChargerWatts: 0, otherFixedWatts: 0,
      supplyVoltage: 230,
    });
    // 3 rings: first = 7360, 2 more at 40% = 2 x 7360 x 0.4 = 5888
    const ringRow = result.breakdown.find(b => b.category === "Ring mains");
    expect(ringRow?.afterDiversity).toBe(7360 + 5888);
  });

  it("applies cooker diversity (10A + 30%)", () => {
    const result = calculateResidentialLoad({
      lightingPoints: 0, lightingWattsPerPoint: 0,
      ringMains: 0, radialCircuits: 0,
      cookerWatts: 10000,
      showers: 0, showerWattsEach: 0, immersionWatts: 0,
      storageHeaterWatts: 0, evChargerWatts: 0, otherFixedWatts: 0,
      supplyVoltage: 230,
    });
    // Cooker = 10000W / 230V = 43.48A
    // Diversified = (10 + (43.48-10) x 0.3) x 230 = (10 + 10.04) x 230 = 20.04 x 230 = 4610W
    const cookerRow = result.breakdown.find(b => b.category === "Cooker");
    expect(cookerRow?.afterDiversity).toBeCloseTo(4610, -1);
  });

  it("does not apply diversity to showers", () => {
    const result = calculateResidentialLoad({
      lightingPoints: 0, lightingWattsPerPoint: 0,
      ringMains: 0, radialCircuits: 0, cookerWatts: 0,
      showers: 1, showerWattsEach: 9000, immersionWatts: 0,
      storageHeaterWatts: 0, evChargerWatts: 0, otherFixedWatts: 0,
      supplyVoltage: 230,
    });
    const showerRow = result.breakdown.find(b => b.category.includes("shower"));
    expect(showerRow?.afterDiversity).toBe(9000);
  });

  it("suggests correct service size for typical house", () => {
    const result = calculateResidentialLoad({
      lightingPoints: 15, lightingWattsPerPoint: 100,
      ringMains: 2, radialCircuits: 0,
      cookerWatts: 10000,
      showers: 1, showerWattsEach: 9000,
      immersionWatts: 3000,
      storageHeaterWatts: 0, evChargerWatts: 0, otherFixedWatts: 0,
      supplyVoltage: 230,
    });
    expect(result.maxDemandAmps).toBeGreaterThan(0);
    expect(result.suggestedServiceSize).toBeGreaterThanOrEqual(60);
    expect([60, 80, 100, 125, 160, 200]).toContain(result.suggestedServiceSize);
  });

  it("includes EV charger at 100%", () => {
    const result = calculateResidentialLoad({
      lightingPoints: 0, lightingWattsPerPoint: 0,
      ringMains: 0, radialCircuits: 0, cookerWatts: 0,
      showers: 0, showerWattsEach: 0, immersionWatts: 0,
      storageHeaterWatts: 0,
      evChargerWatts: 7400,
      otherFixedWatts: 0,
      supplyVoltage: 230,
    });
    const evRow = result.breakdown.find(b => b.category.includes("EV"));
    expect(evRow?.afterDiversity).toBe(7400);
  });

  it("returns empty breakdown when no loads", () => {
    const result = calculateResidentialLoad({
      lightingPoints: 0, lightingWattsPerPoint: 0,
      ringMains: 0, radialCircuits: 0, cookerWatts: 0,
      showers: 0, showerWattsEach: 0, immersionWatts: 0,
      storageHeaterWatts: 0, evChargerWatts: 0, otherFixedWatts: 0,
      supplyVoltage: 230,
    });
    expect(result.breakdown).toHaveLength(0);
    expect(result.totalConnected).toBe(0);
    expect(result.maxDemandAmps).toBe(0);
  });
});
