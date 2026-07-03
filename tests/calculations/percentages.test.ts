import { describe, expect, it } from "vitest";

import {
  decimalToPercentageInput,
  percentageInputToDecimal,
} from "@/lib/calculations/percentages";

describe("percentage helpers", () => {
  it("converte percentual humano para decimal de banco", () => {
    expect(percentageInputToDecimal(20)).toBe(0.2);
    expect(percentageInputToDecimal(12)).toBe(0.12);
    expect(percentageInputToDecimal(3.2)).toBe(0.032);
    expect(percentageInputToDecimal(23)).toBe(0.23);
  });

  it("converte decimal de banco para input humano", () => {
    expect(decimalToPercentageInput(0.2)).toBe(20);
    expect(decimalToPercentageInput(0.032)).toBe(3.2);
  });
});
