"use client";

import { useEffect, useMemo } from "react";
import { Calculator } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import { formatCurrency, parseBrazilianNumber } from "@/lib/calculations/money";
import {
  decimalToPercentageInput,
  percentageInputToDecimal,
} from "@/lib/calculations/percentages";
import { type PricingSettings } from "@/lib/calculations/pricing";
import {
  getAppliesFreeDelivery,
  simulateScenario,
  type SimulationChannel,
  type SimulationItemType,
  type SimulationResult,
} from "@/lib/calculations/simulator";
import { simulatorSchema, type SimulatorInput } from "@/lib/validations/simulator";

export type SimulatorItemOption = {
  id: string;
  type: SimulationItemType;
  name: string;
  currentSellingPrice: number;
  safeCost: number | null;
};

export type SimulatorFixedCostRow = {
  amount: number;
  active: boolean;
};

type SimulatorPanelProps = {
  items: SimulatorItemOption[];
  fixedCosts: SimulatorFixedCostRow[];
  pricingSettings: PricingSettings;
};

export function SimulatorPanel({
  items,
  fixedCosts,
  pricingSettings,
}: SimulatorPanelProps) {
  const availableProducts = items.filter(
    (item) => item.type === "product" && item.safeCost != null,
  );
  const availableCombos = items.filter(
    (item) => item.type === "combo" && item.safeCost != null,
  );
  const defaultItem = availableProducts[0] ?? availableCombos[0];
  const form = useForm<SimulatorInput>({
    resolver: zodResolver(simulatorSchema),
    defaultValues: {
      itemType: defaultItem?.type ?? "product",
      itemId: defaultItem?.id ?? "",
      channel: "own",
      simulatedSellingPrice: defaultItem
        ? String(defaultItem.currentSellingPrice).replace(".", ",")
        : "0,00",
      simulatedDiscountPercentage: String(
        decimalToPercentageInput(pricingSettings.averageCouponPercentage),
      ).replace(".", ","),
      simulatedFreeDeliveryPercentage: String(
        decimalToPercentageInput(pricingSettings.freeDeliveryPercentage),
      ).replace(".", ","),
      simulatedMonthlyQuantity: "1",
      paidOnlineViaIfood: pricingSettings.ifoodPaidOnlineByDefault,
      forceIfoodFreeDelivery: false,
    },
  });
  const watchedValues = useWatch({ control: form.control });
  const selectedType = watchedValues.itemType ?? "product";
  const selectedChannel = watchedValues.channel ?? "own";
  const selectableItems =
    selectedType === "product" ? availableProducts : availableCombos;
  const selectedItem = items.find((item) => item.id === watchedValues.itemId);

  useEffect(() => {
    const currentItem = items.find((item) => item.id === form.getValues("itemId"));
    const currentType = form.getValues("itemType");

    if (currentItem?.type === currentType && currentItem.safeCost != null) {
      return;
    }

    const nextItem =
      currentType === "product" ? availableProducts[0] : availableCombos[0];
    form.setValue("itemId", nextItem?.id ?? "");
    form.setValue(
      "simulatedSellingPrice",
      nextItem ? String(nextItem.currentSellingPrice).replace(".", ",") : "0,00",
    );
  }, [availableCombos, availableProducts, form, items, selectedType]);

  useEffect(() => {
    if (!selectedItem || selectedItem.safeCost == null) {
      return;
    }

    form.setValue(
      "simulatedSellingPrice",
      String(selectedItem.currentSellingPrice).replace(".", ","),
    );
  }, [form, selectedItem]);

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

  const simulation = useMemo(() => {
    try {
      const parsed = parseSimulatorValues({
        ...form.getValues(),
        ...watchedValues,
      } as SimulatorInput);
      const item = items.find((option) => option.id === parsed.itemId);

      if (!item) {
        throw new Error("Selecione um item para simular.");
      }

      return {
        error: null,
        item,
        result: simulateScenario({
          itemType: item.type,
          safeCost: item.safeCost,
          currentSellingPrice: item.currentSellingPrice,
          simulatedSellingPrice: parsed.simulatedSellingPrice,
          channel: parsed.channel,
          simulatedDiscountPercentage: parsed.simulatedDiscountPercentage,
          simulatedFreeDeliveryPercentage: parsed.simulatedFreeDeliveryPercentage,
          simulatedMonthlyQuantity: parsed.simulatedMonthlyQuantity,
          paidOnlineViaIfood:
            parsed.channel === "ifood" ? parsed.paidOnlineViaIfood : false,
          forceIfoodFreeDelivery:
            parsed.channel === "ifood" ? parsed.forceIfoodFreeDelivery : false,
          fixedCostPercentage: fixedCostSummary.percentage,
          settings: pricingSettings,
        }),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Nao foi possivel simular.",
        item: selectedItem,
        result: null,
      };
    }
  }, [fixedCostSummary.percentage, form, items, pricingSettings, selectedItem, watchedValues]);

  const blockedProductsCount = items.filter(
    (item) => item.type === "product" && item.safeCost == null,
  ).length;
  const blockedCombosCount = items.filter(
    (item) => item.type === "combo" && item.safeCost == null,
  ).length;
  const iFoodFreeDeliveryApplies = getAppliesFreeDelivery({
    channel: selectedChannel as SimulationChannel,
    ifoodPlan: pricingSettings.ifoodPlan,
    forceIfoodFreeDelivery: Boolean(watchedValues.forceIfoodFreeDelivery),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <form className="rounded-lg border bg-background p-4">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="size-5" />
          <h2 className="text-lg font-semibold">Cenario simulado</h2>
        </div>

        {(blockedProductsCount > 0 || blockedCombosCount > 0) ? (
          <Alert className="mb-4">
            <AlertDescription>
              Itens sem custo calculavel ficam bloqueados para evitar custo zero falso.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              id="itemType"
              label="Tipo"
              value={selectedType}
              onChange={(value) => form.setValue("itemType", value as SimulationItemType)}
              options={[
                { value: "product", label: "Produto" },
                { value: "combo", label: "Combo" },
              ]}
            />
            <SelectField
              id="channel"
              label="Canal"
              value={selectedChannel}
              onChange={(value) => form.setValue("channel", value as SimulationChannel)}
              options={[
                { value: "own", label: "Canal proprio" },
                { value: "ifood", label: "iFood" },
              ]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemId">Item</Label>
            <select
              id="itemId"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={watchedValues.itemId ?? ""}
              onChange={(event) => form.setValue("itemId", event.target.value)}
            >
              {selectableItems.length === 0 ? (
                <option value="">Nenhum item com custo calculavel</option>
              ) : (
                selectableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))
              )}
            </select>
            {form.formState.errors.itemId?.message ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.itemId.message}
              </p>
            ) : null}
          </div>

          <TextField
            id="simulatedSellingPrice"
            label="Preco simulado"
            register={form.register("simulatedSellingPrice")}
            error={form.formState.errors.simulatedSellingPrice?.message}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              id="simulatedDiscountPercentage"
              label="Desconto/cupom (%)"
              register={form.register("simulatedDiscountPercentage")}
              error={form.formState.errors.simulatedDiscountPercentage?.message}
            />
            <TextField
              id="simulatedFreeDeliveryPercentage"
              label="Entrega gratis (%)"
              register={form.register("simulatedFreeDeliveryPercentage")}
              error={form.formState.errors.simulatedFreeDeliveryPercentage?.message}
            />
          </div>

          <TextField
            id="simulatedMonthlyQuantity"
            label="Quantidade mensal estimada"
            register={form.register("simulatedMonthlyQuantity")}
            error={form.formState.errors.simulatedMonthlyQuantity?.message}
          />

          {selectedChannel === "ifood" ? (
            <div className="space-y-3 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("paidOnlineViaIfood")} />
                Pagamento online iFood
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register("forceIfoodFreeDelivery")} />
                Aplicar entrega gratis no iFood manualmente
              </label>
              {pricingSettings.ifoodPlan === "delivery" && !iFoodFreeDeliveryApplies ? (
                <p className="text-xs text-muted-foreground">
                  Plano Entrega nao aplica entrega gratis por padrao para evitar dupla contagem.
                </p>
              ) : null}
              {pricingSettings.ifoodPlan === "delivery" && iFoodFreeDeliveryApplies ? (
                <p className="text-xs text-muted-foreground">
                  Entrega gratis aplicada por override manual nesta simulacao.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </form>

      <SimulationResults
        item={simulation.item}
        result={simulation.result}
        error={simulation.error}
        fixedCostTotal={fixedCostSummary.total}
        fixedCostPercentage={fixedCostSummary.percentage}
        desiredProfitMargin={pricingSettings.desiredProfitMargin}
      />
    </div>
  );
}

function SimulationResults({
  item,
  result,
  error,
  fixedCostTotal,
  fixedCostPercentage,
  desiredProfitMargin,
}: {
  item: SimulatorItemOption | undefined;
  result: SimulationResult | null;
  error: string | null;
  fixedCostTotal: number;
  fixedCostPercentage: number | null;
  desiredProfitMargin: number;
}) {
  if (error || !result || !item) {
    return (
      <div className="rounded-lg border bg-background p-4">
        <h2 className="text-lg font-semibold">Resultado</h2>
        <Alert className="mt-4">
          <AlertDescription>{error ?? "Selecione um item para simular."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const margin = result.margin;
  const hasNetMargin =
    margin.status === "ready" && margin.netMarginStatus === "ready";
  const estimatedNetProfit =
    margin.status === "ready" ? margin.estimatedNetProfit : null;
  const estimatedNetMargin =
    margin.status === "ready" ? margin.estimatedNetMargin : null;
  const hasLoss =
    margin.status === "ready" &&
    ((estimatedNetProfit != null && estimatedNetProfit <= 0) ||
      margin.contributionProfit <= 0);
  const belowDesiredMargin =
    estimatedNetMargin != null && estimatedNetMargin < desiredProfitMargin;

  return (
    <div className="space-y-4">
      {fixedCostPercentage == null ? (
        <Alert>
          <AlertDescription>
            Dados financeiros incompletos: informe faturamento medio para calcular margem liquida estimada.
          </AlertDescription>
        </Alert>
      ) : null}

      {hasLoss ? (
        <Alert variant="destructive">
          <AlertDescription>Este cenario pode gerar prejuizo por unidade.</AlertDescription>
        </Alert>
      ) : null}

      {belowDesiredMargin ? (
        <Alert>
          <AlertDescription>
            A margem liquida estimada esta abaixo da margem desejada.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Custo seguro" value={formatCurrency(item.safeCost ?? 0)} />
        <Metric label="Preco atual" value={formatCurrency(item.currentSellingPrice)} />
        <Metric
          label="Diferenca atual"
          value={formatCurrency(result.priceDifferenceFromCurrent)}
        />
      </div>

      {margin.status === "neutral" ? (
        <Alert>
          <AlertDescription>{margin.reason}</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Metric
              label="Lucro por unidade"
              value={formatCurrency(margin.contributionProfit)}
            />
            <Metric
              label="Margem contribuicao"
              value={`${(margin.contributionMargin * 100).toFixed(2)}%`}
            />
            <Metric
              label="Custo fixo alocado"
              value={
                margin.allocatedFixedCostAmount == null
                  ? "Incompleto"
                  : formatCurrency(margin.allocatedFixedCostAmount)
              }
            />
            <Metric
              label="Lucro liquido est."
              value={
                hasNetMargin && margin.estimatedNetProfit != null
                  ? formatCurrency(margin.estimatedNetProfit)
                  : "Incompleto"
              }
            />
            <Metric
              label="Margem liquida est."
              value={
                hasNetMargin && margin.estimatedNetMargin != null
                  ? `${(margin.estimatedNetMargin * 100).toFixed(2)}%`
                  : "Incompleto"
              }
            />
            <Metric
              label="Lucro mensal contrib."
              value={
                result.monthlyContributionProfit == null
                  ? "-"
                  : formatCurrency(result.monthlyContributionProfit)
              }
            />
            <Metric
              label="Lucro mensal liquido"
              value={
                result.monthlyEstimatedNetProfit == null
                  ? "Incompleto"
                  : formatCurrency(result.monthlyEstimatedNetProfit)
              }
            />
            <Metric
              label="Preco sugerido"
              value={
                result.suggestedPrice.status === "ready"
                  ? formatCurrency(result.suggestedPrice.price)
                  : "-"
              }
            />
            <Metric
              label="Dif. preco sugerido"
              value={
                result.priceDifferenceFromSuggested == null
                  ? "-"
                  : formatCurrency(result.priceDifferenceFromSuggested)
              }
            />
          </div>

          <div className="rounded-lg border bg-background p-4">
            <h3 className="font-medium">Detalhes do cenario</h3>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <Line label="Desconto" value={formatCurrency(margin.discountAmount)} />
              <Line label="Taxa cartao" value={formatCurrency(margin.cardFeeAmount)} />
              <Line label="Entrega gratis" value={formatCurrency(margin.freeDeliveryAmount)} />
              <Line label="Taxas marketplace" value={formatCurrency(margin.marketplaceFeeAmount)} />
              <Line label="Custos fixos totais" value={formatCurrency(fixedCostTotal)} />
              <Line
                label="Percentual custo fixo"
                value={
                  fixedCostPercentage == null
                    ? "Incompleto"
                    : `${(fixedCostPercentage * 100).toFixed(2)}%`
                }
              />
            </div>
            {result.suggestedPrice.status === "neutral" ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {result.suggestedPrice.reason}
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function parseSimulatorValues(values: SimulatorInput) {
  return {
    itemType: values.itemType,
    itemId: values.itemId,
    channel: values.channel,
    simulatedSellingPrice: parseBrazilianNumber(values.simulatedSellingPrice),
    simulatedDiscountPercentage: percentageInputToDecimal(
      parseBrazilianNumber(values.simulatedDiscountPercentage),
    ),
    simulatedFreeDeliveryPercentage: percentageInputToDecimal(
      parseBrazilianNumber(values.simulatedFreeDeliveryPercentage),
    ),
    simulatedMonthlyQuantity: parseBrazilianNumber(values.simulatedMonthlyQuantity),
    paidOnlineViaIfood: values.paidOnlineViaIfood,
    forceIfoodFreeDelivery: values.forceIfoodFreeDelivery,
  };
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  id,
  label,
  register,
  error,
}: {
  id: string;
  label: string;
  register: object;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...register} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
