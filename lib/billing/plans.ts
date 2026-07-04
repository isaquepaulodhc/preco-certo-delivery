export const BILLING_PLANS = [
  {
    code: "essential",
    name: "Essencial",
    price: 39,
  },
  {
    code: "pro",
    name: "Pro",
    price: 79,
  },
  {
    code: "management",
    name: "Gestao",
    price: 149,
  },
] as const;

export type BillingPlan = (typeof BILLING_PLANS)[number];
export type BillingPlanCode = BillingPlan["code"];

export function getBillingPlan(code: string | null | undefined) {
  return BILLING_PLANS.find((plan) => plan.code === code) ?? null;
}

export function assertBillingPlan(code: string | null | undefined) {
  const plan = getBillingPlan(code);

  if (!plan) {
    throw new Error("Plano invalido.");
  }

  return plan;
}

export function getOfficialPlanAmount(code: string | null | undefined) {
  return assertBillingPlan(code).price;
}
