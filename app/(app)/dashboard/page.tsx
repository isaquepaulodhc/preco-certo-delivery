import Link from "next/link";
import { redirect } from "next/navigation";
import { type ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Package,
  Target,
} from "lucide-react";

import { OperationHealthDashboard } from "@/components/dashboard/operation-health-dashboard";
import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  calculateComboBaseCost,
  calculateComboSafeCost,
  type ComboProductCostItem,
} from "@/lib/calculations/combos";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import { formatCurrency } from "@/lib/calculations/money";
import {
  evaluateOperationHealth,
  type OperationHealthItemInput,
  type OperationHealthReport,
  type OperationHealthStatus,
} from "@/lib/calculations/operation-health";
import { calculateProductBaseCost, calculateProductSafeCost } from "@/lib/calculations/products";
import {
  calculateIfoodProductMargin,
  calculateOwnChannelProductMargin,
  type MarginResult,
  type PricingSettings,
} from "@/lib/calculations/pricing";
import { type Unit } from "@/lib/calculations/units";
import { getEffectiveSubscriptionStatus } from "@/lib/auth/subscriptions";
import { getInitials } from "@/lib/storage/business-logos";
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

type SetupStep = {
  label: string;
  href: string;
  done: boolean;
};

type ChannelSummary = {
  name: string;
  description: string;
  icon: ChannelIcon;
  margin: number | null;
  feeLabel: string;
  statusLabel: string;
  statusClassName: string;
  marginClassName: string;
};

type ChannelIcon = {
  src: string | null;
  alt: string;
  fallback: string;
  className: string;
  imageClassName: string;
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
  const fixedCostAlert = getFixedCostPercentageAlert(fixedCostPercentage);
  const attentionCount =
    healthReport.lossItems.length +
    healthReport.belowMarginItems.length +
    healthReport.incompleteItems.length;
  const pricingStatus = getPricingStatusView(healthReport.status);
  const setupSteps = buildSetupSteps({
    hasProfile: Boolean(business.name && business.segment && business.city),
    hasFinancialSettings:
      business.average_monthly_revenue > 0 && business.desired_profit_margin > 0,
    hasIngredients: activeIngredientsCount > 0,
    hasCatalog: activeProductsCount + activeCombosCount > 0,
  });
  const completedSetupSteps = setupSteps.filter((step) => step.done).length;
  const channelSummaries = buildChannelSummaries({
    items: operationItems,
    fixedCostPercentage,
    pricingSettings,
    businessName: business.name,
    businessLogoUrl: business.business_logo_url,
  });
  const marginIssueCards = buildMarginIssueCards({
    operationItems,
    healthReport,
    averageMonthlyRevenue: business.average_monthly_revenue,
    fixedCostPercentage,
  });

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] md:text-[34px]">
            Painel de lucro do delivery
          </h1>
          <p className="mt-2 max-w-2xl text-base text-[#64748B]">
            Acompanhe CMV, margem e preços sugeridos dos seus produtos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-sm font-bold text-[#16A34A]"
          >
            <CheckCircle2 className="size-4" />
            {effectiveStatus === "active" ? "Plano ativo" : "Ver assinatura"}
          </Link>
          <Link
            href="/pricing-status"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-bold text-[#0F172A] transition hover:border-[#F97316]/40 hover:text-[#EA580C]"
          >
            Ver diagnóstico
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-[#EA580C]"
          >
            Cadastrar produto
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Target}
          label="Margem desejada"
          value={`${(business.desired_profit_margin * 100).toFixed(0)}%`}
          detail="Margem mínima definida para seus produtos"
          tone="orange"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Custos fixos"
          value={formatCurrency(fixedCostsTotal)}
          detail={
            fixedCostPercentage == null
              ? "Informe faturamento médio"
              : `${(fixedCostPercentage * 100).toFixed(2)}% do faturamento médio`
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
          label="Status da precificação"
          value={pricingStatus.label}
          detail={
            attentionCount > 0
              ? `${attentionCount} ponto(s) precisam de revisão`
              : "Cardápio sem alertas avaliáveis"
          }
          tone={pricingStatus.tone}
          href="/pricing-status"
        />
      </section>

      <div className="mt-5 space-y-3">
        {business.average_monthly_revenue <= 0 ? (
          <Alert className="border-[#F59E0B]/30 bg-[#FFF7ED] text-[#92400E]">
            <AlertDescription>
              Informe faturamento médio para calcular margem líquida estimada.
            </AlertDescription>
          </Alert>
        ) : null}
        {fixedCostAlert ? (
          <Alert className={fixedCostAlert.className}>
            <AlertDescription>
              <strong>{fixedCostAlert.label}:</strong> {fixedCostAlert.description}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <OperationHealthDashboard report={healthReport} showDiagnosis={false} />

        <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                Configure sua plataforma em 4 passos
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Revise as bases que alimentam CMV, margem e preços sugeridos.
              </p>
            </div>
            <span className="w-fit rounded-full bg-[#F0FDF4] px-3 py-1 text-xs font-semibold text-[#16A34A]">
              {completedSetupSteps} de {setupSteps.length} etapas concluídas
            </span>
          </div>
          <div className="mt-5 divide-y divide-[#E2E8F0]">
            {setupSteps.map((step, index) => (
              <StepRow
                key={step.href}
                step={step}
                index={index + 1}
                isLast={index === setupSteps.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">
                Onde você pode estar perdendo margem
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Os pontos abaixo levam ao diagnóstico detalhado.
              </p>
            </div>
            <Link
              href="/pricing-status"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#F97316] hover:text-[#EA580C]"
            >
              Ver todos
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {marginIssueCards.map((card) => (
              <MarginIssueCard key={card.label} {...card} />
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#E2E8F0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Resumo dos canais</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Compare margens estimadas usando as configurações atuais.
              </p>
            </div>
            <Link
              href="/financial-settings"
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#64748B] transition hover:border-[#F97316]/40 hover:text-[#EA580C]"
            >
              Ver taxas
            </Link>
          </div>
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            {channelSummaries.map((channel) => (
              <ChannelCard key={channel.name} channel={channel} />
            ))}
          </div>
        </div>
      </section>

    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: "orange" | "green" | "blue" | "red" | "yellow" | "neutral";
  href?: string;
}) {
  const tones = {
    orange: "bg-[#FFF7ED] text-[#F97316]",
    green: "bg-[#F0FDF4] text-[#16A34A]",
    blue: "bg-blue-50 text-blue-600",
    red: "bg-[#FEF2F2] text-[#DC2626]",
    yellow: "bg-amber-50 text-[#F59E0B]",
    neutral: "bg-slate-100 text-[#64748B]",
  };
  const card = (
    <div className="group h-full min-h-[150px] rounded-[22px] border border-[#E2E8F0] bg-white p-6 shadow-sm transition hover:border-[#F97316]/30 hover:shadow-md">
      <div className="flex items-start gap-4">
        <span className={`flex size-[52px] items-center justify-center rounded-[20px] ${tones[tone]}`}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-[28px] font-extrabold leading-tight text-[#0F172A]">{value}</p>
            {href ? (
              <ArrowRight className="size-4 text-[#F97316] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-5 text-[#64748B]">{detail}</p>
        </div>
      </div>
    </div>
  );

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      className="block h-full"
    >
      {card}
    </Link>
  );
}

function StepRow({
  step,
  index,
  isLast,
}: {
  step: SetupStep;
  index: number;
  isLast: boolean;
}) {
  return (
    <Link
      href={step.href}
      className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-[16px] px-2 py-3 transition hover:bg-[#F8FAFC]"
    >
      <div className="relative flex justify-center">
        {!isLast ? (
          <span className="absolute left-1/2 top-8 h-7 w-px -translate-x-1/2 bg-[#E2E8F0]" />
        ) : null}
        <span
          className={`relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-bold ${
            step.done
              ? "bg-[#16A34A] text-white"
              : "border border-[#CBD5E1] bg-[#F8FAFC] text-[#64748B]"
          }`}
        >
          {step.done ? <CheckCircle2 className="size-4" /> : index}
        </span>
      </div>
      <span className="font-semibold text-[#0F172A] group-hover:text-[#EA580C]">
        {step.label}
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          step.done ? "bg-[#F0FDF4] text-[#16A34A]" : "bg-slate-100 text-[#64748B]"
        }`}
      >
        {step.done ? "Concluído" : "Pendente"}
      </span>
    </Link>
  );
}

function MarginIssueCard({
  label,
  value,
  href,
  tone,
  status,
}: {
  label: string;
  value: number;
  href: string;
  tone: "red" | "yellow" | "neutral";
  status: string;
}) {
  const tones = {
    red: {
      icon: "bg-[#FEF2F2] text-[#DC2626]",
      badge: "bg-[#FEF2F2] text-[#DC2626]",
    },
    yellow: {
      icon: "bg-[#FFF7ED] text-[#F59E0B]",
      badge: "bg-[#FFF7ED] text-[#F59E0B]",
    },
    neutral: {
      icon: "bg-slate-100 text-[#64748B]",
      badge: "bg-slate-100 text-[#64748B]",
    },
  };

  return (
    <Link
      href={href}
      className="rounded-[18px] border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:border-[#F97316]/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-9 items-center justify-center rounded-xl ${tones[tone].icon}`}>
          <AlertTriangle className="size-4" />
        </span>
        <span className="text-2xl font-bold text-[#0F172A]">{value}</span>
      </div>
      <p className="mt-3 min-h-10 text-sm font-medium leading-5 text-[#0F172A]">
        {label}
      </p>
      <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone].badge}`}>
        {status}
      </span>
    </Link>
  );
}

function ChannelCard({ channel }: { channel: ChannelSummary }) {
  return (
    <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <ChannelAvatar icon={channel.icon} />
        <div>
          <h3 className="font-bold text-[#0F172A]">{channel.name}</h3>
          <p className="mt-1 text-xs leading-5 text-[#64748B]">{channel.description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#64748B]">Margem média</span>
          <span className={`text-lg font-bold ${channel.marginClassName}`}>
            {formatPercentage(channel.margin)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[#64748B]">Taxa</span>
          <span className="font-semibold text-[#0F172A]">{channel.feeLabel}</span>
        </div>
      </div>
      <span className={`mt-4 inline-flex w-full justify-center rounded-xl px-3 py-2 text-xs font-bold ${channel.statusClassName}`}>
        {channel.statusLabel}
      </span>
    </div>
  );
}

function ChannelAvatar({ icon }: { icon: ChannelIcon }) {
  return (
    <span
      className={`relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-extrabold ${icon.className}`}
    >
      <span aria-hidden="true">{icon.fallback}</span>
      {icon.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon.src}
          alt={icon.alt}
          className={`absolute inset-0 size-full ${icon.imageClassName}`}
        />
      ) : null}
    </span>
  );
}

function getPricingStatusView(status: OperationHealthStatus) {
  const statusMap = {
    neutral: { label: "Incompleto", tone: "neutral" as const },
    red: { label: "Prejuízo", tone: "red" as const },
    yellow: { label: "Atenção", tone: "yellow" as const },
    green: { label: "Saudável", tone: "green" as const },
  };

  return statusMap[status];
}

function getFixedCostPercentageAlert(percentage: number | null) {
  if (percentage == null || percentage <= 0.2) {
    return null;
  }

  if (percentage <= 0.3) {
    return {
      label: "Atenção leve",
      description:
        "Custos fixos acima de 20% do faturamento pedem acompanhamento mais próximo antes de novos reajustes.",
      className: "border-[#F59E0B]/30 bg-[#FFF7ED] text-[#92400E]",
    };
  }

  if (percentage <= 0.4) {
    return {
      label: "Alerta",
      description:
        "Seus custos fixos estão consumindo uma parte relevante do faturamento. Revise despesas recorrentes e acompanhe se o volume de vendas atual sustenta essa estrutura.",
      className: "border-[#F97316]/30 bg-[#FFF7ED] text-[#7C2D12]",
    };
  }

  return {
    label: "Crítico",
    description:
      "Custos fixos acima de 40% do faturamento podem comprometer fortemente a margem. Avalie redução de despesas ou aumento de faturamento antes de reajustar preços de forma brusca.",
    className: "border-[#DC2626]/25 bg-[#FEF2F2] text-[#991B1B]",
  };
}

function buildSetupSteps({
  hasProfile,
  hasFinancialSettings,
  hasIngredients,
  hasCatalog,
}: {
  hasProfile: boolean;
  hasFinancialSettings: boolean;
  hasIngredients: boolean;
  hasCatalog: boolean;
}): SetupStep[] {
  return [
    { label: "Perfil do negócio", href: "/store-profile", done: hasProfile },
    { label: "Taxas e margem", href: "/financial-settings", done: hasFinancialSettings },
    { label: "Ingredientes", href: "/ingredients", done: hasIngredients },
    { label: "Produtos e combos", href: "/products", done: hasCatalog },
  ];
}

function buildMarginIssueCards({
  operationItems,
  healthReport,
  averageMonthlyRevenue,
  fixedCostPercentage,
}: {
  operationItems: OperationHealthItemInput[];
  healthReport: OperationHealthReport;
  averageMonthlyRevenue: number;
  fixedCostPercentage: number | null;
}) {
  const productsWithoutCost = operationItems.filter(
    (item) => item.type === "product" && item.safeCost == null,
  ).length;
  const productsBelowMargin = healthReport.belowMarginItems.filter(
    (item) => item.type === "product",
  ).length;
  const combosWithAlert = [
    ...healthReport.lossItems,
    ...healthReport.belowMarginItems,
    ...healthReport.incompleteItems,
  ].filter((item) => item.type === "combo").length;
  const fixedCostIssues = averageMonthlyRevenue <= 0 || fixedCostPercentage == null ? 1 : 0;

  return [
    {
      label: "Produtos sem custo calculado",
      value: productsWithoutCost,
      href: "/pricing-status",
      tone: productsWithoutCost > 0 ? "red" as const : "neutral" as const,
      status: productsWithoutCost > 0 ? "Crítico" : "Ok",
    },
    {
      label: "Produtos abaixo da margem",
      value: productsBelowMargin,
      href: "/pricing-status",
      tone: productsBelowMargin > 0 ? "yellow" as const : "neutral" as const,
      status: productsBelowMargin > 0 ? "Atenção" : "Ok",
    },
    {
      label: "Combos com alerta de margem",
      value: combosWithAlert,
      href: "/pricing-status",
      tone: combosWithAlert > 0 ? "red" as const : "neutral" as const,
      status: combosWithAlert > 0 ? "Crítico" : "Ok",
    },
    {
      label: "Custos fixos incompletos",
      value: fixedCostIssues,
      href: "/fixed-costs",
      tone: fixedCostIssues > 0 ? "yellow" as const : "neutral" as const,
      status: fixedCostIssues > 0 ? "Atenção" : "Ok",
    },
  ];
}

function buildChannelSummaries({
  items,
  fixedCostPercentage,
  pricingSettings,
  businessName,
  businessLogoUrl,
}: {
  items: OperationHealthItemInput[];
  fixedCostPercentage: number | null;
  pricingSettings: PricingSettings;
  businessName: string;
  businessLogoUrl: string | null;
}): ChannelSummary[] {
  const calculableItems = items.filter(isCalculableItem);
  const ownMargins = calculableItems.map((item) =>
    calculateOwnChannelProductMargin({
      sellingPrice: item.sellingPrice,
      safeCost: item.safeCost,
      fixedCostPercentage,
      settings: pricingSettings,
    }),
  );
  const counterMargins = calculableItems.map((item) =>
    calculateOwnChannelProductMargin({
      sellingPrice: item.sellingPrice,
      safeCost: item.safeCost,
      fixedCostPercentage,
      settings: {
        ...pricingSettings,
        freeDeliveryPercentage: 0,
      },
    }),
  );
  const ifoodMargins = calculableItems.map((item) =>
    calculateIfoodProductMargin({
      sellingPrice: item.sellingPrice,
      safeCost: item.safeCost,
      fixedCostPercentage,
      settings: pricingSettings,
    }),
  );
  const ownAverage = getAverageNetMargin(ownMargins);
  const counterAverage = getAverageNetMargin(counterMargins);
  const ifoodAverage = getAverageNetMargin(ifoodMargins);
  const ifoodFeePercentage =
    pricingSettings.ifoodCommissionPercentage +
    (pricingSettings.ifoodPaidOnlineByDefault
      ? pricingSettings.ifoodPaymentFeePercentage
      : 0) +
    pricingSettings.ifoodReceivablesAdvancePercentage;

  return [
    {
      name: "WhatsApp",
      description: "Canal próprio com cartão, cupom e entrega configurados.",
      icon: {
        src: "/channel-icons/whatsapp.png",
        alt: "WhatsApp",
        fallback: "W",
        className: "border-[#BBF7D0] bg-[#F0FDF4] text-[#16A34A]",
        imageClassName: "object-cover",
      },
      margin: ownAverage,
      feeLabel: formatPercentage(pricingSettings.cardFeePercentage, 1),
      ...getChannelStatus(ownAverage, pricingSettings.desiredProfitMargin),
    },
    {
      name: "Balcão",
      description: "Referência própria sem subsídio de entrega grátis.",
      icon: {
        src: businessLogoUrl,
        alt: `Logo de ${businessName}`,
        fallback: getInitials(businessName),
        className: "border-blue-100 bg-blue-50 text-blue-600",
        imageClassName: "object-cover",
      },
      margin: counterAverage,
      feeLabel: formatPercentage(pricingSettings.cardFeePercentage, 1),
      ...getChannelStatus(counterAverage, pricingSettings.desiredProfitMargin),
    },
    {
      name: "iFood",
      description: "Comparação com comissão e pagamento online do plano.",
      icon: {
        src: "/channel-icons/ifood.png",
        alt: "iFood",
        fallback: "IF",
        className: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]",
        imageClassName: "object-cover",
      },
      margin: ifoodAverage,
      feeLabel: formatPercentage(ifoodFeePercentage, 1),
      ...getChannelStatus(ifoodAverage, pricingSettings.desiredProfitMargin),
    },
  ];
}

function isCalculableItem(
  item: OperationHealthItemInput,
): item is OperationHealthItemInput & { safeCost: number } {
  return item.safeCost != null && item.sellingPrice > 0;
}

function getAverageNetMargin(results: MarginResult[]) {
  const readyResults = results.filter(isReadyMarginResult);

  if (readyResults.length === 0) {
    return null;
  }

  return (
    readyResults.reduce((total, result) => total + result.estimatedNetMargin, 0) /
    readyResults.length
  );
}

function isReadyMarginResult(
  result: MarginResult,
): result is Extract<MarginResult, { status: "ready" }> {
  return result.status === "ready";
}

function getChannelStatus(margin: number | null, desiredProfitMargin: number) {
  if (margin == null) {
    return {
      statusLabel: "Dados incompletos",
      statusClassName: "bg-slate-100 text-[#64748B]",
      marginClassName: "text-[#64748B]",
    };
  }

  if (margin <= 0) {
    return {
      statusLabel: "Prejuízo",
      statusClassName: "bg-[#FEF2F2] text-[#DC2626]",
      marginClassName: "text-[#DC2626]",
    };
  }

  if (margin < desiredProfitMargin) {
    return {
      statusLabel: "Atenção",
      statusClassName: "bg-[#FFF7ED] text-[#F59E0B]",
      marginClassName: "text-[#F59E0B]",
    };
  }

  return {
    statusLabel: "Saudável",
    statusClassName: "bg-[#F0FDF4] text-[#16A34A]",
    marginClassName: "text-[#16A34A]",
  };
}

function formatPercentage(value: number | null, digits = 0) {
  if (value == null) {
    return "--";
  }

  return `${(value * 100).toFixed(digits)}%`;
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
