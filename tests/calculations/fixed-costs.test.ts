import { describe, expect, it } from "vitest";

import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
  isFixedCostPercentageHigh,
} from "@/lib/calculations/fixed-costs";

describe("fixed costs", () => {
  it("soma apenas custos ativos e mensalidade iFood", () => {
    const total = calculateFixedCostsTotal(
      [
        { amount: 1000, active: true },
        { amount: 500, active: false },
        { amount: 250, active: true },
      ],
      130,
    );

    expect(total).toBe(1380);
  });

  it("calcula percentual do faturamento medio", () => {
    expect(calculateFixedCostPercentage(2000, 10000)).toBe(0.2);
  });

  it("nao calcula percentual com faturamento zerado", () => {
    expect(calculateFixedCostPercentage(2000, 0)).toBeNull();
  });

  it("marca alerta acima de 40%", () => {
    expect(isFixedCostPercentageHigh(0.41)).toBe(true);
    expect(isFixedCostPercentageHigh(0.4)).toBe(false);
  });
});
