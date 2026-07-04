import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, CircleDollarSign, Store } from "lucide-react";

import { OperationHealthDashboard } from "@/components/dashboard/operation-health-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  calculateComboBaseCost,
  calculateComboSafeCost,
  type ComboProductCostItem,
} from "@/lib/calculations/combos";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
  isFixedCostPercentageHigh,
} from "@/lib/calculations/fixed-costs";
import { formatCurrency } from "@/lib/calculations/money";
import { evaluateOperationHealth, type OperationHealthItemInput } from "@/lib/calculations/operation-health";
import { calculateProductBaseCost, calculateProductSafeCost } from "@/lib/calculations/products";
import { type PricingSettings } from "@/lib/calculations/pricing";
import { type Unit } from "@/lib/calculations/units";
import { getEffectiveSubscriptionStatus } from "@/lib/auth/subscriptions";
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
  active: boolean;
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, segment, city, business_logo_url, average_monthly_revenue, target_monthly_revenue, desired_profit_margin, ifood_plan, ifood_commission_percentage, ifood_payment_fee_percentage, ifood_receivables_advance_percentage, ifood_monthly_fee, ifood_paid_online_by_default, card_fee_percentage, average_coupon_percentage, free_delivery_percentage")
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  const [
    { data: subscription },
    { data: fixedCosts },
    { data: ingredients },
    { data: products },
    { data: productIngredients },
    { data: combos },
    { data: comboItems },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, paid_until")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("fixed_costs")
      .select("amount, active")
      .eq("business_id", business.id),
    supabase
      .from("ingredients")
      .select("id, usage_unit, unit_cost, active")
      .eq("business_id", business.id),
    supabase
      .from("products")
      .select("id, name, selling_price, active")
      .eq("business_id", business.id),
    supabase
      .from("product_ingredients")
      .select("product_id, ingredient_id, quantity, unit")
      .eq("business_id", business.id),
    supabase
      .from("combos")
      .select("id, name, selling_price, active")
      .eq("business_id", business.id),
    supabase
      .from("combo_items")
      .select("combo_id, product_id, quantity")
      .eq("business_id", business.id),
  ]);

  const effectiveStatus = getEffectiveSubscriptionStatus(subscription);
  const fixedCostsTotal = calculateFixedCostsTotal(
    fixedCosts ?? [],
    business.ifood_monthly_fee,
  );
  const fixedCostPercentage = calculateFixedCostPercentage(
    fixedCostsTotal,
    business.average_monthly_revenue,
  );
  const ingredientRows = (ingredients ?? []) as IngredientRecord[];
  const productRows = (products ?? []) as ProductRecord[];
  const productIngredientRows = (productIngredients ?? []) as ProductIngredientRecord[];
  const comboRows = (combos ?? []) as ComboRecord[];
  const comboItemRows = (comboItems ?? []) as ComboItemRecord[];
  const productCosts = productRows.map((product) => ({
    ...product,
    safeCost: calculateProductSafeCostFromRows(
      product.id,
      productIngredientRows,
      ingredientRows,
    ),
  }));
  const operationItems = buildOperationItems({
    products: productCosts.filter((product) => product.active),
    combos: comboRows.filter((combo) => combo.active),
    comboItems: comboItemRows,
  });
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
  const healthReport = evaluateOperationHealth({
    items: operationItems,
    fixedCostPercentage,
    pricingSettings,
  });
  const activeIngredientsCount = ingredientRows.filter((item) => item.active).length;
  const activeProductsCount = productRows.filter((item) => item.active).length;
  const activeCombosCount = comboRows.filter((item) => item.active).length;
  const activeFixedCostsCount = (fixedCosts ?? []).filter((item) => item.active).length;
  const hasHighFixedCost = isFixedCostPercentageHigh(fixedCostPercentage);

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Dashboard inicial</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Bem-vindo, {business.name}
        </h1>
      </div>

      <div className="mb-6 space-y-3">
        <OperationHealthDashboard report={healthReport} />
        {business.average_monthly_revenue <= 0 ? (
          <Alert>
            <AlertDescription>
              Informe faturamento medio para calcular margem liquida estimada.
            </AlertDescription>
          </Alert>
        ) : null}
        {hasHighFixedCost ? (
          <Alert variant="destructive">
            <AlertDescription>
              Custos fixos acima de 40% do faturamento medio podem pressionar sua margem.
            </AlertDescription>
          </Alert>
        ) : null}
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

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Ingredientes ativos" value={String(activeIngredientsCount)} />
        <SummaryCard label="Produtos ativos" value={String(activeProductsCount)} />
        <SummaryCard label="Combos ativos" value={String(activeCombosCount)} />
        <SummaryCard label="Custos fixos ativos" value={String(activeFixedCostsCount)} />
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

      <div className="mt-6 rounded-lg border bg-background p-4">
        <h2 className="text-lg font-semibold">Dica de reajuste gradual</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Se um produto estiver muito abaixo da margem de lucro ideal, evite
          aumentar o preço de uma vez só. Em muitos casos, é melhor reajustar
          gradualmente, testar a reação dos clientes e acompanhar o impacto no
          faturamento mensal. Assim você protege sua margem sem comprometer as
          vendas ou perder clientes de forma brusca.
        </p>
      </div>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
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

function buildOperationItems({
  products,
  combos,
  comboItems,
}: {
  products: Array<ProductRecord & { safeCost: number | null }>;
  combos: ComboRecord[];
  comboItems: ComboItemRecord[];
}): OperationHealthItemInput[] {
  return [
    ...products.map((product) => ({
      id: product.id,
      name: product.name,
      type: "product" as const,
      sellingPrice: product.selling_price,
      safeCost: product.safeCost,
      incompleteReason:
        product.safeCost == null ? "Produto sem ficha tecnica ou custo calculavel." : undefined,
    })),
    ...combos.map((combo) => ({
      id: combo.id,
      name: combo.name,
      type: "combo" as const,
      sellingPrice: combo.selling_price,
      safeCost: calculateComboSafeCostFromRows(combo.id, comboItems, products),
      incompleteReason: "Combo sem itens validos ou com produto sem custo calculavel.",
    })),
  ];
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
