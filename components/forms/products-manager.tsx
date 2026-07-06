"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MenuImageUpload } from "@/components/forms/menu-image-upload";
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
import { getInitials } from "@/lib/storage/business-logos";
import { createClient } from "@/lib/supabase/client";
import { productSchema, type ProductInput } from "@/lib/validations/products";

export type ProductRow = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
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
  businessName: string;
  businessLogoUrl: string | null;
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
  businessName,
  businessLogoUrl,
}: ProductsManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(focusId ?? null);
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
  const hasActiveIngredients = ingredients.some((ingredient) => ingredient.active);

  useEffect(() => {
    if (!focusId) {
      return;
    }

    window.setTimeout(() => scrollToProduct(focusId), 0);
  }, [focusId, products.length]);

  function focusProduct(productId: string) {
    setFocusedId(productId);
    updateFocusUrl("products", productId);
    scrollToProduct(productId);
  }

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
          .select("id, name, category, description, image_url, selling_price, active")
          .single()
      : supabase
          .from("products")
          .insert(productPayload)
          .select("id, name, category, description, image_url, selling_price, active")
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

    setProducts((current) => {
      if (!row.active) {
        return current.filter((product) => product.id !== row.id);
      }

      return productId
        ? current.map((product) => (product.id === productId ? row : product))
        : [row, ...current];
    });
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

  async function archiveProduct(product: ProductRow) {
    const confirmed = window.confirm(
      "Este produto será removido da listagem principal e não poderá ser usado em novos combos. A ficha técnica e o histórico serão preservados. Deseja continuar?",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("products")
      .update({
        active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", product.id)
      .eq("business_id", businessId);

    if (updateError) {
      setError("Nao foi possivel excluir o produto.");
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== product.id));
    setFocusedId((current) => (current === product.id ? null : current));
    setMessage("Produto removido da listagem principal. O histórico foi preservado.");
  }

  function updateProductImage(productId: string, imageUrl: string) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, image_url: imageUrl } : product,
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

      {!hasActiveIngredients ? (
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px] xl:items-start">
        <div className="space-y-6">
          <ProductEditor
            ingredients={ingredients}
            title="Novo produto"
            submitLabel="Criar produto"
            defaultValues={emptyProductValues}
            defaultSheet={[]}
            onSubmit={(values, sheet) => saveProduct(values, sheet)}
          />

          <div className="xl:hidden">
            <ProductQuickNav
              products={products}
              focusedId={focusedId}
              onSelect={focusProduct}
            />
          </div>

          <div className="space-y-4">
            {products.length === 0 ? (
              <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-8 text-center text-[#64748B] shadow-sm">
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
                    businessId={businessId}
                    businessName={businessName}
                    businessLogoUrl={businessLogoUrl}
                    ingredients={ingredients}
                    fixedCostPercentage={fixedCostSummary.percentage}
                    pricingSettings={pricingSettings}
                    isFocused={focusedId === product.id}
                    onEdit={() => setEditingId(product.id)}
                    onArchive={() => archiveProduct(product)}
                    onImageUploaded={(imageUrl) => updateProductImage(product.id, imageUrl)}
                  />
                ),
              )
            )}
          </div>
        </div>

        <div className="hidden xl:sticky xl:top-6 xl:block">
          <ProductQuickNav
            products={products}
            focusedId={focusedId}
            onSelect={focusProduct}
          />
        </div>
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

  const selectedIngredientIds = new Set(sheet.map((item) => item.ingredientId));
  const availableIngredients = ingredients.filter(
    (ingredient) => ingredient.active || selectedIngredientIds.has(ingredient.id),
  );
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

function ProductQuickNav({
  products,
  focusedId,
  onSelect,
}: {
  products: ProductRow[];
  focusedId: string | null;
  onSelect: (productId: string) => void;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <aside className="rounded-[22px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-extrabold text-[#0F172A]">Produtos cadastrados</h2>
        <p className="mt-1 text-xs leading-5 text-[#64748B]">
          Clique para ir direto ao item.
        </p>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
        {products.map((product) => {
          const isFocused = focusedId === product.id;

          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product.id)}
              className={`min-w-[210px] rounded-[16px] border p-3 text-left transition xl:min-w-0 ${
                isFocused
                  ? "border-[#F97316] bg-[#FFF7ED] ring-2 ring-[#F97316]/15"
                  : "border-[#E2E8F0] bg-white hover:border-[#F97316]/40 hover:bg-[#FFF7ED]/40"
              }`}
            >
              <span className="block truncate text-sm font-bold text-[#0F172A]">
                {product.name}
              </span>
              <span className="mt-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-[#64748B]">
                  {formatCurrency(product.selling_price)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-bold ${
                    product.active
                      ? "bg-[#F0FDF4] text-[#16A34A]"
                      : "bg-slate-100 text-[#64748B]"
                  }`}
                >
                  {product.active ? "Ativo" : "Inativo"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function ProductCard({
  product,
  businessId,
  businessName,
  businessLogoUrl,
  ingredients,
  fixedCostPercentage,
  pricingSettings,
  isFocused,
  onEdit,
  onArchive,
  onImageUploaded,
}: {
  product: ProductRow;
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
  ingredients: IngredientOption[];
  fixedCostPercentage: number | null;
  pricingSettings: PricingSettings;
  isFocused: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onImageUploaded: (imageUrl: string) => void;
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
      className={`scroll-mt-8 rounded-[22px] border bg-white p-4 shadow-sm transition ${
        isFocused ? "border-[#F97316] ring-2 ring-[#F97316]/15" : "border-[#E2E8F0]"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
          <MenuImageUpload
            businessId={businessId}
            itemId={product.id}
            itemType="products"
            itemName={product.name}
            initialImageUrl={product.image_url}
            onUploaded={onImageUploaded}
          />
          <div className="min-w-0">
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
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil />
          </Button>
          <Button type="button" variant="destructive" onClick={onArchive}>
            <Trash2 />
            Excluir
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
          title="Canal próprio"
          margin={ownMargin}
          suggested={ownSuggested}
          thumbnail={{
            src: businessLogoUrl,
            alt: `Logo de ${businessName}`,
            fallback: getInitials(businessName),
          }}
        />
        <PricingPanel
          title="iFood"
          margin={ifoodMargin}
          suggested={ifoodSuggested}
          thumbnail={{
            src: "/channel-icons/ifood.png",
            alt: "iFood",
            fallback: "IF",
          }}
        />
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
  thumbnail,
}: {
  title: string;
  margin: MarginResult;
  suggested: SuggestedPriceResult;
  thumbnail: {
    src: string | null;
    alt: string;
    fallback: string;
  };
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <ChannelThumbnail {...thumbnail} />
        <h3 className="font-medium">{title}</h3>
      </div>
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

function ChannelThumbnail({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-extrabold text-[#64748B]">
      <span aria-hidden="true">{fallback}</span>
      {src && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </span>
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

function scrollToProduct(productId: string) {
  document
    .getElementById(`product-${productId}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateFocusUrl(route: "products", itemId: string) {
  const url = new URL(window.location.href);
  url.pathname = `/${route}`;
  url.searchParams.set("focus", itemId);
  window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
}
