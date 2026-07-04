export type IfoodPlan = "basic" | "delivery" | "custom";

export type PricingSettings = {
  averageMonthlyRevenue: number;
  desiredProfitMargin: number;
  cardFeePercentage: number;
  averageCouponPercentage: number;
  freeDeliveryPercentage: number;
  ifoodPlan: IfoodPlan;
  ifoodCommissionPercentage: number;
  ifoodPaymentFeePercentage: number;
  ifoodReceivablesAdvancePercentage: number;
  ifoodMonthlyFee: number;
  ifoodPaidOnlineByDefault: boolean;
};

export type ContributionInput = {
  sellingPrice: number;
  safeCost: number | null;
  fixedCostPercentage: number | null;
  variablePercentage: number;
};

export type MarginResult =
  | {
      status: "ready";
      discountAmount: number;
      cardFeeAmount: number;
      freeDeliveryAmount: number;
      marketplaceFeeAmount: number;
      contributionProfit: number;
      contributionMargin: number;
      allocatedFixedCostAmount: number;
      estimatedNetProfit: number;
      estimatedNetMargin: number;
    }
  | {
      status: "neutral";
      reason: string;
    };

export type SuggestedPriceResult =
  | {
      status: "ready";
      price: number;
      variablePercentage: number;
      denominator: number;
    }
  | {
      status: "neutral";
      reason: string;
      variablePercentage?: number;
      denominator?: number;
    };

export function calculateOwnChannelVariablePercentage(settings: Pick<
  PricingSettings,
  "cardFeePercentage" | "averageCouponPercentage" | "freeDeliveryPercentage"
>) {
  return (
    settings.cardFeePercentage +
    settings.averageCouponPercentage +
    settings.freeDeliveryPercentage
  );
}

export function shouldApplyIfoodFreeDeliveryPercentage(ifoodPlan: IfoodPlan) {
  return ifoodPlan !== "delivery";
}

export function calculateIfoodVariablePercentage(settings: Pick<
  PricingSettings,
  | "ifoodPlan"
  | "ifoodCommissionPercentage"
  | "ifoodPaymentFeePercentage"
  | "ifoodReceivablesAdvancePercentage"
  | "ifoodPaidOnlineByDefault"
  | "averageCouponPercentage"
  | "freeDeliveryPercentage"
>) {
  return (
    settings.ifoodCommissionPercentage +
    (settings.ifoodPaidOnlineByDefault ? settings.ifoodPaymentFeePercentage : 0) +
    settings.ifoodReceivablesAdvancePercentage +
    settings.averageCouponPercentage +
    (shouldApplyIfoodFreeDeliveryPercentage(settings.ifoodPlan)
      ? settings.freeDeliveryPercentage
      : 0)
  );
}

export function calculateOwnChannelMargin({
  sellingPrice,
  safeCost,
  fixedCostPercentage,
  variablePercentage,
}: ContributionInput): MarginResult {
  return calculateMargin({
    sellingPrice,
    safeCost,
    fixedCostPercentage,
    discountPercentage: 0,
    cardFeePercentage: variablePercentage,
    freeDeliveryPercentage: 0,
    marketplaceFeePercentage: 0,
  });
}

export function calculateOwnChannelProductMargin({
  sellingPrice,
  safeCost,
  fixedCostPercentage,
  settings,
}: {
  sellingPrice: number;
  safeCost: number | null;
  fixedCostPercentage: number | null;
  settings: Pick<
    PricingSettings,
    "cardFeePercentage" | "averageCouponPercentage" | "freeDeliveryPercentage"
  >;
}) {
  return calculateMargin({
    sellingPrice,
    safeCost,
    fixedCostPercentage,
    discountPercentage: settings.averageCouponPercentage,
    cardFeePercentage: settings.cardFeePercentage,
    freeDeliveryPercentage: settings.freeDeliveryPercentage,
    marketplaceFeePercentage: 0,
  });
}

export function calculateIfoodProductMargin({
  sellingPrice,
  safeCost,
  fixedCostPercentage,
  settings,
}: {
  sellingPrice: number;
  safeCost: number | null;
  fixedCostPercentage: number | null;
  settings: PricingSettings;
}) {
  return calculateMargin({
    sellingPrice,
    safeCost,
    fixedCostPercentage,
    discountPercentage: settings.averageCouponPercentage,
    cardFeePercentage: 0,
    freeDeliveryPercentage: shouldApplyIfoodFreeDeliveryPercentage(settings.ifoodPlan)
      ? settings.freeDeliveryPercentage
      : 0,
    marketplaceFeePercentage:
      settings.ifoodCommissionPercentage +
      (settings.ifoodPaidOnlineByDefault ? settings.ifoodPaymentFeePercentage : 0) +
      settings.ifoodReceivablesAdvancePercentage,
  });
}

export function calculateSuggestedOwnChannelPrice({
  safeCost,
  fixedCostPercentage,
  settings,
}: {
  safeCost: number | null;
  fixedCostPercentage: number | null;
  settings: PricingSettings;
}): SuggestedPriceResult {
  const variablePercentage = calculateOwnChannelVariablePercentage(settings);

  return calculateSuggestedPrice({
    safeCost,
    fixedCostPercentage,
    variablePercentage,
    desiredProfitMargin: settings.desiredProfitMargin,
  });
}

export function calculateSuggestedIfoodPrice({
  safeCost,
  fixedCostPercentage,
  settings,
}: {
  safeCost: number | null;
  fixedCostPercentage: number | null;
  settings: PricingSettings;
}): SuggestedPriceResult {
  const variablePercentage = calculateIfoodVariablePercentage(settings);

  return calculateSuggestedPrice({
    safeCost,
    fixedCostPercentage,
    variablePercentage,
    desiredProfitMargin: settings.desiredProfitMargin,
  });
}

export function calculateSuggestedPrice({
  safeCost,
  fixedCostPercentage,
  variablePercentage,
  desiredProfitMargin,
}: {
  safeCost: number | null;
  fixedCostPercentage: number | null;
  variablePercentage: number;
  desiredProfitMargin: number;
}): SuggestedPriceResult {
  if (safeCost == null) {
    return {
      status: "neutral",
      reason: "Produto sem ficha tecnica nao possui custo calculado.",
      variablePercentage,
    };
  }

  if (fixedCostPercentage == null) {
    return {
      status: "neutral",
      reason: "Informe faturamento medio para calcular preco com custos fixos.",
      variablePercentage,
    };
  }

  const denominator =
    1 - (fixedCostPercentage + variablePercentage + desiredProfitMargin);

  if (denominator <= 0) {
    return {
      status: "neutral",
      reason: "Configuracao inviavel para preco sugerido.",
      variablePercentage,
      denominator,
    };
  }

  return {
    status: "ready",
    price: safeCost / denominator,
    variablePercentage,
    denominator,
  };
}

export function getProductDiagnosis(
  estimatedNetProfit: number,
  estimatedNetMargin: number,
  desiredProfitMargin: number,
) {
  if (estimatedNetProfit <= 0) {
    return "prejuizo";
  }

  if (estimatedNetMargin < desiredProfitMargin * 0.5) {
    return "perigoso";
  }

  if (estimatedNetMargin < desiredProfitMargin) {
    return "atencao";
  }

  return "saudavel";
}

function calculateMargin({
  sellingPrice,
  safeCost,
  fixedCostPercentage,
  discountPercentage,
  cardFeePercentage,
  freeDeliveryPercentage,
  marketplaceFeePercentage,
}: {
  sellingPrice: number;
  safeCost: number | null;
  fixedCostPercentage: number | null;
  discountPercentage: number;
  cardFeePercentage: number;
  freeDeliveryPercentage: number;
  marketplaceFeePercentage: number;
}): MarginResult {
  if (safeCost == null) {
    return {
      status: "neutral",
      reason: "Produto sem ficha tecnica nao possui custo calculado.",
    };
  }

  if (sellingPrice <= 0) {
    return {
      status: "neutral",
      reason: "Informe o preco de venda para calcular CMV e lucro.",
    };
  }

  if (fixedCostPercentage == null) {
    return {
      status: "neutral",
      reason: "Informe faturamento medio para calcular preco com custos fixos.",
    };
  }

  const discountAmount = sellingPrice * discountPercentage;
  const cardFeeAmount = sellingPrice * cardFeePercentage;
  const freeDeliveryAmount = sellingPrice * freeDeliveryPercentage;
  const marketplaceFeeAmount = sellingPrice * marketplaceFeePercentage;
  const contributionProfit =
    sellingPrice -
    safeCost -
    discountAmount -
    cardFeeAmount -
    freeDeliveryAmount -
    marketplaceFeeAmount;
  const contributionMargin = contributionProfit / sellingPrice;
  const allocatedFixedCostAmount = sellingPrice * fixedCostPercentage;
  const estimatedNetProfit = contributionProfit - allocatedFixedCostAmount;
  const estimatedNetMargin = estimatedNetProfit / sellingPrice;

  return {
    status: "ready",
    discountAmount,
    cardFeeAmount,
    freeDeliveryAmount,
    marketplaceFeeAmount,
    contributionProfit,
    contributionMargin,
    allocatedFixedCostAmount,
    estimatedNetProfit,
    estimatedNetMargin,
  };
}
