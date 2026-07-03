import { redirect } from "next/navigation";

import { FinancialSettingsForm } from "@/components/forms/financial-settings-form";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function FinancialSettingsPage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, name, business_logo_url, average_monthly_revenue, target_monthly_revenue, desired_profit_margin, card_fee_percentage, average_coupon_percentage, free_delivery_percentage, ifood_plan, ifood_commission_percentage, ifood_payment_fee_percentage, ifood_receivables_advance_percentage, ifood_monthly_fee, ifood_paid_online_by_default",
    )
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Configuracao Financeira</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Ajuste margens, taxas e canais
        </h1>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Dados financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialSettingsForm business={business} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
