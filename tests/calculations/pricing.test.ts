import { describe, expect, it } from "vitest";

import { calculateFixedCostPercentage, calculateFixedCostsTotal } from "@/lib/calculations/fixed-costs";
import {
  calculateIfoodProductMargin,
  calculateIfoodVariablePercentage,
  calculateOwnChannelProductMargin,
  calculateOwnChannelVariablePercentage,
  calculateSuggestedOwnChannelPrice,
  calculateSuggestedPrice,
  type PricingSettings,
} from "@/lib/calculations/pricing";

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

describe("pricing calculations", () => {
  it("produto sem ficha tecnica nao gera margem saudavel falsa", () => {
    const margin = calculateOwnChannelProductMargin({
      sellingPrice: 40,
      safeCost: null,
      fixedCostPercentage: 0.2,
      settings,
    });

    expect(margin).toMatchObject({
      status: "neutral",
      reason: "Produto sem ficha tecnica nao possui custo calculado.",
    });
  });

  it("fixedCostPercentage inclui ifood_monthly_fee", () => {
    const total = calculateFixedCostsTotal([{ amount: 1000, active: true }], 130);

    expect(total).toBe(1130);
    expect(calculateFixedCostPercentage(total, 10000)).toBe(0.113);
  });

  it("iFood nao aplica taxa de cartao comum", () => {
    const margin = calculateIfoodProductMargin({
      sellingPrice: 100,
      safeCost: 40,
      fixedCostPercentage: 0.1,
      settings,
    });

    expect(margin.status).toBe("ready");
    if (margin.status === "ready") {
      expect(margin.cardFeeAmount).toBe(0);
      expect(margin.marketplaceFeeAmount).toBeCloseTo(16.2);
    }
  });

  it("iFood delivery nao aplica freeDeliveryPercentage por padrao", () => {
    expect(
      calculateIfoodVariablePercentage({
        ...settings,
        ifoodPlan: "delivery",
      }),
    ).toBeCloseTo(0.212);
  });

  it("canal proprio aplica freeDeliveryPercentage", () => {
    expect(calculateOwnChannelVariablePercentage(settings)).toBeCloseTo(0.12);
  });

  it("denominador invalido retorna preco sugerido nulo", () => {
    const suggested = calculateSuggestedPrice({
      safeCost: 10,
      fixedCostPercentage: 0.5,
      variablePercentage: 0.4,
      desiredProfitMargin: 0.2,
    });

    expect(suggested.status).toBe("neutral");
    expect(suggested).toMatchObject({
      reason: "Configuracao inviavel para preco sugerido.",
    });
  });

  it("preco sugerido do canal proprio usa custo, variaveis, fixos e margem", () => {
    const suggested = calculateSuggestedOwnChannelPrice({
      safeCost: 20,
      fixedCostPercentage: 0.1,
      settings,
    });

    expect(suggested.status).toBe("ready");
    if (suggested.status === "ready") {
      expect(suggested.price).toBeCloseTo(34.4827);
    }
  });
});
