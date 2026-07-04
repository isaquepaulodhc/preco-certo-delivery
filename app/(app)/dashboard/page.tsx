import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CircleDollarSign, Store } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import { formatCurrency } from "@/lib/calculations/money";
import { getEffectiveSubscriptionStatus } from "@/lib/auth/subscriptions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, segment, city, business_logo_url, average_monthly_revenue, target_monthly_revenue, desired_profit_margin, ifood_monthly_fee")
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
  const { data: fixedCosts } = await supabase
    .from("fixed_costs")
    .select("amount, active")
    .eq("business_id", business.id);

  const effectiveStatus = getEffectiveSubscriptionStatus(subscription);
  const fixedCostsTotal = calculateFixedCostsTotal(
    fixedCosts ?? [],
    business.ifood_monthly_fee,
  );
  const fixedCostPercentage = calculateFixedCostPercentage(
    fixedCostsTotal,
    business.average_monthly_revenue,
  );

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
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
            <Link href="/store-profile">
              <Button variant="outline" className="mt-3">
                Editar perfil
              </Button>
            </Link>
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
            <p>Faturamento medio: {formatCurrency(business.average_monthly_revenue)}</p>
            <p>Margem desejada: {(business.desired_profit_margin * 100).toFixed(2)}%</p>
            <Link href="/financial-settings">
              <Button variant="outline" className="mt-3">
                Ajustar taxas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Custos fixos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Total ativo: {formatCurrency(fixedCostsTotal)}</p>
            <p>
              Percentual do faturamento:{" "}
              {fixedCostPercentage == null
                ? "informe faturamento medio"
                : `${(fixedCostPercentage * 100).toFixed(2)}%`}
            </p>
            <Link href="/fixed-costs">
              <Button variant="outline" className="mt-3">
                Gerenciar custos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Proximos passos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <p>Revise perfil, logo e WhatsApp da loja.</p>
            <p>Configure faturamento, margem e taxas iFood.</p>
            <p>Monte fichas tecnicas, combos e simule cenarios de preco.</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
