import { redirect } from "next/navigation";

import {
  CombosManager,
  type ComboItemRow,
  type ComboProductOption,
  type ComboRow,
  type FixedCostSummaryRow,
} from "@/components/forms/combos-manager";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateProductBaseCost, calculateProductSafeCost } from "@/lib/calculations/products";
import { type PricingSettings } from "@/lib/calculations/pricing";
import { type Unit } from "@/lib/calculations/units";
import { createClient } from "@/lib/supabase/server";

type ComboRecord = Omit<ComboRow, "items">;
type CombosPageSearchParams = {
  focus?: string;
};

type ProductRecord = {
  id: string;
  name: string;
  selling_price: number;
  active: boolean;
};

type ProductIngredientRecord = {
  product_id: string;
  ingredient_id: string;
  quantity: number;
  unit: Unit;
};

type IngredientRecord = {
  id: string;
  usage_unit: Unit;
  unit_cost: number;
};

export default async function CombosPage({
  searchParams,
}: {
  searchParams?: Promise<CombosPageSearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, business_logo_url, average_monthly_revenue, desired_profit_margin, ifood_plan, ifood_commission_percentage, ifood_payment_fee_percentage, ifood_receivables_advance_percentage, ifood_monthly_fee, ifood_paid_online_by_default, card_fee_percentage, average_coupon_percentage, free_delivery_percentage")
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const [
    { data: combos },
    { data: comboItems },
    { data: products },
    { data: productIngredients },
    { data: ingredients },
    { data: fixedCosts },
  ] = await Promise.all([
    supabase
      .from("combos")
      .select("id, name, category, description, selling_price, active")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("combo_items")
      .select("id, combo_id, product_id, quantity")
      .eq("business_id", business.id),
    supabase
      .from("products")
      .select("id, name, selling_price, active")
      .eq("business_id", business.id)
      .order("name", { ascending: true }),
    supabase
      .from("product_ingredients")
      .select("product_id, ingredient_id, quantity, unit")
      .eq("business_id", business.id),
    supabase
      .from("ingredients")
      .select("id, usage_unit, unit_cost")
      .eq("business_id", business.id),
    supabase
      .from("fixed_costs")
      .select("amount, active")
      .eq("business_id", business.id),
  ]);

  const ingredientRows = (ingredients ?? []) as IngredientRecord[];
  const productIngredientRows = (productIngredients ?? []) as ProductIngredientRecord[];
  const productOptions = ((products ?? []) as ProductRecord[]).map((product) => {
    const technicalSheet = productIngredientRows.filter(
      (item) => item.product_id === product.id,
    );
    let safeCost: number | null = null;

    try {
      const productItems = technicalSheet.map((item) => {
        const ingredient = ingredientRows.find((row) => row.id === item.ingredient_id);

        if (!ingredient) {
          throw new Error("Ingrediente da ficha tecnica nao encontrado.");
        }

        return {
          ingredientId: item.ingredient_id,
          quantity: item.quantity,
          unit: item.unit,
          ingredientUsageUnit: ingredient.usage_unit,
          ingredientUnitCost: ingredient.unit_cost,
        };
      });
      safeCost = calculateProductSafeCost(calculateProductBaseCost(productItems));
    } catch {
      safeCost = null;
    }

    return {
      ...product,
      safeCost,
    };
  });

  const itemRows = (comboItems ?? []) as ComboItemRow[];
  const comboRows = ((combos ?? []) as ComboRecord[]).map((combo) => ({
    ...combo,
    items: itemRows.filter((item) => item.combo_id === combo.id),
  }));

  const pricingSettings: PricingSettings = {
    averageMonthlyRevenue: business.average_monthly_revenue,
    desiredProfitMargin: business.desired_profit_margin,
    cardFeePercentage: business.card_fee_percentage,
    averageCouponPercentage: business.average_coupon_percentage,
    freeDeliveryPercentage: business.free_delivery_percentage,
    ifoodPlan: business.ifood_plan,
    ifoodCommissionPercentage: business.ifood_commission_percentage,
    ifoodPaymentFeePercentage: business.ifood_payment_fee_percentage,
    ifoodReceivablesAdvancePercentage:
      business.ifood_receivables_advance_percentage,
    ifoodMonthlyFee: business.ifood_monthly_fee,
    ifoodPaidOnlineByDefault: business.ifood_paid_online_by_default,
  };

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Combos</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Monte combos e compare margem por canal
        </h1>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Combos e produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <CombosManager
            businessId={business.id}
            initialCombos={comboRows}
            products={productOptions as ComboProductOption[]}
            fixedCosts={(fixedCosts ?? []) as FixedCostSummaryRow[]}
            pricingSettings={pricingSettings}
            focusId={params?.focus}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
