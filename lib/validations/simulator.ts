import { z } from "zod";

import { parseBrazilianNumber } from "@/lib/calculations/money";

export const simulationItemTypeSchema = z.enum(["product", "combo"]);
export const simulationChannelSchema = z.enum(["own", "ifood"]);

function parseSafely(value: string) {
  try {
    return parseBrazilianNumber(value);
  } catch {
    return Number.NaN;
  }
}

export const simulatorSchema = z.object({
  itemType: simulationItemTypeSchema,
  itemId: z.string().min(1, "Selecione um item para simular."),
  channel: simulationChannelSchema,
  simulatedSellingPrice: z
    .string()
    .min(1, "Informe o preco simulado.")
    .refine((value) => parseSafely(value) > 0, {
      message: "Use um preco maior que zero.",
    }),
  simulatedDiscountPercentage: z
    .string()
    .min(1, "Informe o desconto.")
    .refine((value) => parseSafely(value) >= 0, {
      message: "Use desconto maior ou igual a zero.",
    }),
  simulatedFreeDeliveryPercentage: z
    .string()
    .min(1, "Informe o subsidio de entrega.")
    .refine((value) => parseSafely(value) >= 0, {
      message: "Use entrega gratis maior ou igual a zero.",
    }),
  simulatedMonthlyQuantity: z
    .string()
    .min(1, "Informe a quantidade mensal.")
    .refine((value) => parseSafely(value) > 0, {
      message: "Use quantidade mensal maior que zero.",
    }),
  paidOnlineViaIfood: z.boolean(),
  forceIfoodFreeDelivery: z.boolean(),
});

export type SimulatorInput = z.infer<typeof simulatorSchema>;
