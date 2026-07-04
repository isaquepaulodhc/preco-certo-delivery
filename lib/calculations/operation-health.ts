import {
  calculateIfoodVariablePercentage,
  calculateOwnChannelVariablePercentage,
  calculateScenarioMargin,
  calculateSuggestedIfoodPrice,
  calculateSuggestedOwnChannelPrice,
  getProductDiagnosis,
  type PricingSettings,
  type SuggestedPriceResult,
} from "@/lib/calculations/pricing";

export type OperationItemType = "product" | "combo";
export type OperationItemStatus =
  | "incomplete"
  | "loss"
  | "danger"
  | "warning"
  | "healthy";
export type OperationHealthStatus = "neutral" | "red" | "yellow" | "green";

export type OperationHealthItemInput = {
  id: string;
  name: string;
  type: OperationItemType;
  sellingPrice: number;
  safeCost: number | null;
  incompleteReason?: string;
};

export type EvaluatedOperationItem = {
  id: string;
  name: string;
  type: OperationItemType;
  status: OperationItemStatus;
  alertReason: string;
  sellingPrice: number;
  safeCost: number | null;
  estimatedNetProfit: number | null;
  estimatedNetMargin: number | null;
  desiredProfitMargin: number;
  suggestedOwnChannelPrice: SuggestedPriceResult;
  suggestedIfoodPrice: SuggestedPriceResult;
  ownChannelPriceDifference: number | null;
};

export type OperationHealthReport = {
  status: OperationHealthStatus;
  summary: string;
  items: EvaluatedOperationItem[];
  evaluableItems: EvaluatedOperationItem[];
  incompleteItems: EvaluatedOperationItem[];
  lossItems: EvaluatedOperationItem[];
  belowMarginItems: EvaluatedOperationItem[];
  healthyItems: EvaluatedOperationItem[];
};

export function evaluateOperationHealth({
  items,
  fixedCostPercentage,
  pricingSettings,
}: {
  items: OperationHealthItemInput[];
  fixedCostPercentage: number | null;
  pricingSettings: PricingSettings;
}): OperationHealthReport {
  const evaluatedItems = items.map((item) =>
    evaluateOperationItem({
      item,
      fixedCostPercentage,
      pricingSettings,
    }),
  );
  const evaluableItems = evaluatedItems.filter((item) => item.status !== "incomplete");
  const incompleteItems = evaluatedItems.filter((item) => item.status === "incomplete");
  const lossItems = evaluatedItems.filter((item) => item.status === "loss");
  const belowMarginItems = evaluatedItems.filter(
    (item) => item.status === "danger" || item.status === "warning",
  );
  const healthyItems = evaluatedItems.filter((item) => item.status === "healthy");
  const status = getOperationHealthStatus({
    evaluableCount: evaluableItems.length,
    lossCount: lossItems.length,
    belowMarginCount: belowMarginItems.length,
    incompleteCount: incompleteItems.length,
  });

  return {
    status,
    summary: getOperationHealthSummary(status),
    items: evaluatedItems,
    evaluableItems,
    incompleteItems,
    lossItems,
    belowMarginItems,
    healthyItems,
  };
}

export function evaluateOperationItem({
  item,
  fixedCostPercentage,
  pricingSettings,
}: {
  item: OperationHealthItemInput;
  fixedCostPercentage: number | null;
  pricingSettings: PricingSettings;
}): EvaluatedOperationItem {
  const suggestedOwnChannelPrice = calculateSuggestedOwnChannelPrice({
    safeCost: item.safeCost,
    fixedCostPercentage,
    settings: pricingSettings,
  });
  const suggestedIfoodPrice = calculateSuggestedIfoodPrice({
    safeCost: item.safeCost,
    fixedCostPercentage,
    settings: pricingSettings,
  });
  const baseItem = {
    id: item.id,
    name: item.name,
    type: item.type,
    sellingPrice: item.sellingPrice,
    safeCost: item.safeCost,
    desiredProfitMargin: pricingSettings.desiredProfitMargin,
    suggestedOwnChannelPrice,
    suggestedIfoodPrice,
    ownChannelPriceDifference:
      suggestedOwnChannelPrice.status === "ready"
        ? item.sellingPrice - suggestedOwnChannelPrice.price
        : null,
  };

  if (item.safeCost == null) {
    return {
      ...baseItem,
      status: "incomplete",
      alertReason: item.incompleteReason ?? "Item sem custo calculavel.",
      estimatedNetProfit: null,
      estimatedNetMargin: null,
    };
  }

  if (item.sellingPrice <= 0) {
    return {
      ...baseItem,
      status: "incomplete",
      alertReason: "Informe preco de venda para calcular margem liquida.",
      estimatedNetProfit: null,
      estimatedNetMargin: null,
    };
  }

  if (fixedCostPercentage == null) {
    return {
      ...baseItem,
      status: "incomplete",
      alertReason: "Informe faturamento medio para calcular margem liquida.",
      estimatedNetProfit: null,
      estimatedNetMargin: null,
    };
  }

  const margin = calculateScenarioMargin({
    sellingPrice: item.sellingPrice,
    safeCost: item.safeCost,
    fixedCostPercentage,
    discountPercentage: pricingSettings.averageCouponPercentage,
    cardFeePercentage: pricingSettings.cardFeePercentage,
    freeDeliveryPercentage: pricingSettings.freeDeliveryPercentage,
    marketplaceFeePercentage: 0,
  });

  if (margin.status === "neutral" || margin.estimatedNetProfit == null || margin.estimatedNetMargin == null) {
    return {
      ...baseItem,
      status: "incomplete",
      alertReason:
        margin.status === "neutral"
          ? margin.reason
          : "Dados insuficientes para calcular margem liquida.",
      estimatedNetProfit: null,
      estimatedNetMargin: null,
    };
  }

  const diagnosis = getProductDiagnosis(
    margin.estimatedNetProfit,
    margin.estimatedNetMargin,
    pricingSettings.desiredProfitMargin,
  );
  const statusByDiagnosis: Record<ReturnType<typeof getProductDiagnosis>, OperationItemStatus> = {
    prejuizo: "loss",
    perigoso: "danger",
    atencao: "warning",
    saudavel: "healthy",
  };

  return {
    ...baseItem,
    status: statusByDiagnosis[diagnosis],
    alertReason: getItemAlertReason(statusByDiagnosis[diagnosis]),
    estimatedNetProfit: margin.estimatedNetProfit,
    estimatedNetMargin: margin.estimatedNetMargin,
  };
}

export function getOperationHealthStatus({
  evaluableCount,
  lossCount,
  belowMarginCount,
  incompleteCount,
}: {
  evaluableCount: number;
  lossCount: number;
  belowMarginCount: number;
  incompleteCount: number;
}): OperationHealthStatus {
  if (evaluableCount === 0) {
    return "neutral";
  }

  if (lossCount > 0) {
    return "red";
  }

  if (belowMarginCount > 0 || incompleteCount > 0) {
    return "yellow";
  }

  return "green";
}

export function getOperationHealthSummary(status: OperationHealthStatus) {
  const summaries: Record<OperationHealthStatus, string> = {
    neutral: "Dados insuficientes para avaliar a operacao.",
    red: "Ha itens ativos em prejuizo.",
    yellow: "Ha itens que exigem atencao antes de considerar a operacao saudavel.",
    green: "Todos os itens avaliaveis estao na margem desejada.",
  };

  return summaries[status];
}

export function getOwnChannelVariablePercentage(settings: PricingSettings) {
  return calculateOwnChannelVariablePercentage(settings);
}

export function getIfoodComparisonVariablePercentage(settings: PricingSettings) {
  return calculateIfoodVariablePercentage(settings);
}

function getItemAlertReason(status: OperationItemStatus) {
  const reasons: Record<OperationItemStatus, string> = {
    incomplete: "Dados incompletos.",
    loss: "Lucro liquido estimado menor ou igual a zero.",
    danger: "Margem liquida positiva, mas muito abaixo da margem desejada.",
    warning: "Margem liquida abaixo da margem desejada.",
    healthy: "Margem liquida dentro da meta.",
  };

  return reasons[status];
}
