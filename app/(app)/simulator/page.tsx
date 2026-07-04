import { redirect } from "next/navigation";

import {
  SimulatorPanel,
  type SimulatorFixedCostRow,
  type SimulatorItemOption,
} from "@/components/forms/simulator-panel";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateComboBaseCost,
  calculateComboSafeCost,
  type ComboProductCostItem,
} from "@/lib/calculations/combos";
import { calculateProductBaseCost, calculateProductSafeCost } from "@/lib/calculations/products";
import { type PricingSettings } from "@/lib/calculations/pricing";
import { type Unit } from "@/lib/calculations/units";
import { createClient } from "@/lib/supabase/server";

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

type ComboRecord = {
  id: string;
  name: string;
  selling_price: number;
  active: boolean;
};

type ComboItemRecord = {
  combo_id: string;
  product_id: string;
  quantity: number;
};

export default async function SimulatorPage() {
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
    { data: combos },
    { data: comboItems },
    { data: fixedCosts },
  ] = await Promise.all([
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
      .from("combos")
      .select("id, name, selling_price, active")
      .eq("business_id", business.id)
      .order("name", { ascending: true }),
    supabase
      .from("combo_items")
      .select("combo_id, product_id, quantity")
      .eq("business_id", business.id),
    supabase
      .from("fixed_costs")
      .select("amount, active")
      .eq("business_id", business.id),
  ]);

  const ingredientRows = (ingredients ?? []) as IngredientRecord[];
  const productIngredientRows = (productIngredients ?? []) as ProductIngredientRecord[];
  const productOptions = ((products ?? []) as ProductRecord[]).map((product) => ({
    ...product,
    safeCost: calculateProductSafeCostFromRows(
      product.id,
      productIngredientRows,
      ingredientRows,
    ),
  }));
  const comboRows = (combos ?? []) as ComboRecord[];
  const comboItemRows = (comboItems ?? []) as ComboItemRecord[];
  const simulatorItems: SimulatorItemOption[] = [
    ...productOptions
      .filter((product) => product.active)
      .map((product) => ({
        id: product.id,
        type: "product" as const,
        name: product.name,
        currentSellingPrice: product.selling_price,
        safeCost: product.safeCost,
      })),
    ...comboRows
      .filter((combo) => combo.active)
      .map((combo) => ({
        id: combo.id,
        type: "combo" as const,
        name: combo.name,
        currentSellingPrice: combo.selling_price,
        safeCost: calculateComboSafeCostFromRows(
          combo.id,
          comboItemRows,
          productOptions,
        ),
      })),
  ];

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
        <p className="text-sm text-muted-foreground">Simulador</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Simule preco, canal e volume mensal
        </h1>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Simulacao de margem</CardTitle>
        </CardHeader>
        <CardContent>
          <SimulatorPanel
            items={simulatorItems}
            fixedCosts={(fixedCosts ?? []) as SimulatorFixedCostRow[]}
            pricingSettings={pricingSettings}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}

function calculateProductSafeCostFromRows(
  productId: string,
  productIngredients: ProductIngredientRecord[],
  ingredients: IngredientRecord[],
) {
  const sheet = productIngredients.filter((item) => item.product_id === productId);

  try {
    const items = sheet.map((item) => {
      const ingredient = ingredients.find((row) => row.id === item.ingredient_id);

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

    return calculateProductSafeCost(calculateProductBaseCost(items));
  } catch {
    return null;
  }
}

function calculateComboSafeCostFromRows(
  comboId: string,
  comboItems: ComboItemRecord[],
  products: Array<ProductRecord & { safeCost: number | null }>,
) {
  const items = comboItems.filter((item) => item.combo_id === comboId);

  try {
    const costItems: ComboProductCostItem[] = items.map((item) => {
      const product = products.find((row) => row.id === item.product_id);

      if (!product) {
        throw new Error("Produto do combo nao encontrado.");
      }

      return {
        productId: item.product_id,
        productSafeCost: product.safeCost,
        productSellingPrice: product.selling_price,
        quantity: item.quantity,
      };
    });

    return calculateComboSafeCost(calculateComboBaseCost(costItems));
  } catch {
    return null;
  }
}
