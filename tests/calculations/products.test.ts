import { describe, expect, it } from "vitest";

import {
  assertNoDuplicateIngredients,
  assertTechnicalSheetUnit,
  calculateProductBaseCost,
  calculateProductSafeCost,
  calculateTechnicalSheetItemCost,
} from "@/lib/calculations/products";

describe("product calculations", () => {
  it("calcula item da ficha tecnica pelo unit_cost do ingrediente", () => {
    expect(calculateTechnicalSheetItemCost(80, 0.04)).toBe(3.2);
  });

  it("calcula custo total da ficha tecnica sem reaplicar correction_factor", () => {
    const cost = calculateProductBaseCost([
      {
        ingredientId: "bacon",
        quantity: 80,
        unit: "g",
        ingredientUsageUnit: "g",
        ingredientUnitCost: 0.04,
      },
      {
        ingredientId: "pao",
        quantity: 1,
        unit: "un",
        ingredientUsageUnit: "un",
        ingredientUnitCost: 1.5,
      },
    ]);

    expect(cost).toBe(4.7);
  });

  it("produto sem ficha tecnica nao tem custo calculado", () => {
    expect(calculateProductBaseCost([])).toBeNull();
    expect(calculateProductSafeCost(null)).toBeNull();
  });

  it("safeCost e igual ao productBaseCost nesta fase", () => {
    expect(calculateProductSafeCost(12.5)).toBe(12.5);
  });

  it("bloqueia ingrediente duplicado na ficha tecnica", () => {
    expect(() => assertNoDuplicateIngredients(["a", "b", "a"])).toThrow(
      "Nao adicione o mesmo ingrediente duas vezes",
    );
  });

  it("unidade da ficha tecnica deve seguir usage_unit do ingrediente", () => {
    expect(() => assertTechnicalSheetUnit("kg", "g")).toThrow(
      "A unidade da ficha tecnica deve seguir",
    );
    expect(() => assertTechnicalSheetUnit("g", "g")).not.toThrow();
  });
});
