export type IfoodPlan = "basic" | "delivery" | "custom";

export type IfoodRates = {
  ifood_plan: IfoodPlan;
  ifood_commission_percentage: number;
  ifood_payment_fee_percentage: number;
};

export const IFOOD_PLAN_DEFAULTS: Record<IfoodPlan, IfoodRates> = {
  basic: {
    ifood_plan: "basic",
    ifood_commission_percentage: 0.12,
    ifood_payment_fee_percentage: 0.032,
  },
  delivery: {
    ifood_plan: "delivery",
    ifood_commission_percentage: 0.23,
    ifood_payment_fee_percentage: 0.032,
  },
  custom: {
    ifood_plan: "custom",
    ifood_commission_percentage: 0.12,
    ifood_payment_fee_percentage: 0.032,
  },
};

export function getIfoodPlanDefaults(plan: IfoodPlan) {
  return IFOOD_PLAN_DEFAULTS[plan];
}
