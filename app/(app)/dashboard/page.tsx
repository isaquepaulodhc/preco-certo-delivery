import { redirect } from "next/navigation";
import { CheckCircle2, CircleDollarSign, Store } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEffectiveSubscriptionStatus } from "@/lib/auth/subscriptions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, segment, city, average_monthly_revenue, target_monthly_revenue, desired_profit_margin")
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, paid_until")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const effectiveStatus = getEffectiveSubscriptionStatus(subscription);

  return (
    <AppShell businessName={business.name}>
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Dashboard inicial</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Bem-vindo, {business.name}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardHeader>
            <Store className="size-5" />
            <CardTitle>Perfil do negocio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{business.segment || "Segmento nao informado"}</p>
            <p>{business.city || "Cidade nao informada"}</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CheckCircle2 className="size-5" />
            <CardTitle>Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Status efetivo: {effectiveStatus}</p>
            <p>Pago ate: {subscription?.paid_until || "nao informado"}</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CircleDollarSign className="size-5" />
            <CardTitle>Financeiro inicial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>Faturamento medio: R$ {business.average_monthly_revenue}</p>
            <p>Margem desejada: {business.desired_profit_margin * 100}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-lg">
        <CardHeader>
          <CardTitle>Proximos passos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p>Complete o perfil da loja na Fase 2.</p>
          <p>Cadastre ingredientes na Fase 3.</p>
          <p>Monte produtos e fichas tecnicas na Fase 4.</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
