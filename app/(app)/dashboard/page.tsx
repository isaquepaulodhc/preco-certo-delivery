import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Package,
  ReceiptText,
  Store,
  Target,
} from "lucide-react";

import { OperationHealthDashboard } from "@/components/dashboard/operation-health-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  evaluateOperationHealth,
  type OperationHealthItemInput,
  type OperationHealthStatus,
} from "@/lib/calculations/operation-health";
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
  const attentionCount =
    healthReport.lossItems.length +
    healthReport.belowMarginItems.length +
    healthReport.incompleteItems.length;
  const pricingStatus = getPricingStatusView(healthReport.status);

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F97316]">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A] md:text-4xl">
            Painel de lucro do delivery
          </h1>
          <p className="mt-2 max-w-2xl text-base text-[#64748B]">
            Acompanhe CMV, margem e preços sugeridos dos seus produtos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2 text-sm font-semibold text-[#16A34A]"
          >
            <CheckCircle2 className="size-4" />
            {effectiveStatus === "active" ? "Plano ativo" : "Ver assinatura"}
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#EA580C]"
          >
            Cadastrar produto
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Target}
          label="Margem desejada"
          value={`${(business.desired_profit_margin * 100).toFixed(0)}%`}
          detail="Margem minima definida para seus produtos"
          tone="orange"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Custos fixos"
          value={formatCurrency(fixedCostsTotal)}
          detail={
            fixedCostPercentage == null
              ? "Informe faturamento medio"
              : `${(fixedCostPercentage * 100).toFixed(2)}% do faturamento medio`
          }
          tone="green"
        />
        <MetricCard
          icon={Package}
          label="Produtos cadastrados"
          value={String(activeProductsCount)}
          detail={`${activeCombosCount} combos ativos e ${activeIngredientsCount} ingredientes`}
          tone="blue"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Status da precificacao"
          value={pricingStatus.label}
          detail={
            attentionCount > 0
              ? `${attentionCount} ponto(s) precisam de revisao`
              : "Cardapio sem alertas avaliaveis"
          }
          tone={pricingStatus.tone}
        />
      </section>

      <div className="mt-6 space-y-3">
        {business.average_monthly_revenue <= 0 ? (
          <Alert className="border-[#F59E0B]/30 bg-[#FFF7ED] text-[#92400E]">
            <AlertDescription>
              Informe faturamento medio para calcular margem liquida estimada.
            </AlertDescription>
          </Alert>
        ) : null}
        {hasHighFixedCost ? (
          <Alert className="border-[#DC2626]/25 bg-[#FEF2F2] text-[#991B1B]">
            <AlertDescription>
              Custos fixos acima de 40% do faturamento medio podem pressionar sua margem.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <div className="mt-6">
        <OperationHealthDashboard report={healthReport} />
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#F97316]">
                <Store className="size-5" />
              </span>
              <div>
                <CardTitle>Perfil do negocio</CardTitle>
                <p className="text-sm text-[#64748B]">
                  {business.segment || "Segmento nao informado"} -{" "}
                  {business.city || "Cidade nao informada"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/store-profile">
              <Button variant="outline">Editar perfil</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Configure sua plataforma em 3 passos</CardTitle>
                <p className="mt-1 text-sm text-[#64748B]">
                  Revise as bases que alimentam precos, margem e diagnostico.
                </p>
              </div>
              <span className="rounded-full bg-[#F0FDF4] px-3 py-1 text-xs font-semibold text-[#16A34A]">
                {activeProductsCount > 0 ? "Em andamento" : "Comece agora"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-3">
            <StepPill label="Perfil do negocio" href="/store-profile" done />
            <StepPill
              label="Taxas e margem"
              href="/financial-settings"
              done={fixedCostPercentage != null}
            />
            <StepPill
              label="Produtos e combos"
              href="/products"
              done={activeProductsCount > 0}
            />
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Ingredientes ativos" value={String(activeIngredientsCount)} />
        <SummaryCard label="Combos ativos" value={String(activeCombosCount)} />
        <SummaryCard label="Custos fixos ativos" value={String(activeFixedCostsCount)} />
        <SummaryCard
          label="Faturamento medio"
          value={formatCurrency(business.average_monthly_revenue)}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#F0FDF4] text-[#16A34A]">
                <ReceiptText className="size-5" />
              </span>
              <div>
                <CardTitle>Custos fixos</CardTitle>
                <p className="text-sm text-[#64748B]">Peso dos custos na operacao.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#64748B]">
            <p className="text-2xl font-bold text-[#0F172A]">{formatCurrency(fixedCostsTotal)}</p>
            <p>
              Percentual do faturamento:{" "}
              <span className="font-semibold text-[#0F172A]">
                {fixedCostPercentage == null
                  ? "informe faturamento medio"
                  : `${(fixedCostPercentage * 100).toFixed(2)}%`}
              </span>
            </p>
            <Link href="/fixed-costs">
              <Button variant="outline">Gerenciar custos</Button>
            </Link>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFF7ED] p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#0F172A]">Dica de reajuste gradual</h2>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            Se um produto estiver muito abaixo da margem de lucro ideal, evite
            aumentar o preço de uma vez só. Em muitos casos, é melhor reajustar
            gradualmente, testar a reação dos clientes e acompanhar o impacto no
            faturamento mensal. Assim você protege sua margem sem comprometer as
            vendas ou perder clientes de forma brusca.
          </p>
        </div>
      </section>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#64748B]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: "orange" | "green" | "blue" | "red" | "yellow" | "neutral";
}) {
  const tones = {
    orange: "bg-[#FFF7ED] text-[#F97316]",
    green: "bg-[#F0FDF4] text-[#16A34A]",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-[#FEF2F2] text-[#DC2626]",
    yellow: "bg-amber-50 text-[#F59E0B]",
    neutral: "bg-slate-100 text-[#64748B]",
  };

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className={`flex size-12 items-center justify-center rounded-2xl ${tones[tone]}`}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{value}</p>
          <p className="mt-2 text-sm leading-5 text-[#64748B]">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function StepPill({
  label,
  href,
  done,
}: {
  label: string;
  href: string;
  done: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-3 text-[#0F172A] transition hover:border-[#F97316]/40 hover:bg-white"
    >
      <span className="font-medium">{label}</span>
      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${
          done ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-slate-100 text-[#64748B]"
        }`}
      >
        {done ? "Concluido" : "Pendente"}
      </span>
    </Link>
  );
}

function getPricingStatusView(status: OperationHealthStatus) {
  const statusMap = {
    neutral: { label: "Incompleto", tone: "neutral" as const },
    red: { label: "Prejuizo", tone: "red" as const },
    yellow: { label: "Atencao", tone: "yellow" as const },
    green: { label: "Saudavel", tone: "green" as const },
  };

  return statusMap[status];
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
