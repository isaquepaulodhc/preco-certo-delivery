import { z } from "zod";

const percentageInput = z
  .number()
  .min(0, "Use um percentual maior ou igual a zero.")
  .max(99, "Use um percentual menor que 100.");

export const financialSettingsSchema = z.object({
  averageMonthlyRevenue: z.number().min(0, "Use um valor maior ou igual a zero."),
  targetMonthlyRevenue: z.number().min(0, "Use um valor maior ou igual a zero."),
  desiredProfitMargin: percentageInput,
  cardFeePercentage: percentageInput,
  averageCouponPercentage: percentageInput,
  freeDeliveryPercentage: percentageInput,
  ifoodPlan: z.enum(["basic", "delivery", "custom"]),
  ifoodCommissionPercentage: percentageInput,
  ifoodPaymentFeePercentage: percentageInput,
  ifoodReceivablesAdvancePercentage: percentageInput,
  ifoodMonthlyFee: z.number().min(0, "Use um valor maior ou igual a zero."),
  ifoodPaidOnlineByDefault: z.boolean(),
});

export type FinancialSettingsInput = z.infer<typeof financialSettingsSchema>;
