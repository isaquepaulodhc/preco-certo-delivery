import { z } from "zod";

export const FIXED_COST_NAME_OPTIONS = [
  "Aluguel",
  "Funcionários",
  "Pró-labore",
  "Telefone",
  "Internet",
  "Marketing",
  "Motoboy",
  "MEI",
  "Gás",
  "Outros",
] as const;

export const FIXED_COST_OTHER_OPTION = "Outros";

export const fixedCostSchema = z
  .object({
    name: z.string().min(2, "Informe o nome do custo."),
    customName: z.string().optional(),
    category: z.string().optional(),
    amount: z.number().min(0, "Use um valor maior ou igual a zero."),
    active: z.boolean(),
  })
  .superRefine((values, context) => {
    if (
      values.name === FIXED_COST_OTHER_OPTION &&
      !values.customName?.trim()
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customName"],
        message: "Informe o nome personalizado do custo.",
      });
    }
  });

export type FixedCostInput = z.infer<typeof fixedCostSchema>;
