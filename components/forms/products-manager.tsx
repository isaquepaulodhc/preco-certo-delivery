"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import { formatCurrency, parseBrazilianNumber } from "@/lib/calculations/money";
import {
  assertNoDuplicateIngredients,
  calculateProductBaseCost,
  calculateProductSafeCost,
  calculateTechnicalSheetItemCost,
  type TechnicalSheetItem,
} from "@/lib/calculations/products";
import {
  calculateIfoodProductMargin,
  calculateOwnChannelProductMargin,
  calculateSuggestedIfoodPrice,
  calculateSuggestedOwnChannelPrice,
  getProductDiagnosis,
  type MarginResult,
  type PricingSettings,
  type SuggestedPriceResult,
} from "@/lib/calculations/pricing";
import { type Unit } from "@/lib/calculations/units";
import { createClient } from "@/lib/supabase/client";
import { productSchema, type ProductInput } from "@/lib/validations/products";

export type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  selling_price: number;
  active: boolean;
  technicalSheet: ProductIngredientRow[];
};

export type ProductIngredientRow = {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
  unit: Unit;
};

export type IngredientOption = {
  id: string;
  name: string;
  usage_unit: Unit;
  unit_cost: number;
  active: boolean;
};

export type FixedCostSummaryRow = {
  amount: number;
  active: boolean;
};

type ProductsManagerProps = {
  businessId: string;
  initialProducts: ProductRow[];
  ingredients: IngredientOption[];
  fixedCosts: FixedCostSummaryRow[];
  pricingSettings: PricingSettings;
  focusId?: string;
};

type SheetDraftItem = {
  ingredientId: string;
  quantity: string;
};

type ParsedSheetItem = {
  ingredientId: string;
  quantity: number;
  unit: Unit;
};

const emptyProductValues: ProductInput = {
  name: "",
  category: "",
  description: "",
  sellingPrice: "0,00",
  active: true,
};

export function ProductsManager({
  businessId,
  initialProducts,
  ingredients,
  fixedCosts,
  pricingSettings,
  focusId,
}: ProductsManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fixedCostSummary = useMemo(() => {
    const total = calculateFixedCostsTotal(
      fixedCosts,
      pricingSettings.ifoodMonthlyFee,
    );
    const percentage = calculateFixedCostPercentage(
      total,
      pricingSettings.averageMonthlyRevenue,
    );

    return { total, percentage };
  }, [fixedCosts, pricingSettings.averageMonthlyRevenue, pricingSettings.ifoodMonthlyFee]);

  async function saveProduct(
    values: ProductInput,
    sheetDraft: SheetDraftItem[],
    productId?: string,
  ) {
    setMessage(null);
    setError(null);

    let parsedProduct;
    let parsedSheet: ParsedSheetItem[];

    try {
      parsedProduct = {
        name: values.name.trim(),
        category: values.category?.trim() || null,
        description: values.description?.trim() || null,
        sellingPrice: parseBrazilianNumber(values.sellingPrice),
        active: values.active,
      };
      parsedSheet = parseSheetDraft(sheetDraft, ingredients);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Dados invalidos.");
      return;
    }

    const supabase = createClient();
    const productPayload = {
      business_id: businessId,
      name: parsedProduct.name,
      category: parsedProduct.category,
      description: parsedProduct.description,
      type: "produced",
      selling_price: parsedProduct.sellingPrice,
      resale_unit_cost: 0,
      loss_percentage: 0,
      active: parsedProduct.active,
    };

    const productQuery = productId
      ? supabase
          .from("products")
          .update(productPayload)
          .eq("id", productId)
          .eq("business_id", businessId)
          .select("id, name, category, description, selling_price, active")
          .single()
      : supabase
          .from("products")
          .insert(productPayload)
          .select("id, name, category, description, selling_price, active")
          .single();

    const { data: savedProduct, error: productError } = await productQuery;

    if (productError) {
      setError(`Nao foi possivel salvar o produto: ${productError.message}`);
      return;
    }

    const sheetResult = await replaceTechnicalSheet(savedProduct.id, parsedSheet);

    const row: ProductRow = {
      ...(savedProduct as Omit<ProductRow, "technicalSheet">),
      technicalSheet: sheetResult.rows,
    };

    setProducts((current) =>
      productId
        ? current.map((product) => (product.id === productId ? row : product))
        : [row, ...current],
    );
    setEditingId(null);

    if (sheetResult.errorMessage) {
      setError(sheetResult.errorMessage);
      return;
    }

    setMessage(productId ? "Produto salvo." : "Produto criado.");
  }

  async function replaceTechnicalSheet(
    productId: string,
    parsedSheet: ParsedSheetItem[],
  ) {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("product_ingredients")
      .delete()
      .eq("business_id", businessId)
      .eq("product_id", productId);

    if (deleteError) {
      return {
        rows: products.find((product) => product.id === productId)?.technicalSheet ?? [],
        errorMessage: `Produto salvo, mas nao foi possivel atualizar a ficha tecnica: ${deleteError.message}`,
      };
    }

    if (parsedSheet.length === 0) {
      return { rows: [] as ProductIngredientRow[], errorMessage: null };
    }

    const { data, error: insertError } = await supabase
      .from("product_ingredients")
      .insert(
        parsedSheet.map((item) => ({
          business_id: businessId,
          product_id: productId,
          ingredient_id: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      )
      .select("id, product_id, ingredient_id, quantity, unit");

    if (insertError) {
      return {
        rows: [] as ProductIngredientRow[],
        errorMessage: `Produto salvo, mas houve falha ao gravar a ficha tecnica: ${insertError.message}`,
      };
    }

    return {
      rows: (data ?? []) as ProductIngredientRow[],
      errorMessage: null,
    };
  }

  async function toggleActive(product: ProductRow) {
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("products")
      .update({ active: !product.active })
      .eq("id", product.id)
      .eq("business_id", businessId)
      .select("id, name, category, description, selling_price, active")
      .single();

    if (updateError) {
      setError("Nao foi possivel alterar o status do produto.");
      return;
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...(data as Omit<ProductRow, "technicalSheet">),
              technicalSheet: item.technicalSheet,
            }
          : item,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Produtos cadastrados" value={String(products.length)} />
        <SummaryCard
          label="Custos fixos considerados"
          value={formatCurrency(fixedCostSummary.total)}
        />
        <SummaryCard
          label="Percentual de custo fixo"
          value={
            fixedCostSummary.percentage == null
              ? "Informe faturamento"
              : `${(fixedCostSummary.percentage * 100).toFixed(2)}%`
          }
        />
      </div>

      {pricingSettings.averageMonthlyRevenue <= 0 ? (
        <Alert>
          <AlertDescription>
            Informe faturamento medio para calcular preco com custos fixos.
          </AlertDescription>
        </Alert>
      ) : null}

      {ingredients.length === 0 ? (
        <Alert>
          <AlertDescription>
            Cadastre ingredientes ativos antes de montar fichas tecnicas.
          </AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <ProductEditor
        ingredients={ingredients}
        title="Novo produto"
        submitLabel="Criar produto"
        defaultValues={emptyProductValues}
        defaultSheet={[]}
        onSubmit={(values, sheet) => saveProduct(values, sheet)}
      />

      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="rounded-lg border bg-background p-8 text-center text-muted-foreground">
            Cadastre seu primeiro produto para montar a ficha tecnica e calcular margens.
          </div>
        ) : (
          products.map((product) =>
            editingId === product.id ? (
              <ProductEditor
                key={product.id}
                ingredients={ingredients}
                title="Editar produto"
                submitLabel="Salvar produto"
                defaultValues={{
                  name: product.name,
                  category: product.category ?? "",
                  description: product.description ?? "",
                  sellingPrice: String(product.selling_price).replace(".", ","),
                  active: product.active,
                }}
                defaultSheet={product.technicalSheet.map((item) => ({
                  ingredientId: item.ingredient_id,
                  quantity: String(item.quantity).replace(".", ","),
                }))}
                onSubmit={(values, sheet) => saveProduct(values, sheet, product.id)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ProductCard
                key={product.id}
                product={product}
                ingredients={ingredients}
                fixedCostPercentage={fixedCostSummary.percentage}
                pricingSettings={pricingSettings}
                isFocused={focusId === product.id}
                onEdit={() => setEditingId(product.id)}
                onToggleActive={() => toggleActive(product)}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}

function ProductEditor({
  ingredients,
  title,
  submitLabel,
  defaultValues,
  defaultSheet,
  onSubmit,
  onCancel,
}: {
  ingredients: IngredientOption[];
  title: string;
  submitLabel: string;
  defaultValues: ProductInput;
  defaultSheet: SheetDraftItem[];
  onSubmit: (values: ProductInput, sheet: SheetDraftItem[]) => void;
  onCancel?: () => void;
}) {
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });
  const [sheet, setSheet] = useState(defaultSheet);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const availableIngredients = ingredients.filter((ingredient) => ingredient.active);
  const preview = useMemo(() => {
    try {
      const parsed = parseSheetDraft(sheet, availableIngredients);
      const items = parsed.map((item) => {
        const ingredient = availableIngredients.find(
          (option) => option.id === item.ingredientId,
        );

        if (!ingredient) {
          throw new Error("Ingrediente nao encontrado.");
        }

        return {
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
          ingredientUsageUnit: ingredient.usage_unit,
          ingredientUnitCost: ingredient.unit_cost,
        };
      });
      const baseCost = calculateProductBaseCost(items);

      return {
        baseCost,
        error: null,
      };
    } catch (previewError) {
      return {
        baseCost: null,
        error: previewError instanceof Error ? previewError.message : "Ficha incompleta.",
      };
    }
  }, [availableIngredients, sheet]);

  function addSheetItem() {
    setSheetError(null);
    const selected = new Set(sheet.map((item) => item.ingredientId));
    const nextIngredient = availableIngredients.find(
      (ingredient) => !selected.has(ingredient.id),
    );

    if (!nextIngredient) {
      setSheetError("Nao ha outro ingrediente ativo para adicionar.");
      return;
    }

    setSheet((current) => [
      ...current,
      { ingredientId: nextIngredient.id, quantity: "1,00" },
    ]);
  }

  function updateSheetItem(index: number, patch: Partial<SheetDraftItem>) {
    setSheetError(null);
    const next = sheet.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    );

    if (hasDraftDuplicate(next)) {
      setSheetError("Nao adicione o mesmo ingrediente duas vezes na ficha tecnica.");
      return;
    }

    setSheet(next);
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values, sheet))}
      className="rounded-lg border bg-background p-4"
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            O custo do produto e calculado pela ficha tecnica.
          </p>
        </div>
        <div className="rounded-lg border px-3 py-2 text-right">
          <p className="text-xs text-muted-foreground">Custo calculado</p>
          <p className="font-semibold">
            {preview.baseCost == null ? "Sem ficha" : formatCurrency(preview.baseCost)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          id={`${title}-name`}
          label="Nome"
          register={form.register("name")}
          error={form.formState.errors.name?.message}
        />
        <TextField
          id={`${title}-category`}
          label="Categoria"
          register={form.register("category")}
        />
        <TextField
          id={`${title}-sellingPrice`}
          label="Preco de venda"
          register={form.register("sellingPrice")}
          error={form.formState.errors.sellingPrice?.message}
          placeholder="32,90"
        />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" {...form.register("active")} />
          Ativo
        </label>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${title}-description`}>Descricao opcional</Label>
          <Textarea id={`${title}-description`} {...form.register("description")} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium">Ficha tecnica</h3>
            <p className="text-sm text-muted-foreground">
              A unidade fica travada na unidade de uso de cada ingrediente.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={addSheetItem}>
            <Plus />
            Ingrediente
          </Button>
        </div>

        {sheet.length === 0 ? (
          <Alert>
            <AlertDescription>
              Produto sem ficha tecnica nao possui custo calculado.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {sheet.map((item, index) => {
              const ingredient = availableIngredients.find(
                (option) => option.id === item.ingredientId,
              );
              const itemCost = getDraftItemCost(item, ingredient);

              return (
                <div
                  key={`${item.ingredientId}-${index}`}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_140px_90px_140px_auto]"
                >
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={item.ingredientId}
                    onChange={(event) =>
                      updateSheetItem(index, { ingredientId: event.target.value })
                    }
                  >
                    {availableIngredients.map((option) => (
                      <option
                        key={option.id}
                        value={option.id}
                        disabled={
                          option.id !== item.ingredientId &&
                          sheet.some((row) => row.ingredientId === option.id)
                        }
                      >
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={item.quantity}
                    onChange={(event) =>
                      updateSheetItem(index, { quantity: event.target.value })
                    }
                    placeholder="80,00"
                  />
                  <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                    {ingredient?.usage_unit ?? "-"}
                  </div>
                  <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                    {itemCost == null ? "-" : formatCurrency(itemCost)}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setSheet((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Remover
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {sheetError ? (
          <p className="mt-3 text-sm text-destructive">{sheetError}</p>
        ) : null}
        {preview.error && sheet.length > 0 ? (
          <p className="mt-3 text-sm text-destructive">{preview.error}</p>
        ) : null}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit">
          <Plus />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ProductCard({
  product,
  ingredients,
  fixedCostPercentage,
  pricingSettings,
  isFocused,
  onEdit,
  onToggleActive,
}: {
  product: ProductRow;
  ingredients: IngredientOption[];
  fixedCostPercentage: number | null;
  pricingSettings: PricingSettings;
  isFocused: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const sheetItems = buildTechnicalSheetItems(product.technicalSheet, ingredients);
  const baseCost = calculateProductBaseCost(sheetItems);
  const safeCost = calculateProductSafeCost(baseCost);
  const ownMargin = calculateOwnChannelProductMargin({
    sellingPrice: product.selling_price,
    safeCost,
    fixedCostPercentage,
    settings: pricingSettings,
  });
  const ifoodMargin = calculateIfoodProductMargin({
    sellingPrice: product.selling_price,
    safeCost,
    fixedCostPercentage,
    settings: pricingSettings,
  });
  const ownSuggested = calculateSuggestedOwnChannelPrice({
    safeCost,
    fixedCostPercentage,
    settings: pricingSettings,
  });
  const ifoodSuggested = calculateSuggestedIfoodPrice({
    safeCost,
    fixedCostPercentage,
    settings: pricingSettings,
  });

  return (
    <article
      id={`product-${product.id}`}
      className={`rounded-lg border bg-background p-4 ${
        isFocused ? "border-foreground shadow-sm ring-2 ring-foreground/10" : ""
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{product.name}</h2>
            <span className="rounded-md border px-2 py-1 text-xs">
              {product.active ? "Ativo" : "Inativo"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {[product.category, product.description].filter(Boolean).join(" - ") ||
              "Sem categoria"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onToggleActive}>
            {product.active ? "Desativar" : "Ativar"}
          </Button>
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil />
          </Button>
        </div>
      </div>

      {baseCost == null ? (
        <Alert className="mt-4">
          <AlertDescription>
            Produto sem ficha tecnica nao possui custo calculado.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Metric label="Preco venda" value={formatCurrency(product.selling_price)} />
        <Metric label="Custo base" value={baseCost == null ? "-" : formatCurrency(baseCost)} />
        <Metric label="Custo seguro" value={safeCost == null ? "-" : formatCurrency(safeCost)} />
        <Metric
          label="Diagnostico"
          value={getDiagnosisText(ownMargin, pricingSettings.desiredProfitMargin)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PricingPanel
          title="Canal proprio"
          margin={ownMargin}
          suggested={ownSuggested}
        />
        <PricingPanel title="iFood" margin={ifoodMargin} suggested={ifoodSuggested} />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3 font-medium">Ingrediente</th>
              <th className="p-3 font-medium">Quantidade</th>
              <th className="p-3 font-medium">Custo item</th>
            </tr>
          </thead>
          <tbody>
            {product.technicalSheet.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={3}>
                  Nenhum ingrediente na ficha tecnica.
                </td>
              </tr>
            ) : (
              product.technicalSheet.map((item) => {
                const ingredient = ingredients.find(
                  (option) => option.id === item.ingredient_id,
                );
                const itemCost = ingredient
                  ? calculateTechnicalSheetItemCost(item.quantity, ingredient.unit_cost)
                  : null;

                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">{ingredient?.name ?? "Ingrediente indisponivel"}</td>
                    <td className="p-3">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-3">
                      {itemCost == null ? "-" : formatCurrency(itemCost)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function PricingPanel({
  title,
  margin,
  suggested,
}: {
  title: string;
  margin: MarginResult;
  suggested: SuggestedPriceResult;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">{title}</h3>
      {margin.status === "neutral" ? (
        <p className="mt-3 text-sm text-muted-foreground">{margin.reason}</p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Metric
            label="Lucro contribuicao"
            value={formatCurrency(margin.contributionProfit)}
          />
          <Metric
            label="Margem contribuicao"
            value={`${(margin.contributionMargin * 100).toFixed(2)}%`}
          />
          <Metric
            label="Lucro liquido est."
            value={formatCurrency(margin.estimatedNetProfit)}
          />
          <Metric
            label="Margem liquida est."
            value={`${(margin.estimatedNetMargin * 100).toFixed(2)}%`}
          />
        </div>
      )}

      <div className="mt-4 rounded-lg bg-muted p-3">
        <p className="text-xs text-muted-foreground">Preco sugerido</p>
        <p className="text-lg font-semibold">
          {suggested.status === "ready" ? formatCurrency(suggested.price) : "-"}
        </p>
        {suggested.status === "neutral" ? (
          <p className="mt-1 text-xs text-muted-foreground">{suggested.reason}</p>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function TextField({
  id,
  label,
  register,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  register: object;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} placeholder={placeholder} {...register} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function parseSheetDraft(
  draft: SheetDraftItem[],
  ingredients: IngredientOption[],
): ParsedSheetItem[] {
  assertNoDuplicateIngredients(draft.map((item) => item.ingredientId));

  return draft.map((item) => {
    const ingredient = ingredients.find((option) => option.id === item.ingredientId);

    if (!ingredient) {
      throw new Error("Ingrediente da ficha tecnica nao foi encontrado.");
    }

    const quantity = parseBrazilianNumber(item.quantity);

    if (quantity <= 0) {
      throw new Error("Quantidade usada deve ser maior que zero.");
    }

    return {
      ingredientId: item.ingredientId,
      quantity,
      unit: ingredient.usage_unit,
    };
  });
}

function buildTechnicalSheetItems(
  sheet: ProductIngredientRow[],
  ingredients: IngredientOption[],
): TechnicalSheetItem[] {
  return sheet.map((item) => {
    const ingredient = ingredients.find((option) => option.id === item.ingredient_id);

    if (!ingredient) {
      throw new Error("Ingrediente da ficha tecnica nao foi encontrado.");
    }

    return {
      ingredientId: item.ingredient_id,
      quantity: item.quantity,
      unit: item.unit,
      ingredientUsageUnit: ingredient.usage_unit,
      ingredientUnitCost: ingredient.unit_cost,
    };
  });
}

function getDraftItemCost(
  item: SheetDraftItem,
  ingredient: IngredientOption | undefined,
) {
  if (!ingredient) {
    return null;
  }

  try {
    return calculateTechnicalSheetItemCost(
      parseBrazilianNumber(item.quantity),
      ingredient.unit_cost,
    );
  } catch {
    return null;
  }
}

function hasDraftDuplicate(sheet: SheetDraftItem[]) {
  return new Set(sheet.map((item) => item.ingredientId)).size !== sheet.length;
}

function getDiagnosisText(margin: MarginResult, desiredProfitMargin: number) {
  if (margin.status === "neutral") {
    return "Neutro";
  }

  const diagnosis = getProductDiagnosis(
    margin.estimatedNetProfit,
    margin.estimatedNetMargin,
    desiredProfitMargin,
  );

  const labels: Record<ReturnType<typeof getProductDiagnosis>, string> = {
    prejuizo: "Prejuizo",
    perigoso: "Perigoso",
    atencao: "Atencao",
    saudavel: "Saudavel",
  };

  return labels[diagnosis];
}
