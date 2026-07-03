export function percentageInputToDecimal(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("Percentual invalido.");
  }

  return value / 100;
}

export function decimalToPercentageInput(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) {
    return 0;
  }

  return value * 100;
}
