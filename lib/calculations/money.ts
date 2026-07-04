export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseBrazilianCurrency(input: string) {
  return parseBrazilianNumber(input, "Valor monetario invalido.");
}

export function parseBrazilianNumber(
  input: string,
  errorMessage = "Numero invalido.",
) {
  const normalized = input
    .replace(/\s/g, "")
    .replace("R$", "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) {
    throw new Error(errorMessage);
  }

  return parsed;
}
