import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  parseBrazilianCurrency,
} from "@/lib/calculations/money";

describe("money helpers", () => {
  it("formata moeda em pt-BR", () => {
    expect(formatCurrency(12.5)).toContain("12,50");
  });

  it("le entrada com simbolo e separadores brasileiros", () => {
    expect(parseBrazilianCurrency("R$ 1.500,25")).toBe(1500.25);
  });

  it("rejeita valor invalido", () => {
    expect(() => parseBrazilianCurrency("abc")).toThrow("Valor monetario invalido.");
  });
});
