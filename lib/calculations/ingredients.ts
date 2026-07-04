import { convertQuantity, type Unit } from "@/lib/calculations/units";

export type IngredientCostInput = {
  purchasePrice: number;
  purchaseQuantity: number;
  purchaseUnit: Unit;
  usageUnit: Unit;
  correctionFactor: number;
};

export type IngredientPriceFields = {
  purchase_price: number;
  purchase_quantity: number;
  purchase_unit: Unit;
  usage_unit: Unit;
  correction_factor: number;
};

export function calculateIngredientUnitCost(input: IngredientCostInput) {
  if (input.purchasePrice < 0) {
    throw new Error("Preco de compra deve ser maior ou igual a zero.");
  }

  if (input.correctionFactor <= 0) {
    throw new Error("Fator de correcao deve ser maior que zero.");
  }

  const convertedPurchaseQuantity = convertQuantity(
    input.purchaseQuantity,
    input.purchaseUnit,
    input.usageUnit,
  );

  return (input.purchasePrice * input.correctionFactor) / convertedPurchaseQuantity;
}

export function calculateIngredientUsageCost(unitCost: number, quantity: number) {
  if (quantity <= 0) {
    throw new Error("Quantidade de uso deve ser maior que zero.");
  }

  return unitCost * quantity;
}

export function shouldCreateIngredientPriceHistory(
  previous: IngredientPriceFields,
  next: IngredientPriceFields,
) {
  return (
    previous.purchase_price !== next.purchase_price ||
    previous.purchase_quantity !== next.purchase_quantity ||
    previous.purchase_unit !== next.purchase_unit ||
    previous.usage_unit !== next.usage_unit ||
    previous.correction_factor !== next.correction_factor
  );
}

export function shouldUpdateIngredientLastPriceUpdate(
  previous: IngredientPriceFields,
  next: IngredientPriceFields,
) {
  return shouldCreateIngredientPriceHistory(previous, next);
}
