"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  decimalToPercentageInput,
  percentageInputToDecimal,
} from "@/lib/calculations/percentages";
import { getIfoodPlanDefaults, type IfoodPlan } from "@/lib/calculations/ifood";
import { createClient } from "@/lib/supabase/client";
import {
  financialSettingsSchema,
  type FinancialSettingsInput,
} from "@/lib/validations/financial-settings";

type FinancialSettingsFormProps = {
  business: {
    id: string;
    average_monthly_revenue: number;
    target_monthly_revenue: number;
    desired_profit_margin: number;
    card_fee_percentage: number;
    average_coupon_percentage: number;
    free_delivery_percentage: number;
    ifood_plan: IfoodPlan;
    ifood_commission_percentage: number;
    ifood_payment_fee_percentage: number;
    ifood_receivables_advance_percentage: number;
    ifood_monthly_fee: number;
    ifood_paid_online_by_default: boolean;
  };
};

export function FinancialSettingsForm({ business }: FinancialSettingsFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FinancialSettingsInput>({
    resolver: zodResolver(financialSettingsSchema),
    defaultValues: {
      averageMonthlyRevenue: business.average_monthly_revenue,
      targetMonthlyRevenue: business.target_monthly_revenue,
      desiredProfitMargin: decimalToPercentageInput(business.desired_profit_margin),
      cardFeePercentage: decimalToPercentageInput(business.card_fee_percentage),
      averageCouponPercentage: decimalToPercentageInput(business.average_coupon_percentage),
      freeDeliveryPercentage: decimalToPercentageInput(business.free_delivery_percentage),
      ifoodPlan: business.ifood_plan,
      ifoodCommissionPercentage: decimalToPercentageInput(
        business.ifood_commission_percentage,
      ),
      ifoodPaymentFeePercentage: decimalToPercentageInput(
        business.ifood_payment_fee_percentage,
      ),
      ifoodReceivablesAdvancePercentage: decimalToPercentageInput(
        business.ifood_receivables_advance_percentage,
      ),
      ifoodMonthlyFee: business.ifood_monthly_fee,
      ifoodPaidOnlineByDefault: business.ifood_paid_online_by_default,
    },
  });
  const selectedPlan = useWatch({ control: form.control, name: "ifoodPlan" });
  const isCustomPlan = selectedPlan === "custom";

  useEffect(() => {
    if (selectedPlan === "custom") {
      return;
    }

    const defaults = getIfoodPlanDefaults(selectedPlan);
    form.setValue(
      "ifoodCommissionPercentage",
      decimalToPercentageInput(defaults.ifood_commission_percentage),
      { shouldDirty: true, shouldValidate: true },
    );
    form.setValue(
      "ifoodPaymentFeePercentage",
      decimalToPercentageInput(defaults.ifood_payment_fee_percentage),
      { shouldDirty: true, shouldValidate: true },
    );
  }, [form, selectedPlan]);

  async function onSubmit(values: FinancialSettingsInput) {
    setMessage(null);
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        average_monthly_revenue: values.averageMonthlyRevenue,
        target_monthly_revenue: values.targetMonthlyRevenue,
        desired_profit_margin: percentageInputToDecimal(values.desiredProfitMargin),
        card_fee_percentage: percentageInputToDecimal(values.cardFeePercentage),
        average_coupon_percentage: percentageInputToDecimal(
          values.averageCouponPercentage,
        ),
        free_delivery_percentage: percentageInputToDecimal(
          values.freeDeliveryPercentage,
        ),
        ifood_plan: values.ifoodPlan,
        ifood_commission_percentage: percentageInputToDecimal(
          values.ifoodCommissionPercentage,
        ),
        ifood_payment_fee_percentage: percentageInputToDecimal(
          values.ifoodPaymentFeePercentage,
        ),
        ifood_receivables_advance_percentage: percentageInputToDecimal(
          values.ifoodReceivablesAdvancePercentage,
        ),
        ifood_monthly_fee: values.ifoodMonthlyFee,
        ifood_paid_online_by_default: values.ifoodPaidOnlineByDefault,
      })
      .eq("id", business.id);

    setIsSubmitting(false);

    if (updateError) {
      setError("Nao foi possivel salvar a configuracao financeira.");
      return;
    }

    setMessage("Configuracao financeira salva.");
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Faturamento medio mensal"
          id="averageMonthlyRevenue"
          register={form.register("averageMonthlyRevenue", { valueAsNumber: true })}
          error={form.formState.errors.averageMonthlyRevenue?.message}
          step="0.01"
        />
        <NumberField
          label="Meta de faturamento"
          id="targetMonthlyRevenue"
          register={form.register("targetMonthlyRevenue", { valueAsNumber: true })}
          error={form.formState.errors.targetMonthlyRevenue?.message}
          step="0.01"
        />
        <NumberField
          label="Margem desejada (%)"
          id="desiredProfitMargin"
          register={form.register("desiredProfitMargin", { valueAsNumber: true })}
          error={form.formState.errors.desiredProfitMargin?.message}
          step="0.01"
        />
        <NumberField
          label="Taxa de cartao (%)"
          id="cardFeePercentage"
          register={form.register("cardFeePercentage", { valueAsNumber: true })}
          error={form.formState.errors.cardFeePercentage?.message}
          step="0.01"
        />
        <NumberField
          label="Cupom medio (%)"
          id="averageCouponPercentage"
          register={form.register("averageCouponPercentage", { valueAsNumber: true })}
          error={form.formState.errors.averageCouponPercentage?.message}
          step="0.01"
        />
        <NumberField
          label="Entrega gratis media (%)"
          id="freeDeliveryPercentage"
          register={form.register("freeDeliveryPercentage", { valueAsNumber: true })}
          error={form.formState.errors.freeDeliveryPercentage?.message}
          step="0.01"
        />
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Taxas do iFood</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ifoodPlan">Plano iFood</Label>
            <select
              id="ifoodPlan"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              {...form.register("ifoodPlan")}
            >
              <option value="basic">Basico</option>
              <option value="delivery">Entrega</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <input
              id="ifoodPaidOnlineByDefault"
              type="checkbox"
              className="mb-2 size-4"
              {...form.register("ifoodPaidOnlineByDefault")}
            />
            <Label htmlFor="ifoodPaidOnlineByDefault" className="pb-1">
              Pagamento online por padrao
            </Label>
          </div>

          <NumberField
            label="Comissao iFood (%)"
            id="ifoodCommissionPercentage"
            register={form.register("ifoodCommissionPercentage", { valueAsNumber: true })}
            error={form.formState.errors.ifoodCommissionPercentage?.message}
            step="0.01"
            disabled={!isCustomPlan}
          />
          <NumberField
            label="Pagamento online iFood (%)"
            id="ifoodPaymentFeePercentage"
            register={form.register("ifoodPaymentFeePercentage", { valueAsNumber: true })}
            error={form.formState.errors.ifoodPaymentFeePercentage?.message}
            step="0.01"
            disabled={!isCustomPlan}
          />
          <NumberField
            label="Antecipacao de recebiveis (%)"
            id="ifoodReceivablesAdvancePercentage"
            register={form.register("ifoodReceivablesAdvancePercentage", {
              valueAsNumber: true,
            })}
            error={form.formState.errors.ifoodReceivablesAdvancePercentage?.message}
            step="0.01"
          />
          <NumberField
            label="Mensalidade iFood"
            id="ifoodMonthlyFee"
            register={form.register("ifoodMonthlyFee", { valueAsNumber: true })}
            error={form.formState.errors.ifoodMonthlyFee?.message}
            step="0.01"
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : "Salvar configuracao"}
      </Button>
    </form>
  );
}

type NumberFieldProps = {
  id: string;
  label: string;
  register: object;
  error?: string;
  step?: string;
  disabled?: boolean;
};

function NumberField({ id, label, register, error, step = "1", disabled }: NumberFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        step={step}
        disabled={disabled}
        {...register}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
