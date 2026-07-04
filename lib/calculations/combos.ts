export type ComboProductCostItem = {
  productId: string;
  productSafeCost: number | null;
  productSellingPrice: number;
  quantity: number;
};

export function calculateComboItemCost(productSafeCost: number | null, quantity: number) {
  assertComboQuantity(quantity);

  if (productSafeCost == null) {
    throw new Error("Produto sem custo calculado nao pode entrar no combo.");
  }

  return productSafeCost * quantity;
}

export function calculateComboBaseCost(items: ComboProductCostItem[]) {
  if (items.length === 0) {
    return null;
  }

  assertNoDuplicateComboProducts(items.map((item) => item.productId));

  return items.reduce(
    (total, item) => total + calculateComboItemCost(item.productSafeCost, item.quantity),
    0,
  );
}

export function calculateComboSafeCost(comboBaseCost: number | null) {
  return comboBaseCost;
}

export function calculateIndividualProductsTotalPrice(items: ComboProductCostItem[]) {
  if (items.length === 0) {
    return null;
  }

  return items.reduce(
    (total, item) => total + item.productSellingPrice * item.quantity,
    0,
  );
}

export function calculateComboDiscountAmount(
  individualProductsTotalPrice: number | null,
  comboSellingPrice: number,
) {
  if (individualProductsTotalPrice == null) {
    return null;
  }

  return individualProductsTotalPrice - comboSellingPrice;
}

export function calculateComboDiscountPercentage(
  comboDiscountAmount: number | null,
  individualProductsTotalPrice: number | null,
) {
  if (
    comboDiscountAmount == null ||
    individualProductsTotalPrice == null ||
    individualProductsTotalPrice <= 0
  ) {
    return null;
  }

  return comboDiscountAmount / individualProductsTotalPrice;
}

export function assertComboProductsHaveCost(items: ComboProductCostItem[]) {
  if (items.some((item) => item.productSafeCost == null)) {
    throw new Error("Produto sem custo calculado nao pode entrar no combo.");
  }
}

export function hasDuplicateComboProducts(productIds: string[]) {
  return new Set(productIds).size !== productIds.length;
}

export function assertNoDuplicateComboProducts(productIds: string[]) {
  if (hasDuplicateComboProducts(productIds)) {
    throw new Error("Nao adicione o mesmo produto duas vezes no combo.");
  }
}

export function assertComboQuantity(quantity: number) {
  if (quantity <= 0) {
    throw new Error("Quantidade do produto no combo deve ser maior que zero.");
  }
}
