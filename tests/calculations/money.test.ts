import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  parseBrazilianNumber,
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

  it("converte input brasileiro com virgula sem inflar centavos", () => {
    expect(parseBrazilianNumber("1,50")).toBe(1.5);
    expect(parseBrazilianNumber("40,00")).toBe(40);
    expect(parseBrazilianNumber("1.000,00")).toBe(1000);
    expect(parseBrazilianNumber("1000,00")).toBe(1000);
  });
});
