import { describe, expect, it } from "vitest";

import {
  calculateIngredientUnitCost,
  calculateIngredientUsageCost,
  shouldCreateIngredientPriceHistory,
  shouldUpdateIngredientLastPriceUpdate,
  type IngredientPriceFields,
} from "@/lib/calculations/ingredients";

const basePriceFields: IngredientPriceFields = {
  purchase_price: 40,
  purchase_quantity: 1,
  purchase_unit: "kg",
  usage_unit: "g",
  correction_factor: 1,
};

describe("ingredient calculations", () => {
  it("calcula o exemplo obrigatorio do bacon", () => {
    const unitCost = calculateIngredientUnitCost({
      purchasePrice: 40,
      purchaseQuantity: 1,
      purchaseUnit: "kg",
      usageUnit: "g",
      correctionFactor: 1,
    });

    expect(unitCost).toBe(0.04);
    expect(calculateIngredientUsageCost(unitCost, 80)).toBe(3.2);
  });

  it("aplica correction_factor 1.0, 1.1 e 1.25", () => {
    expect(
      calculateIngredientUnitCost({
        purchasePrice: 40,
        purchaseQuantity: 1000,
        purchaseUnit: "g",
        usageUnit: "g",
        correctionFactor: 1,
      }),
    ).toBe(0.04);
    expect(
      calculateIngredientUnitCost({
        purchasePrice: 40,
        purchaseQuantity: 1000,
        purchaseUnit: "g",
        usageUnit: "g",
        correctionFactor: 1.1,
      }),
    ).toBeCloseTo(0.044);
    expect(
      calculateIngredientUnitCost({
        purchasePrice: 40,
        purchaseQuantity: 1000,
        purchaseUnit: "g",
        usageUnit: "g",
        correctionFactor: 1.25,
      }),
    ).toBe(0.05);
  });

  it("bloqueia correction_factor menor ou igual a zero", () => {
    expect(() =>
      calculateIngredientUnitCost({
        purchasePrice: 40,
        purchaseQuantity: 1000,
        purchaseUnit: "g",
        usageUnit: "g",
        correctionFactor: 0,
      }),
    ).toThrow("Fator de correcao deve ser maior que zero.");
  });

  it("criacao de ingrediente exige unit_cost calculado", () => {
    expect(
      calculateIngredientUnitCost({
        purchasePrice: 12,
        purchaseQuantity: 6,
        purchaseUnit: "un",
        usageUnit: "un",
        correctionFactor: 1,
      }),
    ).toBe(2);
  });

  it("alteracao de preco exige novo historico", () => {
    expect(
      shouldCreateIngredientPriceHistory(basePriceFields, {
        ...basePriceFields,
        purchase_price: 45,
      }),
    ).toBe(true);
  });

  it("alteracao so de nome/categoria/fornecedor nao exige novo historico", () => {
    expect(shouldCreateIngredientPriceHistory(basePriceFields, basePriceFields)).toBe(false);
  });

  it("last_price_update muda quando preco, quantidade, unidade ou fator mudam", () => {
    expect(
      shouldUpdateIngredientLastPriceUpdate(basePriceFields, {
        ...basePriceFields,
        correction_factor: 1.1,
      }),
    ).toBe(true);
  });
});
