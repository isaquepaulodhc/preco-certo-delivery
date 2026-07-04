import { z } from "zod";

import { parseBrazilianNumber } from "@/lib/calculations/money";

function parseSafely(value: string) {
  try {
    return parseBrazilianNumber(value);
  } catch {
    return Number.NaN;
  }
}

export const productSchema = z.object({
  name: z.string().min(2, "Informe o nome do produto."),
  category: z.string().optional(),
  description: z.string().optional(),
  sellingPrice: z
    .string()
    .min(1, "Informe o preco de venda.")
    .refine((value) => parseSafely(value) >= 0, {
      message: "Use um preco maior ou igual a zero.",
    }),
  active: z.boolean(),
});

export type ProductInput = z.infer<typeof productSchema>;
