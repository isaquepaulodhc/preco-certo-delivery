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
  assertComboProductsHaveCost,
  assertNoDuplicateComboProducts,
  calculateComboBaseCost,
  calculateComboDiscountAmount,
  calculateComboDiscountPercentage,
  calculateComboItemCost,
  calculateComboSafeCost,
  calculateIndividualProductsTotalPrice,
  type ComboProductCostItem,
} from "@/lib/calculations/combos";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import { formatCurrency, parseBrazilianNumber } from "@/lib/calculations/money";
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
import { getInitials } from "@/lib/storage/business-logos";
import { createClient } from "@/lib/supabase/client";
import { comboSchema, type ComboInput } from "@/lib/validations/combos";

export type ComboRow = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  selling_price: number;
  active: boolean;
  items: ComboItemRow[];
};

export type ComboItemRow = {
  id: string;
  combo_id: string;
  product_id: string;
  quantity: number;
};

export type ComboProductOption = {
  id: string;
  name: string;
  selling_price: number;
  active: boolean;
  safeCost: number | null;
};

export type FixedCostSummaryRow = {
  amount: number;
  active: boolean;
};

type CombosManagerProps = {
  businessId: string;
  initialCombos: ComboRow[];
  products: ComboProductOption[];
  fixedCosts: FixedCostSummaryRow[];
  pricingSettings: PricingSettings;
  focusId?: string;
  businessName: string;
  businessLogoUrl: string | null;
};

type ComboDraftItem = {
  productId: string;
  quantity: string;
};

type ParsedComboItem = {
  productId: string;
  quantity: number;
};

const emptyComboValues: ComboInput = {
  name: "",
  category: "",
  description: "",
  sellingPrice: "0,00",
  active: true,
};

export function CombosManager({
  businessId,
  initialCombos,
  products,
  fixedCosts,
  pricingSettings,
  focusId,
  businessName,
  businessLogoUrl,
}: CombosManagerProps) {
  const [combos, setCombos] = useState(initialCombos);
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
  const hasActiveProducts = products.some((product) => product.active);

  useEffect(() => {
    if (!focusId) {
      return;
    }

    window.setTimeout(() => scrollToCombo(focusId), 0);
  }, [focusId, combos.length]);

  function focusCombo(comboId: string) {
    setFocusedId(comboId);
    updateFocusUrl("combos", comboId);
    scrollToCombo(comboId);
  }

  async function saveCombo(
    values: ComboInput,
    itemDraft: ComboDraftItem[],
    comboId?: string,
  ) {
    setMessage(null);
    setError(null);

    let parsedCombo;
    let parsedItems: ParsedComboItem[];

    try {
      parsedCombo = {
        name: values.name.trim(),
        category: values.category?.trim() || null,
        description: values.description?.trim() || null,
        sellingPrice: parseBrazilianNumber(values.sellingPrice),
        active: values.active,
      };
      parsedItems = parseComboDraft(itemDraft, products);
      const costItems = buildComboCostItems(parsedItems, products);
      assertComboProductsHaveCost(costItems);
      calculateComboBaseCost(costItems);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Dados invalidos.");
      return;
    }

    const supabase = createClient();
    const comboPayload = {
      business_id: businessId,
      name: parsedCombo.name,
      category: parsedCombo.category,
      description: parsedCombo.description,
      selling_price: parsedCombo.sellingPrice,
      loss_percentage: 0,
      active: parsedCombo.active,
    };

    const comboQuery = comboId
      ? supabase
          .from("combos")
          .update(comboPayload)
          .eq("id", comboId)
          .eq("business_id", businessId)
          .select("id, name, category, description, image_url, selling_price, active")
          .single()
      : supabase
          .from("combos")
          .insert(comboPayload)
          .select("id, name, category, description, image_url, selling_price, active")
          .single();

    const { data: savedCombo, error: comboError } = await comboQuery;

    if (comboError) {
      setError(`Nao foi possivel salvar o combo: ${comboError.message}`);
      return;
    }

    const itemsResult = await replaceComboItems(savedCombo.id, parsedItems);
    const row: ComboRow = {
      ...(savedCombo as Omit<ComboRow, "items">),
      items: itemsResult.rows,
    };

    setCombos((current) => {
      if (!row.active) {
        return current.filter((combo) => combo.id !== row.id);
      }

      return comboId
        ? current.map((combo) => (combo.id === comboId ? row : combo))
        : [row, ...current];
    });
    setEditingId(null);

    if (itemsResult.errorMessage) {
      setError(itemsResult.errorMessage);
      return;
    }

    setMessage(comboId ? "Combo salvo." : "Combo criado.");
  }

  async function replaceComboItems(
    comboId: string,
    parsedItems: ParsedComboItem[],
  ) {
    const supabase = createClient();
    const { data: existingRows, error: selectError } = await supabase
      .from("combo_items")
      .select("id, combo_id, product_id, quantity, deleted_at")
      .eq("business_id", businessId)
      .eq("combo_id", comboId);

    if (selectError) {
      return {
        rows: combos.find((combo) => combo.id === comboId)?.items ?? [],
        errorMessage: `Combo salvo, mas nao foi possivel carregar os produtos atuais: ${selectError.message}`,
      };
    }

    const existingByProductId = new Map(
      (existingRows ?? []).map((row) => [
        row.product_id,
        row as ComboItemRow & { deleted_at: string | null },
      ]),
    );
    const parsedProductIds = new Set(parsedItems.map((item) => item.productId));
    const archivedAt = new Date().toISOString();

    for (const item of parsedItems) {
      const existing = existingByProductId.get(item.productId);
      const payload = {
        quantity: item.quantity,
        deleted_at: null,
      };
      const { error: syncError } = existing
        ? await supabase
            .from("combo_items")
            .update(payload)
            .eq("business_id", businessId)
            .eq("id", existing.id)
        : await supabase.from("combo_items").insert({
          business_id: businessId,
          combo_id: comboId,
          product_id: item.productId,
          ...payload,
        });

      if (syncError) {
        return {
          rows: combos.find((combo) => combo.id === comboId)?.items ?? [],
          errorMessage: `Combo salvo, mas houve falha ao sincronizar os produtos: ${syncError.message}`,
        };
      }
    }

    for (const row of existingRows ?? []) {
      if (parsedProductIds.has(row.product_id) || row.deleted_at) {
        continue;
      }

      const { error: archiveError } = await supabase
        .from("combo_items")
        .update({ deleted_at: archivedAt })
        .eq("business_id", businessId)
        .eq("id", row.id);

      if (archiveError) {
        return {
          rows: combos.find((combo) => combo.id === comboId)?.items ?? [],
          errorMessage: `Combo salvo, mas houve falha ao arquivar produtos removidos: ${archiveError.message}`,
        };
      }
    }

    const { data, error: refreshError } = await supabase
      .from("combo_items")
      .select("id, combo_id, product_id, quantity")
      .eq("business_id", businessId)
      .eq("combo_id", comboId)
      .is("deleted_at", null);

    if (refreshError) {
      return {
        rows: combos.find((combo) => combo.id === comboId)?.items ?? [],
        errorMessage: `Combo salvo, mas houve falha ao recarregar os produtos: ${refreshError.message}`,
      };
    }

    return {
      rows: (data ?? []) as ComboItemRow[],
      errorMessage: null,
    };
  }

  async function archiveCombo(combo: ComboRow) {
    const confirmed = window.confirm(
      "Este combo será removido da listagem principal. A composição e o histórico serão preservados. Deseja continuar?",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("combos")
      .update({
        active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", combo.id)
      .eq("business_id", businessId);

    if (updateError) {
      setError("Nao foi possivel excluir o combo.");
      return;
    }

    setCombos((current) => current.filter((item) => item.id !== combo.id));
    setFocusedId((current) => (current === combo.id ? null : current));
    setMessage("Combo removido da listagem principal. O histórico foi preservado.");
  }

  function updateComboImage(comboId: string, imageUrl: string) {
    setCombos((current) =>
      current.map((combo) =>
        combo.id === comboId ? { ...combo, image_url: imageUrl } : combo,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Combos cadastrados" value={String(combos.length)} />
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

      {!hasActiveProducts ? (
        <Alert>
          <AlertDescription>
            Cadastre produtos com ficha tecnica antes de montar combos.
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
          <ComboEditor
            products={products}
            title="Novo combo"
            submitLabel="Criar combo"
            defaultValues={emptyComboValues}
            defaultItems={[]}
            onSubmit={(values, items) => saveCombo(values, items)}
          />

          <div className="xl:hidden">
            <ComboQuickNav
              combos={combos}
              focusedId={focusedId}
              onSelect={focusCombo}
            />
          </div>

          <div className="space-y-4">
            {combos.length === 0 ? (
              <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-8 text-center text-[#64748B] shadow-sm">
                Cadastre seu primeiro combo para comparar preco avulso, desconto e margem.
              </div>
            ) : (
              combos.map((combo) =>
                editingId === combo.id ? (
                  <ComboEditor
                    key={combo.id}
                    products={products}
                    title="Editar combo"
                    submitLabel="Salvar combo"
                    defaultValues={{
                      name: combo.name,
                      category: combo.category ?? "",
                      description: combo.description ?? "",
                      sellingPrice: String(combo.selling_price).replace(".", ","),
                      active: combo.active,
                    }}
                    defaultItems={combo.items.map((item) => ({
                      productId: item.product_id,
                      quantity: String(item.quantity).replace(".", ","),
                    }))}
                    onSubmit={(values, items) => saveCombo(values, items, combo.id)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <ComboCard
                    key={combo.id}
                    combo={combo}
                    businessId={businessId}
                    businessName={businessName}
                    businessLogoUrl={businessLogoUrl}
                    products={products}
                    fixedCostPercentage={fixedCostSummary.percentage}
                    pricingSettings={pricingSettings}
                    isFocused={focusedId === combo.id}
                    onEdit={() => setEditingId(combo.id)}
                    onArchive={() => archiveCombo(combo)}
                    onImageUploaded={(imageUrl) => updateComboImage(combo.id, imageUrl)}
                  />
                ),
              )
            )}
          </div>
        </div>

        <div className="hidden xl:sticky xl:top-6 xl:block">
          <ComboQuickNav
            combos={combos}
            focusedId={focusedId}
            onSelect={focusCombo}
          />
        </div>
      </div>
    </div>
  );
}

function ComboEditor({
  products,
  title,
  submitLabel,
  defaultValues,
  defaultItems,
  onSubmit,
  onCancel,
}: {
  products: ComboProductOption[];
  title: string;
  submitLabel: string;
  defaultValues: ComboInput;
  defaultItems: ComboDraftItem[];
  onSubmit: (values: ComboInput, items: ComboDraftItem[]) => void;
  onCancel?: () => void;
}) {
  const form = useForm<ComboInput>({
    resolver: zodResolver(comboSchema),
    defaultValues,
  });
  const [items, setItems] = useState(defaultItems);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const selectedProductIds = new Set(items.map((item) => item.productId));
  const availableProducts = products.filter(
    (product) =>
      (product.active && product.safeCost != null) ||
      selectedProductIds.has(product.id),
  );
  const blockedProducts = products.filter(
    (product) => product.active && product.safeCost == null,
  );
  const preview = useMemo(() => {
    try {
      const parsed = parseComboDraft(items, products);
      const costItems = buildComboCostItems(parsed, products);
      const baseCost = calculateComboBaseCost(costItems);
      const individualTotal = calculateIndividualProductsTotalPrice(costItems);

      return {
        baseCost,
        individualTotal,
        error: null,
      };
    } catch (previewError) {
      return {
        baseCost: null,
        individualTotal: null,
        error: previewError instanceof Error ? previewError.message : "Combo incompleto.",
      };
    }
  }, [items, products]);

  function addItem() {
    setItemsError(null);
    const selected = new Set(items.map((item) => item.productId));
    const nextProduct = availableProducts.find((product) => !selected.has(product.id));

    if (!nextProduct) {
      setItemsError("Nao ha outro produto com custo calculado para adicionar.");
      return;
    }

    setItems((current) => [
      ...current,
      { productId: nextProduct.id, quantity: "1,00" },
    ]);
  }

  function updateItem(index: number, patch: Partial<ComboDraftItem>) {
    setItemsError(null);
    const next = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    );

    if (hasDraftDuplicate(next)) {
      setItemsError("Nao adicione o mesmo produto duas vezes no combo.");
      return;
    }

    setItems(next);
  }

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values, items))}
      className="rounded-lg border bg-background p-4"
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            O custo do combo vem dos custos calculados dos produtos.
          </p>
        </div>
        <div className="rounded-lg border px-3 py-2 text-right">
          <p className="text-xs text-muted-foreground">Custo calculado</p>
          <p className="font-semibold">
            {preview.baseCost == null ? "Sem produtos" : formatCurrency(preview.baseCost)}
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
          placeholder="59,90"
        />
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor={`${title}-description`}>Descricao opcional</Label>
          <Textarea id={`${title}-description`} {...form.register("description")} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-medium">Produtos do combo</h3>
            <p className="text-sm text-muted-foreground">
              Use quantidade para repetir um produto dentro do combo.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={addItem}>
            <Plus />
            Produto
          </Button>
        </div>

        {blockedProducts.length > 0 ? (
          <Alert className="mb-3">
            <AlertDescription>
              Alguns produtos ativos estao sem custo calculado e ficam bloqueados para combos.
            </AlertDescription>
          </Alert>
        ) : null}

        {items.length === 0 ? (
          <Alert>
            <AlertDescription>
              Adicione produtos com custo calculado para formar o combo.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const product = products.find((option) => option.id === item.productId);
              const itemCost = getDraftItemCost(item, product);

              return (
                <div
                  key={`${item.productId}-${index}`}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_130px_150px_150px_auto]"
                >
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={item.productId}
                    onChange={(event) =>
                      updateItem(index, { productId: event.target.value })
                    }
                  >
                    {availableProducts.map((option) => (
                      <option
                        key={option.id}
                        value={option.id}
                        disabled={
                          option.id !== item.productId &&
                          items.some((row) => row.productId === option.id)
                        }
                      >
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, { quantity: event.target.value })
                    }
                    placeholder="2,00"
                  />
                  <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                    {product?.safeCost == null ? "-" : formatCurrency(product.safeCost)}
                  </div>
                  <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm">
                    {itemCost == null ? "-" : formatCurrency(itemCost)}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setItems((current) =>
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

        {itemsError ? (
          <p className="mt-3 text-sm text-destructive">{itemsError}</p>
        ) : null}
        {preview.error && items.length > 0 ? (
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

function ComboQuickNav({
  combos,
  focusedId,
  onSelect,
}: {
  combos: ComboRow[];
  focusedId: string | null;
  onSelect: (comboId: string) => void;
}) {
  if (combos.length === 0) {
    return null;
  }

  return (
    <aside className="rounded-[22px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-extrabold text-[#0F172A]">Combos cadastrados</h2>
        <p className="mt-1 text-xs leading-5 text-[#64748B]">
          Clique para ir direto ao combo.
        </p>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible xl:pb-0">
        {combos.map((combo) => {
          const isFocused = focusedId === combo.id;

          return (
            <button
              key={combo.id}
              type="button"
              onClick={() => onSelect(combo.id)}
              className={`min-w-[210px] rounded-[16px] border p-3 text-left transition xl:min-w-0 ${
                isFocused
                  ? "border-[#F97316] bg-[#FFF7ED] ring-2 ring-[#F97316]/15"
                  : "border-[#E2E8F0] bg-white hover:border-[#F97316]/40 hover:bg-[#FFF7ED]/40"
              }`}
            >
              <span className="block truncate text-sm font-bold text-[#0F172A]">
                {combo.name}
              </span>
              <span className="mt-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-[#64748B]">
                  {formatCurrency(combo.selling_price)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-bold ${
                    combo.active
                      ? "bg-[#F0FDF4] text-[#16A34A]"
                      : "bg-slate-100 text-[#64748B]"
                  }`}
                >
                  {combo.active ? "Ativo" : "Inativo"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function ComboCard({
  combo,
  businessId,
  businessName,
  businessLogoUrl,
  products,
  fixedCostPercentage,
  pricingSettings,
  isFocused,
  onEdit,
  onArchive,
  onImageUploaded,
}: {
  combo: ComboRow;
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
  products: ComboProductOption[];
  fixedCostPercentage: number | null;
  pricingSettings: PricingSettings;
  isFocused: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onImageUploaded: (imageUrl: string) => void;
}) {
  const metrics = getComboMetrics(combo, products);
  const baseCost = metrics.baseCost;
  const safeCost = metrics.safeCost;
  const individualTotal = metrics.individualTotal;
  const discountAmount = calculateComboDiscountAmount(
    individualTotal,
    combo.selling_price,
  );
  const discountPercentage = calculateComboDiscountPercentage(
    discountAmount,
    individualTotal,
  );
  const ownMargin = calculateOwnChannelProductMargin({
    sellingPrice: combo.selling_price,
    safeCost,
    fixedCostPercentage,
    settings: pricingSettings,
  });
  const ifoodMargin = calculateIfoodProductMargin({
    sellingPrice: combo.selling_price,
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
      id={`combo-${combo.id}`}
      className={`scroll-mt-8 rounded-[22px] border bg-white p-4 shadow-sm transition ${
        isFocused ? "border-[#F97316] ring-2 ring-[#F97316]/15" : "border-[#E2E8F0]"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
          <MenuImageUpload
            businessId={businessId}
            itemId={combo.id}
            itemType="combos"
            itemName={combo.name}
            initialImageUrl={combo.image_url}
            onUploaded={onImageUploaded}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{combo.name}</h2>
              <span className="rounded-md border px-2 py-1 text-xs">
                {combo.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {[combo.category, combo.description].filter(Boolean).join(" - ") ||
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
            Combo sem produtos nao possui custo calculado.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <Metric label="Preco combo" value={formatCurrency(combo.selling_price)} />
        <Metric label="Custo total" value={baseCost == null ? "-" : formatCurrency(baseCost)} />
        <Metric
          label="Preco avulso"
          value={individualTotal == null ? "-" : formatCurrency(individualTotal)}
        />
        <Metric
          label="Diagnostico"
          value={getDiagnosisText(ownMargin, pricingSettings.desiredProfitMargin)}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric
          label="Desconto implicito"
          value={discountAmount == null ? "-" : formatCurrency(discountAmount)}
        />
        <Metric
          label="Percentual desconto"
          value={discountPercentage == null ? "-" : `${(discountPercentage * 100).toFixed(2)}%`}
        />
        <Metric
          label="Leitura comercial"
          value={getDiscountLabel(discountAmount)}
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
              <th className="p-3 font-medium">Produto</th>
              <th className="p-3 font-medium">Quantidade</th>
              <th className="p-3 font-medium">Custo item</th>
              <th className="p-3 font-medium">Preco avulso</th>
            </tr>
          </thead>
          <tbody>
            {combo.items.length === 0 ? (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={4}>
                  Nenhum produto no combo.
                </td>
              </tr>
            ) : (
              combo.items.map((item) => {
                const product = products.find((option) => option.id === item.product_id);
                const itemCost = getSavedItemCost(item, product);

                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">{product?.name ?? "Produto indisponivel"}</td>
                    <td className="p-3">{item.quantity}</td>
                    <td className="p-3">
                      {itemCost == null ? "-" : formatCurrency(itemCost)}
                    </td>
                    <td className="p-3">
                      {product == null
                        ? "-"
                        : formatCurrency(product.selling_price * item.quantity)}
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

function parseComboDraft(
  draft: ComboDraftItem[],
  products: ComboProductOption[],
): ParsedComboItem[] {
  if (draft.length === 0) {
    throw new Error("Adicione pelo menos um produto ao combo.");
  }

  assertNoDuplicateComboProducts(draft.map((item) => item.productId));

  return draft.map((item) => {
    const product = products.find((option) => option.id === item.productId);

    if (!product) {
      throw new Error("Produto do combo nao foi encontrado.");
    }

    if (product.safeCost == null) {
      throw new Error("Produto sem custo calculado nao pode entrar no combo.");
    }

    const quantity = parseBrazilianNumber(item.quantity);

    if (quantity <= 0) {
      throw new Error("Quantidade do produto no combo deve ser maior que zero.");
    }

    return {
      productId: item.productId,
      quantity,
    };
  });
}

function buildComboCostItems(
  items: ParsedComboItem[],
  products: ComboProductOption[],
): ComboProductCostItem[] {
  return items.map((item) => {
    const product = products.find((option) => option.id === item.productId);

    if (!product) {
      throw new Error("Produto do combo nao foi encontrado.");
    }

    return {
      productId: product.id,
      productSafeCost: product.safeCost,
      productSellingPrice: product.selling_price,
      quantity: item.quantity,
    };
  });
}

function getComboMetrics(combo: ComboRow, products: ComboProductOption[]) {
  try {
    const costItems = buildComboCostItems(
      combo.items.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
      })),
      products,
    );
    const baseCost = calculateComboBaseCost(costItems);

    return {
      baseCost,
      safeCost: calculateComboSafeCost(baseCost),
      individualTotal: calculateIndividualProductsTotalPrice(costItems),
    };
  } catch {
    return {
      baseCost: null,
      safeCost: null,
      individualTotal: null,
    };
  }
}

function getDraftItemCost(
  item: ComboDraftItem,
  product: ComboProductOption | undefined,
) {
  if (!product) {
    return null;
  }

  try {
    return calculateComboItemCost(
      product.safeCost,
      parseBrazilianNumber(item.quantity),
    );
  } catch {
    return null;
  }
}

function getSavedItemCost(
  item: ComboItemRow,
  product: ComboProductOption | undefined,
) {
  if (!product) {
    return null;
  }

  try {
    return calculateComboItemCost(product.safeCost, item.quantity);
  } catch {
    return null;
  }
}

function hasDraftDuplicate(items: ComboDraftItem[]) {
  return new Set(items.map((item) => item.productId)).size !== items.length;
}

function getDiscountLabel(discountAmount: number | null) {
  if (discountAmount == null) {
    return "Sem base";
  }

  if (discountAmount > 0) {
    return "Desconto";
  }

  if (discountAmount < 0) {
    return "Acrescimo";
  }

  return "Sem desconto";
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

function scrollToCombo(comboId: string) {
  document
    .getElementById(`combo-${comboId}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateFocusUrl(route: "combos", itemId: string) {
  const url = new URL(window.location.href);
  url.pathname = `/${route}`;
  url.searchParams.set("focus", itemId);
  window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
}
