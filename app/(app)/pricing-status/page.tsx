import Link from "next/link";
import { redirect } from "next/navigation";
import { type ComponentType } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Info,
} from "lucide-react";

import { OperationHealthDashboard } from "@/components/dashboard/operation-health-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import {
  calculateComboBaseCost,
  calculateComboSafeCost,
  type ComboProductCostItem,
} from "@/lib/calculations/combos";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import {
  evaluateOperationHealth,
  type OperationHealthItemInput,
} from "@/lib/calculations/operation-health";
import { calculateProductBaseCost, calculateProductSafeCost } from "@/lib/calculations/products";
import { type PricingSettings } from "@/lib/calculations/pricing";
import { type Unit } from "@/lib/calculations/units";
import { hasActiveAccess } from "@/lib/auth/subscriptions";
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

export default async function PricingStatusPage() {
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, business_logo_url, average_monthly_revenue, desired_profit_margin, ifood_plan, ifood_commission_percentage, ifood_payment_fee_percentage, ifood_receivables_advance_percentage, ifood_monthly_fee, ifood_paid_online_by_default, card_fee_percentage, average_coupon_percentage, free_delivery_percentage")
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

  if (!hasActiveAccess(subscription)) {
    redirect("/billing");
  }

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
    items: buildOperationItems({
      products: productCosts.filter((product) => product.active),
      combos: comboRows.filter((combo) => combo.active),
      comboItems: comboItemRows,
    }),
    fixedCostPercentage,
    pricingSettings,
  });

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748B] transition hover:text-[#EA580C]"
          >
            <ArrowLeft className="size-4" />
            Voltar ao dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold text-[#0F172A] md:text-[34px]">
            Status da precificação
          </h1>
          <p className="mt-2 max-w-2xl text-base text-[#64748B]">
            Filtre os itens por prejuízo, atenção, saudáveis ou incompletos e abra a
            ação certa para corrigir preço, ficha ou simulação.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#F97316] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#EA580C]"
        >
          Cadastrar produto
        </Link>
      </section>

      <section className="mb-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatusSummaryCard
          icon={CircleAlert}
          label="Prejuízo"
          value={healthReport.lossItems.length}
          tone="red"
        />
        <StatusSummaryCard
          icon={AlertTriangle}
          label="Atenção"
          value={healthReport.belowMarginItems.length}
          tone="yellow"
        />
        <StatusSummaryCard
          icon={CheckCircle2}
          label="Saudáveis"
          value={healthReport.healthyItems.length}
          tone="green"
        />
        <StatusSummaryCard
          icon={Info}
          label="Incompletos"
          value={healthReport.incompleteItems.length}
          tone="neutral"
        />
      </section>

      <OperationHealthDashboard report={healthReport} />
    </AppShell>
  );
}

function StatusSummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "red" | "yellow" | "green" | "neutral";
}) {
  const tones = {
    red: "bg-[#FEF2F2] text-[#DC2626]",
    yellow: "bg-[#FFF7ED] text-[#F59E0B]",
    green: "bg-[#F0FDF4] text-[#16A34A]",
    neutral: "bg-slate-100 text-[#64748B]",
  };

  return (
    <div className="rounded-[22px] border border-[#E2E8F0] bg-white p-5 shadow-sm">
      <span className={`flex size-11 items-center justify-center rounded-[18px] ${tones[tone]}`}>
        <Icon className="size-5" />
      </span>
      <p className="mt-4 text-sm font-semibold text-[#64748B]">{label}</p>
      <p className="mt-1 text-[28px] font-extrabold leading-tight text-[#0F172A]">{value}</p>
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
        product.safeCost == null ? "Produto sem ficha técnica ou custo calculável." : undefined,
    })),
    ...combos.map((combo) => ({
      id: combo.id,
      name: combo.name,
      type: "combo" as const,
      sellingPrice: combo.selling_price,
      safeCost: calculateComboSafeCostFromRows(combo.id, comboItems, products),
      incompleteReason: "Combo sem itens válidos ou com produto sem custo calculável.",
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
