import { redirect } from "next/navigation";

import { IngredientsManager, type IngredientRow } from "@/components/forms/ingredients-manager";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function IngredientsPage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, business_logo_url")
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const { data: ingredients } = await supabase
    .from("ingredients")
    .select(
      "id, name, category, supplier, purchase_price, purchase_quantity, purchase_unit, usage_unit, correction_factor, unit_cost, last_price_update, active",
    )
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Ingredientes</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Cadastre insumos e custos unitarios
        </h1>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Lista de ingredientes</CardTitle>
        </CardHeader>
        <CardContent>
          <IngredientsManager initialIngredients={(ingredients ?? []) as IngredientRow[]} />
        </CardContent>
      </Card>
    </AppShell>
  );
}
