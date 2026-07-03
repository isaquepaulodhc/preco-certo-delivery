"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/lib/validations/onboarding";

export function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      segment: "",
      city: "",
      whatsapp: "",
      averageMonthlyRevenue: 0,
      targetMonthlyRevenue: 0,
      desiredProfitMargin: 0.2,
    },
  });

  async function onSubmit(values: OnboardingInput) {
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("create_business_with_trial", {
      p_name: values.name,
      p_segment: values.segment || null,
      p_city: values.city || null,
      p_whatsapp: values.whatsapp || null,
      p_average_monthly_revenue: values.averageMonthlyRevenue,
      p_target_monthly_revenue: values.targetMonthlyRevenue,
      p_desired_profit_margin: values.desiredProfitMargin,
    });

    setIsSubmitting(false);

    if (rpcError) {
      setError(rpcError.message || "Nao foi possivel concluir o onboarding.");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nome do delivery</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name ? (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="segment">Segmento</Label>
          <Input id="segment" placeholder="Hamburgueria, marmitaria..." {...form.register("segment")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" {...form.register("city")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" {...form.register("whatsapp")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="averageMonthlyRevenue">Faturamento medio mensal</Label>
          <Input
            id="averageMonthlyRevenue"
            type="number"
            min="0"
            step="0.01"
            {...form.register("averageMonthlyRevenue", { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetMonthlyRevenue">Meta de faturamento</Label>
          <Input
            id="targetMonthlyRevenue"
            type="number"
            min="0"
            step="0.01"
            {...form.register("targetMonthlyRevenue", { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desiredProfitMargin">Margem desejada</Label>
          <Input
            id="desiredProfitMargin"
            type="number"
            min="0.01"
            max="0.9"
            step="0.01"
            {...form.register("desiredProfitMargin", { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">Use 0.2 para 20%.</p>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Criando negocio..." : "Concluir onboarding"}
      </Button>
    </form>
  );
}
