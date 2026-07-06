import { z } from "zod";

export const BRAZILIAN_STATE_UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export const storeProfileSchema = z.object({
  name: z.string().min(2, "Informe o nome do delivery."),
  segment: z.string().optional(),
  city: z.string().optional(),
  stateUf: z.union([z.enum(BRAZILIAN_STATE_UFS), z.literal("")]).optional(),
  whatsapp: z.string().optional(),
});

export type StoreProfileInput = z.infer<typeof storeProfileSchema>;
