export type FixedCostLike = {
  amount: number;
  active: boolean;
};

export function calculateFixedCostsTotal(
  fixedCosts: FixedCostLike[],
  ifoodMonthlyFee = 0,
) {
  const activeFixedCostsTotal = fixedCosts
    .filter((cost) => cost.active)
    .reduce((total, cost) => total + cost.amount, 0);

  return activeFixedCostsTotal + ifoodMonthlyFee;
}

export function calculateFixedCostPercentage(
  fixedCostsTotal: number,
  averageMonthlyRevenue: number,
) {
  if (averageMonthlyRevenue <= 0) {
    return null;
  }

  return fixedCostsTotal / averageMonthlyRevenue;
}

export function isFixedCostPercentageHigh(
  fixedCostPercentage: number | null,
  threshold = 0.4,
) {
  return fixedCostPercentage != null && fixedCostPercentage > threshold;
}
