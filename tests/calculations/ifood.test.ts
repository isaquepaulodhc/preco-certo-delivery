import { describe, expect, it } from "vitest";

import { getIfoodPlanDefaults } from "@/lib/calculations/ifood";

describe("iFood plan defaults", () => {
  it("preenche Plano Basico com 12% + 3,2%", () => {
    expect(getIfoodPlanDefaults("basic")).toMatchObject({
      ifood_commission_percentage: 0.12,
      ifood_payment_fee_percentage: 0.032,
    });
  });

  it("preenche Plano Entrega com 23% + 3,2%", () => {
    expect(getIfoodPlanDefaults("delivery")).toMatchObject({
      ifood_commission_percentage: 0.23,
      ifood_payment_fee_percentage: 0.032,
    });
  });

  it("mantem Plano Personalizado como editavel pela UI", () => {
    expect(getIfoodPlanDefaults("custom").ifood_plan).toBe("custom");
  });
});
