import { describe, expect, it } from "vitest";

import { convertQuantity } from "@/lib/calculations/units";

describe("convertQuantity", () => {
  it("converte kg para g", () => {
    expect(convertQuantity(1, "kg", "g")).toBe(1000);
  });

  it("converte g para kg", () => {
    expect(convertQuantity(500, "g", "kg")).toBe(0.5);
  });

  it("converte l para ml", () => {
    expect(convertQuantity(2, "l", "ml")).toBe(2000);
  });

  it("converte ml para l", () => {
    expect(convertQuantity(250, "ml", "l")).toBe(0.25);
  });

  it("bloqueia unidade incompativel", () => {
    expect(() => convertQuantity(1, "kg", "ml")).toThrow("Unidades incompativeis.");
  });

  it("converte un apenas com un", () => {
    expect(convertQuantity(3, "un", "un")).toBe(3);
  });

  it("bloqueia unidade para massa ou volume", () => {
    expect(() => convertQuantity(1, "un", "kg")).toThrow("Unidades incompativeis.");
    expect(() => convertQuantity(1, "ml", "un")).toThrow("Unidades incompativeis.");
  });
});
