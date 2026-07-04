export type Unit = "kg" | "g" | "l" | "ml" | "un";

const unitGroups: Record<Unit, "mass" | "volume" | "unit"> = {
  kg: "mass",
  g: "mass",
  l: "volume",
  ml: "volume",
  un: "unit",
};

const toBaseFactor: Record<Unit, number> = {
  kg: 1000,
  g: 1,
  l: 1000,
  ml: 1,
  un: 1,
};

export function convertQuantity(quantity: number, from: Unit, to: Unit) {
  if (quantity <= 0) {
    throw new Error("Quantidade deve ser maior que zero.");
  }

  if (unitGroups[from] !== unitGroups[to]) {
    throw new Error("Unidades incompativeis.");
  }

  return (quantity * toBaseFactor[from]) / toBaseFactor[to];
}
