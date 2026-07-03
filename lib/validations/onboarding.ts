import { z } from "zod";

const currencyLike = z.number().min(0, "Use um valor maior ou igual a zero.");

export const onboardingSchema = z.object({
  name: z.string().min(2, "Informe o nome do delivery."),
  segment: z.string().optional(),
  city: z.string().optional(),
  whatsapp: z.string().optional(),
  averageMonthlyRevenue: currencyLike,
  targetMonthlyRevenue: currencyLike,
  desiredProfitMargin: z
    .number()
    .min(0.01, "Use pelo menos 1%.")
    .max(0.9, "Use no maximo 90%."),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
