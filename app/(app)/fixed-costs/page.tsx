import { redirect } from "next/navigation";

import { FixedCostsManager } from "@/components/forms/fixed-costs-manager";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function FixedCostsPage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, name, business_logo_url, average_monthly_revenue, ifood_monthly_fee",
    )
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const { data: fixedCosts } = await supabase
    .from("fixed_costs")
    .select("id, name, category, amount, active")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Custos Fixos</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Controle os custos da operacao
        </h1>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Custos mensais</CardTitle>
        </CardHeader>
        <CardContent>
          <FixedCostsManager
            businessId={business.id}
            averageMonthlyRevenue={business.average_monthly_revenue}
            ifoodMonthlyFee={business.ifood_monthly_fee}
            initialFixedCosts={fixedCosts ?? []}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
