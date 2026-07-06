import { redirect } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Landmark,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { requestManualPixPayment } from "@/app/(app)/billing/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateRemainingDays,
  getEffectiveSubscriptionStatus,
} from "@/lib/auth/subscriptions";
import { BILLING_PLANS, getBillingPlan } from "@/lib/billing/plans";
import { formatCurrency } from "@/lib/calculations/money";
import { createClient } from "@/lib/supabase/server";

type BusinessRecord = {
  id: string;
  name: string;
  business_logo_url: string | null;
};

type SubscriptionRecord = {
  id: string;
  plan: string;
  status: "trial" | "active" | "expired" | "blocked" | "cancelled";
  amount: number;
  paid_until: string | null;
};

type PaymentRequestRecord = {
  id: string;
  plan: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  payment_code: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  active: "Ativa",
  trial: "Trial",
  expired: "Expirada",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
  missing: "Não encontrada",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, business_logo_url")
    .maybeSingle<BusinessRecord>();

  if (!business) {
    redirect("/onboarding");
  }

  const [{ data: subscription }, { data: pendingRequest }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id, plan, status, amount, paid_until")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<SubscriptionRecord>(),
    supabase
      .from("payment_requests")
      .select("id, plan, amount, status, payment_code, created_at")
      .eq("business_id", business.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<PaymentRequestRecord>(),
  ]);

  const effectiveStatus = getEffectiveSubscriptionStatus(subscription);
  const currentPlan = getBillingPlan(subscription?.plan ?? null);
  const remainingDays = calculateRemainingDays(subscription?.paid_until);
  const pixKey = process.env.PIX_KEY;
  const pixReceiverName = process.env.PIX_RECEIVER_NAME;
  const pendingPlan = getBillingPlan(pendingRequest?.plan ?? null);
  const statusView = getStatusView(pendingRequest ? "pending" : effectiveStatus);
  const StatusIcon = statusView.icon;

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F97316]">
            Assinatura
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0F172A] md:text-[34px]">
            Planos e pagamento via PIX
          </h1>
          <p className="mt-2 max-w-2xl text-base text-[#64748B]">
            Regularize o acesso da sua loja com pagamento manual e aprovacao segura.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${statusView.className}`}>
          <StatusIcon className="size-4" />
          {pendingRequest ? "Pagamento pendente" : statusLabels[effectiveStatus]}
        </span>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[24px] border-[#E2E8F0] bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-[20px] bg-[#F0FDF4] text-[#16A34A]">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <CardTitle>Status da assinatura</CardTitle>
                <p className="mt-1 text-sm text-[#64748B]">Acesso atual do negócio.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-[#64748B] md:grid-cols-2">
            <InfoTile
              label="Status efetivo"
              value={pendingRequest ? "Pagamento pendente" : statusLabels[effectiveStatus]}
            />
            <InfoTile label="Plano atual" value={currentPlan?.name ?? subscription?.plan ?? "Trial"} />
            <InfoTile label="Pago até" value={subscription?.paid_until ?? "não informado"} />
            <InfoTile label="Dias restantes" value={String(remainingDays)} />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-[#E2E8F0] bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-[20px] bg-[#FFF7ED] text-[#F97316]">
                <QrCode className="size-5" />
              </span>
              <div>
                <CardTitle>Dados para PIX manual</CardTitle>
                <p className="mt-1 text-sm text-[#64748B]">Use esses dados no pagamento.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#64748B]">
            <InfoTile
              label="Chave PIX"
              value={pixKey || "Configure PIX_KEY no ambiente"}
              strong
            />
            <InfoTile
              label="Recebedor"
              value={pixReceiverName || "Configure PIX_RECEIVER_NAME no ambiente"}
              strong
            />
            <p className="rounded-2xl bg-[#FFF7ED] p-3 text-[#9A3412]">
              O acesso só é renovado depois da aprovação manual do pagamento.
            </p>
          </CardContent>
        </Card>
      </section>

      {pendingRequest ? (
        <section className="mt-5 rounded-[24px] border border-[#FDBA74] bg-[#FFF7ED] p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#F97316]">
                Pagamento pendente
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0F172A]">
                Código {pendingRequest.payment_code}
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Faça o PIX, use o código de referência no comprovante e aguarde a aprovação manual.
              </p>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#F97316]">
              {pendingPlan?.name ?? pendingRequest.plan}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <InfoTile label="Plano" value={pendingPlan?.name ?? pendingRequest.plan} />
            <InfoTile label="Valor" value={formatCurrency(pendingRequest.amount)} strong />
            <InfoTile
              label="Acesso"
              value={pendingPlan?.accessLabel ?? "Periodo conforme plano"}
            />
            <InfoTile
              label="Criado em"
              value={new Date(pendingRequest.created_at).toLocaleString("pt-BR")}
            />
          </div>
          <Alert className="mt-4 border-[#F97316]/30 bg-white text-[#9A3412]">
            <AlertDescription>
              Pedido pendente não libera acesso por si só. A assinatura só muda após aprovação administrativa.
            </AlertDescription>
          </Alert>
        </section>
      ) : null}

      <section className="mt-5 grid gap-5 md:grid-cols-3">
        {BILLING_PLANS.map((plan) => (
          <Card
            key={plan.code}
            className="rounded-[24px] border-[#E2E8F0] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-[18px] bg-[#FFF7ED] text-[#F97316]">
                  <CreditCard className="size-5" />
                </span>
                <span className="rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-semibold text-[#64748B]">
                  PIX manual
                </span>
              </div>
              <CardTitle className="mt-4">{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-4xl font-bold tracking-tight text-[#0F172A]">
                  {formatCurrency(plan.price)}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                  {plan.billingLabel}
                </p>
                <p className="mt-1 text-sm text-[#64748B]">
                  Valor total do ciclo. {plan.accessLabel}.
                </p>
                {plan.monthlyEquivalentLabel ? (
                  <p className="mt-1 text-xs font-semibold text-[#16A34A]">
                    {plan.monthlyEquivalentLabel}
                  </p>
                ) : null}
              </div>
              <form action={requestManualPixPayment}>
                <input type="hidden" name="planCode" value={plan.code} />
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-[#F97316] font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-[#EA580C]"
                  disabled={Boolean(pendingRequest)}
                >
                  Solicitar pagamento via PIX
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}

function InfoTile({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
        {label}
      </p>
      <p className={`mt-1 break-words ${strong ? "text-lg font-bold" : "font-semibold"} text-[#0F172A]`}>
        {value}
      </p>
    </div>
  );
}

function getStatusView(status: string) {
  const views = {
    active: {
      className: "bg-[#F0FDF4] text-[#16A34A]",
      icon: CheckCircle2,
    },
    trial: {
      className: "bg-[#FFF7ED] text-[#F97316]",
      icon: Timer,
    },
    pending: {
      className: "bg-[#FFF7ED] text-[#F97316]",
      icon: ReceiptText,
    },
    expired: {
      className: "bg-[#FEF2F2] text-[#DC2626]",
      icon: Landmark,
    },
    blocked: {
      className: "bg-[#FEF2F2] text-[#DC2626]",
      icon: Landmark,
    },
    cancelled: {
      className: "bg-slate-100 text-[#64748B]",
      icon: Landmark,
    },
    missing: {
      className: "bg-slate-100 text-[#64748B]",
      icon: Landmark,
    },
  };

  return views[status as keyof typeof views] ?? views.missing;
}
