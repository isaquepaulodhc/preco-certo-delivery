export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseBrazilianCurrency(input: string) {
  const normalized = input
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) {
    throw new Error("Valor monetario invalido.");
  }

  return parsed;
}
