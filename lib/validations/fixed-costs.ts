import { z } from "zod";

export const fixedCostSchema = z.object({
  name: z.string().min(2, "Informe o nome do custo."),
  category: z.string().optional(),
  amount: z.number().min(0, "Use um valor maior ou igual a zero."),
  active: z.boolean(),
});

export type FixedCostInput = z.infer<typeof fixedCostSchema>;
