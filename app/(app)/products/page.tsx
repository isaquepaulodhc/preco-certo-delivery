import { redirect } from "next/navigation";

import {
  ProductsManager,
  type FixedCostSummaryRow,
  type IngredientOption,
  type ProductIngredientRow,
  type ProductRow,
} from "@/components/forms/products-manager";
import { AppShell } from "@/components/layout/app-shell";
import { type PricingSettings } from "@/lib/calculations/pricing";
import { createClient } from "@/lib/supabase/server";

type ProductRecord = Omit<ProductRow, "technicalSheet">;
type ProductsPageSearchParams = {
  focus?: string;
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<ProductsPageSearchParams>;
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
    { data: products },
    { data: productIngredients },
    { data: ingredients },
    { data: fixedCosts },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category, description, image_url, selling_price, active")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("product_ingredients")
      .select("id, product_id, ingredient_id, quantity, unit")
      .eq("business_id", business.id)
      .is("deleted_at", null),
    supabase
      .from("ingredients")
      .select("id, name, usage_unit, unit_cost, active")
      .eq("business_id", business.id)
      .order("name", { ascending: true }),
    supabase
      .from("fixed_costs")
      .select("amount, active")
      .eq("business_id", business.id),
  ]);

  const sheetRows = (productIngredients ?? []) as ProductIngredientRow[];
  const productRows = ((products ?? []) as ProductRecord[]).map((product) => ({
    ...product,
    technicalSheet: sheetRows.filter((item) => item.product_id === product.id),
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
      <div className="mb-6 max-w-3xl">
        <p className="text-sm font-semibold text-[#F97316]">Produtos</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F172A]">
          Monte fichas tecnicas e precos sugeridos
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#64748B]">
          Cadastre produtos, revise fichas e navegue rapidamente entre os itens.
        </p>
      </div>

      <ProductsManager
        businessId={business.id}
        initialProducts={productRows}
        ingredients={(ingredients ?? []) as IngredientOption[]}
        fixedCosts={(fixedCosts ?? []) as FixedCostSummaryRow[]}
        pricingSettings={pricingSettings}
        focusId={params?.focus}
        businessName={business.name}
        businessLogoUrl={business.business_logo_url}
      />
    </AppShell>
  );
}
