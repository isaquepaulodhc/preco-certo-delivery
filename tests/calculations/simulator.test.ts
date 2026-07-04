import { describe, expect, it } from "vitest";

import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import { parseBrazilianNumber } from "@/lib/calculations/money";
import { percentageInputToDecimal } from "@/lib/calculations/percentages";
import { type PricingSettings } from "@/lib/calculations/pricing";
import {
  assertSimulatableCost,
  buildSimulatedPricingSettings,
  simulateScenario,
} from "@/lib/calculations/simulator";

const settings: PricingSettings = {
  averageMonthlyRevenue: 10000,
  desiredProfitMargin: 0.2,
  cardFeePercentage: 0.04,
  averageCouponPercentage: 0.05,
  freeDeliveryPercentage: 0.03,
  ifoodPlan: "basic",
  ifoodCommissionPercentage: 0.12,
  ifoodPaymentFeePercentage: 0.032,
  ifoodReceivablesAdvancePercentage: 0.01,
  ifoodMonthlyFee: 130,
  ifoodPaidOnlineByDefault: true,
};

const baseInput = {
  itemType: "product" as const,
  safeCost: 20,
  currentSellingPrice: 50,
  simulatedSellingPrice: 60,
  channel: "own" as const,
  simulatedDiscountPercentage: 0,
  simulatedFreeDeliveryPercentage: 0,
  simulatedMonthlyQuantity: 10,
  paidOnlineViaIfood: true,
  forceIfoodFreeDelivery: false,
  fixedCostPercentage: 0.1,
  settings,
};

describe("simulator calculations", () => {
  it("simula canal proprio com taxa de cartao", () => {
    const result = simulateScenario(baseInput);

    expect(result.margin.status).toBe("ready");
    if (result.margin.status === "ready") {
      expect(result.margin.cardFeeAmount).toBe(2.4);
      expect(result.margin.contributionProfit).toBe(37.6);
    }
  });

  it("simula canal proprio com desconto", () => {
    const result = simulateScenario({
      ...baseInput,
      simulatedDiscountPercentage: 0.1,
    });

    expect(result.margin.status).toBe("ready");
    if (result.margin.status === "ready") {
      expect(result.margin.discountAmount).toBe(6);
      expect(result.margin.contributionProfit).toBe(31.6);
    }
  });

  it("simula canal proprio com entrega gratis", () => {
    const result = simulateScenario({
      ...baseInput,
      simulatedFreeDeliveryPercentage: 0.05,
    });

    expect(result.margin.status).toBe("ready");
    if (result.margin.status === "ready") {
      expect(result.margin.freeDeliveryAmount).toBe(3);
      expect(result.margin.contributionProfit).toBe(34.6);
    }
  });

  it("simula iFood sem taxa de cartao comum", () => {
    const result = simulateScenario({
      ...baseInput,
      channel: "ifood",
      settings: { ...settings, cardFeePercentage: 0.99 },
    });

    expect(result.margin.status).toBe("ready");
    if (result.margin.status === "ready") {
      expect(result.margin.cardFeeAmount).toBe(0);
      expect(result.margin.marketplaceFeeAmount).toBeCloseTo(9.72);
    }
  });

  it("simula iFood com pagamento online ativo", () => {
    const result = simulateScenario({
      ...baseInput,
      channel: "ifood",
      paidOnlineViaIfood: true,
    });

    expect(result.margin.status).toBe("ready");
    if (result.margin.status === "ready") {
      expect(result.margin.marketplaceFeeAmount).toBeCloseTo(9.72);
    }
  });

  it("simula iFood com pagamento online inativo", () => {
    const result = simulateScenario({
      ...baseInput,
      channel: "ifood",
      paidOnlineViaIfood: false,
    });

    expect(result.margin.status).toBe("ready");
    if (result.margin.status === "ready") {
      expect(result.margin.marketplaceFeeAmount).toBeCloseTo(7.8);
    }
  });

  it("iFood delivery nao aplica entrega gratis por padrao", () => {
    const result = simulateScenario({
      ...baseInput,
      channel: "ifood",
      simulatedFreeDeliveryPercentage: 0.1,
      settings: { ...settings, ifoodPlan: "delivery" },
    });

    expect(result.appliesFreeDelivery).toBe(false);
    expect(result.margin.status).toBe("ready");
    if (result.margin.status === "ready") {
      expect(result.margin.freeDeliveryAmount).toBe(0);
    }
  });

  it("fixedCostPercentage inclui ifood_monthly_fee", () => {
    const total = calculateFixedCostsTotal([{ amount: 1000, active: true }], 130);

    expect(total).toBe(1130);
    expect(calculateFixedCostPercentage(total, 10000)).toBe(0.113);
  });

  it("average_monthly_revenue menor ou igual a zero nao divide por zero", () => {
    const result = simulateScenario({
      ...baseInput,
      fixedCostPercentage: null,
    });

    expect(result.margin.status).toBe("ready");
    if (result.margin.status === "ready") {
      expect(result.margin.netMarginStatus).toBe("incomplete");
      expect(result.margin.estimatedNetProfit).toBeNull();
    }
  });

  it("simulatedSellingPrice menor ou igual a zero nao quebra", () => {
    const result = simulateScenario({
      ...baseInput,
      simulatedSellingPrice: 0,
    });

    expect(result.margin).toMatchObject({
      status: "neutral",
      reason: "Informe um preco simulado maior que zero.",
    });
  });

  it("calcula lucro mensal estimado", () => {
    const result = simulateScenario(baseInput);

    expect(result.monthlyContributionProfit).toBeCloseTo(376);
    expect(result.monthlyEstimatedNetProfit).toBeCloseTo(316);
  });

  it("calcula preco sugerido canal proprio", () => {
    const result = simulateScenario({
      ...baseInput,
      simulatedDiscountPercentage: 0.05,
      simulatedFreeDeliveryPercentage: 0.03,
    });

    expect(result.suggestedPrice.status).toBe("ready");
    if (result.suggestedPrice.status === "ready") {
      expect(result.suggestedPrice.price).toBeCloseTo(34.4827);
    }
  });

  it("calcula preco sugerido iFood", () => {
    const result = simulateScenario({
      ...baseInput,
      channel: "ifood",
      simulatedDiscountPercentage: 0.05,
      simulatedFreeDeliveryPercentage: 0.03,
    });

    expect(result.suggestedPrice.status).toBe("ready");
    if (result.suggestedPrice.status === "ready") {
      expect(result.suggestedPrice.price).toBeCloseTo(43.6681);
    }
  });

  it("denominador invalido retorna preco sugerido nulo", () => {
    const result = simulateScenario({
      ...baseInput,
      fixedCostPercentage: 0.5,
      simulatedDiscountPercentage: 0.4,
    });

    expect(result.suggestedPrice.status).toBe("neutral");
    expect(result.suggestedPrice).toMatchObject({
      reason: "Configuracao inviavel para preco sugerido.",
    });
  });

  it("bloqueia produto sem custo calculavel", () => {
    expect(() => assertSimulatableCost(null, "product")).toThrow(
      "Produto sem custo calculado",
    );
  });

  it("bloqueia combo sem custo calculavel", () => {
    expect(() => assertSimulatableCost(null, "combo")).toThrow(
      "Combo sem custo calculado",
    );
  });

  it("converte input brasileiro corretamente", () => {
    expect(parseBrazilianNumber("1,50")).toBe(1.5);
    expect(parseBrazilianNumber("10,5")).toBe(10.5);
    expect(parseBrazilianNumber("1.000,00")).toBe(1000);
    expect(parseBrazilianNumber("1000,00")).toBe(1000);
    expect(percentageInputToDecimal(parseBrazilianNumber("10,5"))).toBe(0.105);
  });

  it("overrides da simulacao nao alteram configuracoes globais", () => {
    const overridden = buildSimulatedPricingSettings(
      {
        settings,
        simulatedDiscountPercentage: 0.2,
        simulatedFreeDeliveryPercentage: 0.1,
        paidOnlineViaIfood: false,
      },
      true,
    );

    expect(overridden.averageCouponPercentage).toBe(0.2);
    expect(overridden.freeDeliveryPercentage).toBe(0.1);
    expect(overridden.ifoodPaidOnlineByDefault).toBe(false);
    expect(settings.averageCouponPercentage).toBe(0.05);
    expect(settings.freeDeliveryPercentage).toBe(0.03);
    expect(settings.ifoodPaidOnlineByDefault).toBe(true);
  });
});
