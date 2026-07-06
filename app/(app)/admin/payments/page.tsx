import { redirect } from "next/navigation";

import {
  approvePaymentRequest,
  cancelPaymentRequest,
} from "@/app/(app)/admin/payments/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingPlan } from "@/lib/billing/plans";
import { formatCurrency } from "@/lib/calculations/money";
import { createClient } from "@/lib/supabase/server";

type PendingPaymentRequest = {
  id: string;
  business_id: string;
  plan: string;
  amount: number;
  payment_code: string;
  requested_by: string;
  created_at: string;
  businesses:
    | {
        name: string;
        owner_user_id: string;
      }
    | {
        name: string;
        owner_user_id: string;
      }[]
    | null;
};

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const { data: paymentRequests } = await supabase
    .from("payment_requests")
    .select("id, business_id, plan, amount, payment_code, requested_by, created_at, businesses(name, owner_user_id)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const pendingRequests = (paymentRequests ?? []) as PendingPaymentRequest[];

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Pagamentos PIX pendentes
            </h1>
          </div>
          <form action="/auth/signout" method="post">
            <Button variant="outline" type="submit">
              Sair
            </Button>
          </form>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Solicitacoes aguardando aprovacao</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma solicitacao pendente no momento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th className="p-3 font-medium">Codigo</th>
                      <th className="p-3 font-medium">Negocio</th>
                      <th className="p-3 font-medium">Solicitante</th>
                      <th className="p-3 font-medium">Plano</th>
                      <th className="p-3 font-medium">Valor</th>
                      <th className="p-3 font-medium">Data</th>
                      <th className="p-3 font-medium">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((request) => {
                      const plan = getBillingPlan(request.plan);

                      return (
                        <tr key={request.id} className="border-t align-top">
                          <td className="p-3 font-medium">{request.payment_code}</td>
                          <td className="p-3">
                            {getBusinessName(request.businesses) ?? request.business_id}
                          </td>
                          <td className="p-3">{request.requested_by}</td>
                          <td className="p-3">
                            <div className="font-medium">{plan?.name ?? request.plan}</div>
                            {plan ? (
                              <div className="text-xs text-muted-foreground">
                                {plan.accessLabel}
                              </div>
                            ) : null}
                          </td>
                          <td className="p-3">{formatCurrency(request.amount)}</td>
                          <td className="p-3">
                            {new Date(request.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <form action={approvePaymentRequest}>
                                <input
                                  type="hidden"
                                  name="paymentRequestId"
                                  value={request.id}
                                />
                                <Button type="submit" size="sm">
                                  Aprovar
                                </Button>
                              </form>
                              <form action={cancelPaymentRequest}>
                                <input
                                  type="hidden"
                                  name="paymentRequestId"
                                  value={request.id}
                                />
                                <Button type="submit" size="sm" variant="outline">
                                  Cancelar
                                </Button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function getBusinessName(businesses: PendingPaymentRequest["businesses"]) {
  if (Array.isArray(businesses)) {
    return businesses[0]?.name ?? null;
  }

  return businesses?.name ?? null;
}
