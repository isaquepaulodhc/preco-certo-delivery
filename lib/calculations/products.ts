import { type Unit } from "@/lib/calculations/units";

export type TechnicalSheetItem = {
  ingredientId: string;
  quantity: number;
  unit: Unit;
  ingredientUsageUnit: Unit;
  ingredientUnitCost: number;
};

export function calculateTechnicalSheetItemCost(
  quantityUsed: number,
  ingredientUnitCost: number,
) {
  if (quantityUsed <= 0) {
    throw new Error("Quantidade usada deve ser maior que zero.");
  }

  if (ingredientUnitCost < 0) {
    throw new Error("Custo unitario do ingrediente nao pode ser negativo.");
  }

  return quantityUsed * ingredientUnitCost;
}

export function calculateProductBaseCost(items: TechnicalSheetItem[]) {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((total, item) => {
    assertTechnicalSheetUnit(item.unit, item.ingredientUsageUnit);
    return total + calculateTechnicalSheetItemCost(item.quantity, item.ingredientUnitCost);
  }, 0);
}

export function calculateProductSafeCost(productBaseCost: number | null) {
  return productBaseCost;
}

export function assertTechnicalSheetUnit(unit: Unit, ingredientUsageUnit: Unit) {
  if (unit !== ingredientUsageUnit) {
    throw new Error("A unidade da ficha tecnica deve seguir a unidade de uso do ingrediente.");
  }
}

export function hasDuplicateIngredients(ingredientIds: string[]) {
  return new Set(ingredientIds).size !== ingredientIds.length;
}

export function assertNoDuplicateIngredients(ingredientIds: string[]) {
  if (hasDuplicateIngredients(ingredientIds)) {
    throw new Error("Nao adicione o mesmo ingrediente duas vezes na ficha tecnica.");
  }
}

export function canCalculateProductMargins(productBaseCost: number | null) {
  return productBaseCost != null;
}
