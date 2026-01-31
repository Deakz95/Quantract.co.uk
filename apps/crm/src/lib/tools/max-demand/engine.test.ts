import { describe, it, expect } from "vitest";
import { calculateMaxDemand } from "./engine";

describe("calculateMaxDemand", () => {
  it("calculates total connected load", () => {
    const result = calculateMaxDemand({
      profile: "custom",
      supplyVoltage: 230,
      loads: [
        { description: "Lights", connectedLoad: 100, quantity: 10, diversityFactor: 1.0 },
        { description: "Sockets", connectedLoad: 3000, quantity: 2, diversityFactor: 1.0 },
      ],
    });
    expect(result.totalConnected).toBe(7000); // 1000 + 6000
    expect(result.totalAfterDiversity).toBe(7000); // diversity = 1.0
  });

  it("applies domestic diversity profile", () => {
    const result = calculateMaxDemand({
      profile: "domestic",
      supplyVoltage: 230,
      loads: [
        { description: "Lights", connectedLoad: 100, quantity: 10 },
      ],
    });
    // Total connected = 1000W, domestic diversity = 0.6
    expect(result.totalConnected).toBe(1000);
    expect(result.totalAfterDiversity).toBe(600);
  });

  it("allows per-item diversity override", () => {
    const result = calculateMaxDemand({
      profile: "domestic",
      supplyVoltage: 230,
      loads: [
        { description: "Shower", connectedLoad: 9000, quantity: 1, diversityFactor: 1.0 },
        { description: "Lights", connectedLoad: 100, quantity: 10 }, // uses profile default 0.6
      ],
    });
    expect(result.loads[0].afterDiversity).toBe(9000);
    expect(result.loads[1].afterDiversity).toBe(600);
    expect(result.totalAfterDiversity).toBe(9600);
  });

  it("calculates max demand amps", () => {
    const result = calculateMaxDemand({
      profile: "custom",
      supplyVoltage: 230,
      loads: [
        { description: "Load", connectedLoad: 23000, quantity: 1, diversityFactor: 1.0 },
      ],
    });
    expect(result.maxDemandAmps).toBe(100);
  });

  it("suggests correct supply rating", () => {
    const result = calculateMaxDemand({
      profile: "custom",
      supplyVoltage: 230,
      loads: [
        { description: "Load", connectedLoad: 16000, quantity: 1, diversityFactor: 1.0 },
      ],
    });
    // 16000W / 230V = 69.6A → next standard = 80A
    expect(result.maxDemandAmps).toBeCloseTo(69.6, 0);
    expect(result.suggestedSupply).toBe(80);
  });

  it("calculates overall diversity ratio", () => {
    const result = calculateMaxDemand({
      profile: "domestic",
      supplyVoltage: 230,
      loads: [
        { description: "Load", connectedLoad: 10000, quantity: 1 },
      ],
    });
    expect(result.overallDiversity).toBe(0.6);
  });

  it("handles commercial profile", () => {
    const result = calculateMaxDemand({
      profile: "commercial",
      supplyVoltage: 230,
      loads: [
        { description: "Load", connectedLoad: 10000, quantity: 1 },
      ],
    });
    expect(result.totalAfterDiversity).toBe(7000);
  });
});
