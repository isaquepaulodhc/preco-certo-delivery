import { redirect } from "next/navigation";

import { FixedCostsManager } from "@/components/forms/fixed-costs-manager";
import { AppShell } from "@/components/layout/app-shell";
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
      <div className="mb-6 max-w-3xl">
        <p className="text-sm font-semibold text-[#F97316]">Custos fixos</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F172A]">
          Controle os custos da operação
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#64748B]">
          Acompanhe despesas recorrentes e o peso delas no faturamento médio.
        </p>
      </div>

      <FixedCostsManager
        businessId={business.id}
        averageMonthlyRevenue={business.average_monthly_revenue}
        ifoodMonthlyFee={business.ifood_monthly_fee}
        initialFixedCosts={fixedCosts ?? []}
      />
    </AppShell>
  );
}
