export const BILLING_PLANS = [
  {
    code: "essential",
    name: "Essencial Mensal",
    shortName: "Essencial",
    price: 77,
    durationDays: 30,
    cycleLabel: "Mensal",
    billingLabel: "R$ 77 por mês",
    accessLabel: "30 dias de acesso",
    monthlyEquivalentLabel: null,
  },
  {
    code: "pro",
    name: "Pro Trimestral",
    shortName: "Pro",
    price: 87,
    durationDays: 90,
    cycleLabel: "Trimestral",
    billingLabel: "R$ 87 a cada 3 meses",
    accessLabel: "90 dias de acesso",
    monthlyEquivalentLabel: "Equivalente a R$ 29/mês",
  },
  {
    code: "management",
    name: "Gestão Semestral",
    shortName: "Gestão",
    price: 97,
    durationDays: 180,
    cycleLabel: "Semestral",
    billingLabel: "R$ 97 a cada 6 meses",
    accessLabel: "180 dias de acesso",
    monthlyEquivalentLabel: "Equivalente a aproximadamente R$ 16,17/mês",
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

export function getPlanDurationDays(code: string | null | undefined) {
  return assertBillingPlan(code).durationDays;
}
