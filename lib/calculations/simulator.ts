import {
  calculateIfoodVariablePercentage,
  calculateOwnChannelVariablePercentage,
  calculateScenarioMargin,
  calculateSuggestedPrice,
  shouldApplyIfoodFreeDeliveryPercentage,
  type IfoodPlan,
  type PricingSettings,
  type ScenarioMarginResult,
  type SuggestedPriceResult,
} from "@/lib/calculations/pricing";

export type SimulationChannel = "own" | "ifood";
export type SimulationItemType = "product" | "combo";

export type SimulationInput = {
  itemType: SimulationItemType;
  safeCost: number | null;
  currentSellingPrice: number;
  simulatedSellingPrice: number;
  channel: SimulationChannel;
  simulatedDiscountPercentage: number;
  simulatedFreeDeliveryPercentage: number;
  simulatedMonthlyQuantity: number;
  paidOnlineViaIfood: boolean;
  forceIfoodFreeDelivery: boolean;
  fixedCostPercentage: number | null;
  settings: PricingSettings;
};

export type SimulationResult = {
  margin: ScenarioMarginResult;
  suggestedPrice: SuggestedPriceResult;
  variablePercentage: number;
  appliesFreeDelivery: boolean;
  monthlyContributionProfit: number | null;
  monthlyEstimatedNetProfit: number | null;
  priceDifferenceFromCurrent: number;
  priceDifferenceFromSuggested: number | null;
};

export function simulateScenario(input: SimulationInput): SimulationResult {
  assertSimulatableCost(input.safeCost, input.itemType);
  assertMonthlyQuantity(input.simulatedMonthlyQuantity);

  const appliesFreeDelivery = getAppliesFreeDelivery({
    channel: input.channel,
    ifoodPlan: input.settings.ifoodPlan,
    forceIfoodFreeDelivery: input.forceIfoodFreeDelivery,
  });
  const simulatedSettings = buildSimulatedPricingSettings(input, appliesFreeDelivery);
  const variablePercentage =
    input.channel === "own"
      ? calculateOwnChannelVariablePercentage(simulatedSettings)
      : calculateIfoodVariablePercentage(simulatedSettings);

  const margin = calculateScenarioMargin({
    sellingPrice: input.simulatedSellingPrice,
    safeCost: input.safeCost,
    fixedCostPercentage: input.fixedCostPercentage,
    discountPercentage: input.simulatedDiscountPercentage,
    cardFeePercentage:
      input.channel === "own" ? input.settings.cardFeePercentage : 0,
    freeDeliveryPercentage: appliesFreeDelivery
      ? input.simulatedFreeDeliveryPercentage
      : 0,
    marketplaceFeePercentage:
      input.channel === "ifood"
        ? input.settings.ifoodCommissionPercentage +
          (input.paidOnlineViaIfood
            ? input.settings.ifoodPaymentFeePercentage
            : 0) +
          input.settings.ifoodReceivablesAdvancePercentage
        : 0,
  });
  const suggestedPrice = calculateSuggestedPrice({
    safeCost: input.safeCost,
    fixedCostPercentage: input.fixedCostPercentage,
    variablePercentage,
    desiredProfitMargin: input.settings.desiredProfitMargin,
  });

  return {
    margin,
    suggestedPrice,
    variablePercentage,
    appliesFreeDelivery,
    monthlyContributionProfit:
      margin.status === "ready"
        ? margin.contributionProfit * input.simulatedMonthlyQuantity
        : null,
    monthlyEstimatedNetProfit:
      margin.status === "ready" && margin.estimatedNetProfit != null
        ? margin.estimatedNetProfit * input.simulatedMonthlyQuantity
        : null,
    priceDifferenceFromCurrent:
      input.simulatedSellingPrice - input.currentSellingPrice,
    priceDifferenceFromSuggested:
      suggestedPrice.status === "ready"
        ? input.simulatedSellingPrice - suggestedPrice.price
        : null,
  };
}

export function buildSimulatedPricingSettings(
  input: Pick<
    SimulationInput,
    | "settings"
    | "simulatedDiscountPercentage"
    | "simulatedFreeDeliveryPercentage"
    | "paidOnlineViaIfood"
  >,
  appliesFreeDelivery: boolean,
): PricingSettings {
  return {
    ...input.settings,
    averageCouponPercentage: input.simulatedDiscountPercentage,
    freeDeliveryPercentage: appliesFreeDelivery
      ? input.simulatedFreeDeliveryPercentage
      : 0,
    ifoodPaidOnlineByDefault: input.paidOnlineViaIfood,
  };
}

export function getAppliesFreeDelivery({
  channel,
  ifoodPlan,
  forceIfoodFreeDelivery,
}: {
  channel: SimulationChannel;
  ifoodPlan: IfoodPlan;
  forceIfoodFreeDelivery: boolean;
}) {
  if (channel === "own") {
    return true;
  }

  return shouldApplyIfoodFreeDeliveryPercentage(ifoodPlan) || forceIfoodFreeDelivery;
}

export function assertSimulatableCost(
  safeCost: number | null,
  itemType: SimulationItemType,
) {
  if (safeCost == null) {
    throw new Error(
      itemType === "product"
        ? "Produto sem custo calculado nao pode ser simulado."
        : "Combo sem custo calculado nao pode ser simulado.",
    );
  }
}

export function assertMonthlyQuantity(quantity: number) {
  if (quantity <= 0) {
    throw new Error("Quantidade mensal deve ser maior que zero.");
  }
}
