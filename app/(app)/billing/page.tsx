import { redirect } from "next/navigation";

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
  missing: "Nao encontrada",
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

  return (
    <AppShell businessName={business.name} businessLogoUrl={business.business_logo_url}>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Assinatura</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Planos e pagamento via PIX
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Status da assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Status efetivo:{" "}
              <span className="font-medium text-foreground">
                {pendingRequest ? "Pagamento pendente" : statusLabels[effectiveStatus]}
              </span>
            </p>
            <p>Plano atual: {currentPlan?.name ?? subscription?.plan ?? "Trial"}</p>
            <p>Pago ate: {subscription?.paid_until ?? "nao informado"}</p>
            <p>Dias restantes: {remainingDays}</p>
            {pendingRequest ? (
              <p>
                Pedido pendente: {pendingRequest.payment_code} -{" "}
                {pendingPlan?.name ?? pendingRequest.plan}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Dados para PIX manual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Chave PIX:{" "}
              <span className="font-medium text-foreground">
                {pixKey || "Configure PIX_KEY no ambiente"}
              </span>
            </p>
            <p>
              Recebedor:{" "}
              <span className="font-medium text-foreground">
                {pixReceiverName || "Configure PIX_RECEIVER_NAME no ambiente"}
              </span>
            </p>
            <p>
              O acesso so e renovado depois da aprovacao manual do pagamento.
            </p>
          </CardContent>
        </Card>
      </div>

      {pendingRequest ? (
        <div className="mt-6 rounded-lg border bg-background p-4">
          <h2 className="text-lg font-semibold">Pagamento pendente</h2>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <p>Plano: {pendingPlan?.name ?? pendingRequest.plan}</p>
            <p>Valor: {formatCurrency(pendingRequest.amount)}</p>
            <p>Codigo de referencia: {pendingRequest.payment_code}</p>
            <p>Criado em: {new Date(pendingRequest.created_at).toLocaleString("pt-BR")}</p>
          </div>
          <Alert className="mt-4">
            <AlertDescription>
              Faca o PIX para a chave informada, use o codigo de referencia no
              comprovante e aguarde a aprovacao manual.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {BILLING_PLANS.map((plan) => (
          <Card key={plan.code} className="rounded-lg">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-semibold">{formatCurrency(plan.price)}</p>
              <p className="text-sm text-muted-foreground">Plano mensal via PIX manual.</p>
              <form action={requestManualPixPayment}>
                <input type="hidden" name="planCode" value={plan.code} />
                <Button type="submit" className="w-full" disabled={Boolean(pendingRequest)}>
                  Solicitar pagamento via PIX
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
