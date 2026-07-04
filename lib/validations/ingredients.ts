import { z } from "zod";

import { parseBrazilianNumber } from "@/lib/calculations/money";

export const unitSchema = z.enum(["kg", "g", "l", "ml", "un"]);

function parseSafely(value: string) {
  try {
    return parseBrazilianNumber(value);
  } catch {
    return Number.NaN;
  }
}

export const ingredientSchema = z.object({
  name: z.string().min(2, "Informe o nome do ingrediente."),
  category: z.string().optional(),
  supplier: z.string().optional(),
  purchasePrice: z
    .string()
    .min(1, "Informe o preco pago.")
    .refine((value) => parseSafely(value) >= 0, {
      message: "Use um preco maior ou igual a zero.",
    }),
  purchaseQuantity: z
    .string()
    .min(1, "Informe a quantidade comprada.")
    .refine((value) => parseSafely(value) > 0, {
      message: "Use uma quantidade maior que zero.",
    }),
  purchaseUnit: unitSchema,
  usageUnit: unitSchema,
  correctionFactor: z
    .string()
    .min(1, "Informe o fator de correcao.")
    .refine((value) => parseSafely(value) > 0, {
      message: "O fator de correcao deve ser maior que zero.",
    }),
  active: z.boolean(),
});

export type IngredientInput = z.infer<typeof ingredientSchema>;
