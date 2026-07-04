import { describe, expect, it } from "vitest";

import {
  assertComboProductsHaveCost,
  assertComboQuantity,
  assertNoDuplicateComboProducts,
  calculateComboBaseCost,
  calculateComboDiscountAmount,
  calculateComboDiscountPercentage,
  calculateComboItemCost,
  calculateComboSafeCost,
  calculateIndividualProductsTotalPrice,
  type ComboProductCostItem,
} from "@/lib/calculations/combos";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import { parseBrazilianNumber } from "@/lib/calculations/money";
import {
  calculateIfoodProductMargin,
  calculateIfoodVariablePercentage,
  calculateOwnChannelProductMargin,
  calculateSuggestedIfoodPrice,
  calculateSuggestedOwnChannelPrice,
  type PricingSettings,
} from "@/lib/calculations/pricing";

const comboItems: ComboProductCostItem[] = [
  {
    productId: "x-bacon",
    productSafeCost: 8,
    productSellingPrice: 25,
    quantity: 2,
  },
  {
    productId: "batata",
    productSafeCost: 6,
    productSellingPrice: 15,
    quantity: 1,
  },
];

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

describe("combo calculations", () => {
  it("calcula custo do item do combo", () => {
    expect(calculateComboItemCost(8, 2)).toBe(16);
  });

  it("calcula custo total do combo", () => {
    expect(calculateComboBaseCost(comboItems)).toBe(22);
  });

  it("comboSafeCost e igual ao comboBaseCost nesta fase", () => {
    expect(calculateComboSafeCost(22)).toBe(22);
  });

  it("calcula desconto implicito positivo", () => {
    const individualTotal = calculateIndividualProductsTotalPrice(comboItems);
    const discount = calculateComboDiscountAmount(individualTotal, 55);

    expect(individualTotal).toBe(65);
    expect(discount).toBe(10);
    expect(calculateComboDiscountPercentage(discount, individualTotal)).toBeCloseTo(
      0.153846,
    );
  });

  it("calcula desconto implicito negativo quando combo e mais caro que itens avulsos", () => {
    const individualTotal = calculateIndividualProductsTotalPrice(comboItems);
    const discount = calculateComboDiscountAmount(individualTotal, 70);

    expect(discount).toBe(-5);
    expect(calculateComboDiscountPercentage(discount, individualTotal)).toBeCloseTo(
      -0.076923,
    );
  });

  it("nao divide percentual de desconto por zero", () => {
    expect(calculateComboDiscountPercentage(10, 0)).toBeNull();
  });

  it("bloqueia produto sem custo calculado", () => {
    expect(() =>
      assertComboProductsHaveCost([
        {
          productId: "rascunho",
          productSafeCost: null,
          productSellingPrice: 20,
          quantity: 1,
        },
      ]),
    ).toThrow("Produto sem custo calculado");
  });

  it("bloqueia produto duplicado", () => {
    expect(() => assertNoDuplicateComboProducts(["a", "b", "a"])).toThrow(
      "Nao adicione o mesmo produto duas vezes",
    );
  });

  it("exige quantity maior que zero e aceita formato brasileiro sem multiplicar por 10 ou 100", () => {
    expect(() => assertComboQuantity(0)).toThrow("maior que zero");
    expect(parseBrazilianNumber("2,5")).toBe(2.5);
    expect(parseBrazilianNumber("1,50")).toBe(1.5);
  });

  it("preco sugerido canal proprio considera custo, fixo, variaveis e margem", () => {
    const suggested = calculateSuggestedOwnChannelPrice({
      safeCost: 22,
      fixedCostPercentage: 0.1,
      settings,
    });

    expect(suggested.status).toBe("ready");
    if (suggested.status === "ready") {
      expect(suggested.price).toBeCloseTo(37.931);
    }
  });

  it("preco sugerido iFood nao aplica taxa de cartao comum", () => {
    const suggested = calculateSuggestedIfoodPrice({
      safeCost: 22,
      fixedCostPercentage: 0.1,
      settings: { ...settings, cardFeePercentage: 0.99 },
    });

    expect(suggested.status).toBe("ready");
    if (suggested.status === "ready") {
      expect(suggested.price).toBeCloseTo(48.034);
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

  it("fixedCostPercentage inclui ifood_monthly_fee", () => {
    const total = calculateFixedCostsTotal([{ amount: 1000, active: true }], 130);

    expect(total).toBe(1130);
    expect(calculateFixedCostPercentage(total, 10000)).toBe(0.113);
  });

  it("desconto implicito nao e descontado duas vezes da margem", () => {
    const margin = calculateOwnChannelProductMargin({
      sellingPrice: 55,
      safeCost: 22,
      fixedCostPercentage: 0.1,
      settings,
    });

    expect(margin.status).toBe("ready");
    if (margin.status === "ready") {
      expect(margin.contributionProfit).toBeCloseTo(26.4);
      expect(margin.estimatedNetProfit).toBeCloseTo(20.9);
    }
  });

  it("margem iFood tambem nao aplica taxa de cartao comum", () => {
    const margin = calculateIfoodProductMargin({
      sellingPrice: 55,
      safeCost: 22,
      fixedCostPercentage: 0.1,
      settings: { ...settings, cardFeePercentage: 0.99 },
    });

    expect(margin.status).toBe("ready");
    if (margin.status === "ready") {
      expect(margin.cardFeeAmount).toBe(0);
    }
  });
});
