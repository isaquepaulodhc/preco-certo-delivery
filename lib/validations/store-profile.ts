import { z } from "zod";

export const storeProfileSchema = z.object({
  name: z.string().min(2, "Informe o nome do delivery."),
  segment: z.string().optional(),
  city: z.string().optional(),
  whatsapp: z.string().optional(),
});

export type StoreProfileInput = z.infer<typeof storeProfileSchema>;
