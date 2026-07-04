import { describe, expect, it } from "vitest";

import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import {
  evaluateOperationHealth,
  evaluateOperationItem,
  getIfoodComparisonVariablePercentage,
  type OperationHealthItemInput,
} from "@/lib/calculations/operation-health";
import { calculateComboDiscountAmount } from "@/lib/calculations/combos";
import { type PricingSettings } from "@/lib/calculations/pricing";

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

const fixedCostPercentage = 0.1;

function report(items: OperationHealthItemInput[]) {
  return evaluateOperationHealth({
    items,
    fixedCostPercentage,
    pricingSettings: settings,
  });
}

describe("operation health", () => {
  it("fica neutro sem dados avaliaveis", () => {
    expect(report([]).status).toBe("neutral");
  });

  it("fica vermelho com item em prejuizo", () => {
    expect(
      report([
        {
          id: "p1",
          name: "Produto caro",
          type: "product",
          sellingPrice: 20,
          safeCost: 18,
        },
      ]).status,
    ).toBe("red");
  });

  it("fica amarelo com item abaixo da margem desejada", () => {
    expect(
      report([
        {
          id: "p1",
          name: "Produto apertado",
          type: "product",
          sellingPrice: 33,
          safeCost: 20,
        },
      ]).status,
    ).toBe("yellow");
  });

  it("fica amarelo com item incompleto relevante", () => {
    expect(
      report([
        {
          id: "p1",
          name: "Produto saudavel",
          type: "product",
          sellingPrice: 60,
          safeCost: 20,
        },
        {
          id: "p2",
          name: "Produto incompleto",
          type: "product",
          sellingPrice: 30,
          safeCost: null,
        },
      ]).status,
    ).toBe("yellow");
  });

  it("fica verde apenas quando todos os itens ativos relevantes estao avaliaveis e saudaveis", () => {
    expect(
      report([
        {
          id: "p1",
          name: "Produto saudavel",
          type: "product",
          sellingPrice: 60,
          safeCost: 20,
        },
        {
          id: "c1",
          name: "Combo saudavel",
          type: "combo",
          sellingPrice: 90,
          safeCost: 35,
        },
      ]).status,
    ).toBe("green");
  });

  it("produto sem ficha tecnica fica incompleto", () => {
    const item = evaluateOperationItem({
      item: {
        id: "p1",
        name: "Produto incompleto",
        type: "product",
        sellingPrice: 30,
        safeCost: null,
      },
      fixedCostPercentage,
      pricingSettings: settings,
    });

    expect(item.status).toBe("incomplete");
  });

  it("combo sem custo calculavel fica incompleto", () => {
    const item = evaluateOperationItem({
      item: {
        id: "c1",
        name: "Combo incompleto",
        type: "combo",
        sellingPrice: 50,
        safeCost: null,
      },
      fixedCostPercentage,
      pricingSettings: settings,
    });

    expect(item.status).toBe("incomplete");
  });

  it("produto com sellingPrice menor ou igual a zero nao quebra", () => {
    const item = evaluateOperationItem({
      item: {
        id: "p1",
        name: "Sem preco",
        type: "product",
        sellingPrice: 0,
        safeCost: 10,
      },
      fixedCostPercentage,
      pricingSettings: settings,
    });

    expect(item.status).toBe("incomplete");
  });

  it("average_monthly_revenue menor ou igual a zero nao divide por zero", () => {
    const item = evaluateOperationItem({
      item: {
        id: "p1",
        name: "Produto",
        type: "product",
        sellingPrice: 60,
        safeCost: 20,
      },
      fixedCostPercentage: null,
      pricingSettings: settings,
    });

    expect(item.status).toBe("incomplete");
    expect(item.estimatedNetProfit).toBeNull();
  });

  it("fixedCostPercentage inclui ifood_monthly_fee", () => {
    const total = calculateFixedCostsTotal([{ amount: 1000, active: true }], 130);

    expect(total).toBe(1130);
    expect(calculateFixedCostPercentage(total, 10000)).toBe(0.113);
  });

  it("calcula preco sugerido canal proprio", () => {
    const item = evaluateOperationItem({
      item: {
        id: "p1",
        name: "Produto",
        type: "product",
        sellingPrice: 60,
        safeCost: 20,
      },
      fixedCostPercentage,
      pricingSettings: settings,
    });

    expect(item.suggestedOwnChannelPrice.status).toBe("ready");
    if (item.suggestedOwnChannelPrice.status === "ready") {
      expect(item.suggestedOwnChannelPrice.price).toBeCloseTo(34.4827);
    }
  });

  it("calcula preco sugerido iFood sem taxa de cartao comum", () => {
    const item = evaluateOperationItem({
      item: {
        id: "p1",
        name: "Produto",
        type: "product",
        sellingPrice: 60,
        safeCost: 20,
      },
      fixedCostPercentage,
      pricingSettings: { ...settings, cardFeePercentage: 0.99 },
    });

    expect(item.suggestedIfoodPrice.status).toBe("ready");
    if (item.suggestedIfoodPrice.status === "ready") {
      expect(item.suggestedIfoodPrice.price).toBeCloseTo(43.6681);
    }
  });

  it("iFood delivery nao aplica entrega gratis por padrao", () => {
    expect(
      getIfoodComparisonVariablePercentage({
        ...settings,
        ifoodPlan: "delivery",
      }),
    ).toBeCloseTo(0.212);
  });

  it("aplica desconto medio e entrega gratis no canal proprio", () => {
    const item = evaluateOperationItem({
      item: {
        id: "p1",
        name: "Produto",
        type: "product",
        sellingPrice: 100,
        safeCost: 50,
      },
      fixedCostPercentage: 0.1,
      pricingSettings: {
        ...settings,
        cardFeePercentage: 0.04,
        averageCouponPercentage: 0.1,
        freeDeliveryPercentage: 0.05,
      },
    });

    expect(item.estimatedNetProfit).toBeCloseTo(21);
  });

  it("vermelho vence amarelo e verde", () => {
    expect(
      report([
        { id: "loss", name: "Prejuizo", type: "product", sellingPrice: 20, safeCost: 18 },
        { id: "warn", name: "Atencao", type: "product", sellingPrice: 35, safeCost: 20 },
        { id: "ok", name: "Saudavel", type: "product", sellingPrice: 60, safeCost: 20 },
      ]).status,
    ).toBe("red");
  });

  it("desconto implicito de combo nao e descontado novamente na saude", () => {
    const individualPrice = 70;
    const comboPrice = 60;
    const implicitDiscount = calculateComboDiscountAmount(individualPrice, comboPrice);
    const item = evaluateOperationItem({
      item: {
        id: "c1",
        name: "Combo",
        type: "combo",
        sellingPrice: comboPrice,
        safeCost: 20,
      },
      fixedCostPercentage,
      pricingSettings: settings,
    });

    expect(implicitDiscount).toBe(10);
    expect(item.estimatedNetProfit).toBeCloseTo(26.8);
  });

  it("itens incompletos nao entram como saudaveis", () => {
    const health = report([
      {
        id: "p1",
        name: "Produto incompleto",
        type: "product",
        sellingPrice: 30,
        safeCost: null,
      },
    ]);

    expect(health.status).toBe("neutral");
    expect(health.healthyItems).toHaveLength(0);
    expect(health.incompleteItems).toHaveLength(1);
  });
});
