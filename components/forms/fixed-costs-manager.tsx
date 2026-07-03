"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
  isFixedCostPercentageHigh,
} from "@/lib/calculations/fixed-costs";
import { formatCurrency } from "@/lib/calculations/money";
import { createClient } from "@/lib/supabase/client";
import { fixedCostSchema, type FixedCostInput } from "@/lib/validations/fixed-costs";

export type FixedCostRow = {
  id: string;
  name: string;
  category: string | null;
  amount: number;
  active: boolean;
};

type FixedCostsManagerProps = {
  businessId: string;
  averageMonthlyRevenue: number;
  ifoodMonthlyFee: number;
  initialFixedCosts: FixedCostRow[];
};

export function FixedCostsManager({
  businessId,
  averageMonthlyRevenue,
  ifoodMonthlyFee,
  initialFixedCosts,
}: FixedCostsManagerProps) {
  const [fixedCosts, setFixedCosts] = useState(initialFixedCosts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const createForm = useForm<FixedCostInput>({
    resolver: zodResolver(fixedCostSchema),
    defaultValues: { name: "", category: "", amount: 0, active: true },
  });
  const editForm = useForm<FixedCostInput>({
    resolver: zodResolver(fixedCostSchema),
    defaultValues: { name: "", category: "", amount: 0, active: true },
  });

  const summary = useMemo(() => {
    const total = calculateFixedCostsTotal(fixedCosts, ifoodMonthlyFee);
    const percentage = calculateFixedCostPercentage(total, averageMonthlyRevenue);

    return {
      total,
      percentage,
      isHigh: isFixedCostPercentageHigh(percentage),
    };
  }, [averageMonthlyRevenue, fixedCosts, ifoodMonthlyFee]);

  async function createFixedCost(values: FixedCostInput) {
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("fixed_costs")
      .insert({
        business_id: businessId,
        name: values.name,
        category: values.category || null,
        amount: values.amount,
        active: values.active,
      })
      .select("id, name, category, amount, active")
      .single();

    if (insertError) {
      setError("Nao foi possivel criar o custo fixo.");
      return;
    }

    setFixedCosts((current) => [...current, data as FixedCostRow]);
    createForm.reset({ name: "", category: "", amount: 0, active: true });
    setMessage("Custo fixo criado.");
  }

  function startEditing(cost: FixedCostRow) {
    setEditingId(cost.id);
    editForm.reset({
      name: cost.name,
      category: cost.category ?? "",
      amount: cost.amount,
      active: cost.active,
    });
  }

  async function saveEditing(values: FixedCostInput) {
    if (!editingId) {
      return;
    }

    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("fixed_costs")
      .update({
        name: values.name,
        category: values.category || null,
        amount: values.amount,
        active: values.active,
      })
      .eq("id", editingId)
      .eq("business_id", businessId)
      .select("id, name, category, amount, active")
      .single();

    if (updateError) {
      setError("Nao foi possivel salvar o custo fixo.");
      return;
    }

    setFixedCosts((current) =>
      current.map((cost) => (cost.id === editingId ? (data as FixedCostRow) : cost)),
    );
    setEditingId(null);
    setMessage("Custo fixo salvo.");
  }

  async function toggleActive(cost: FixedCostRow) {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("fixed_costs")
      .update({ active: !cost.active })
      .eq("id", cost.id)
      .eq("business_id", businessId)
      .select("id, name, category, amount, active")
      .single();

    if (updateError) {
      setError("Nao foi possivel alterar o status do custo.");
      return;
    }

    setFixedCosts((current) =>
      current.map((item) => (item.id === cost.id ? (data as FixedCostRow) : item)),
    );
  }

  async function deleteFixedCost(cost: FixedCostRow) {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("fixed_costs")
      .delete()
      .eq("id", cost.id)
      .eq("business_id", businessId);

    if (deleteError) {
      setError("Nao foi possivel remover o custo fixo.");
      return;
    }

    setFixedCosts((current) => current.filter((item) => item.id !== cost.id));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Custos fixos ativos" value={formatCurrency(summary.total)} />
        <SummaryCard
          label="Percentual do faturamento"
          value={summary.percentage == null ? "Informe faturamento" : `${(summary.percentage * 100).toFixed(2)}%`}
        />
        <SummaryCard label="Mensalidade iFood inclusa" value={formatCurrency(ifoodMonthlyFee)} />
      </div>

      {averageMonthlyRevenue <= 0 ? (
        <Alert>
          <AlertDescription>
            Informe faturamento medio para calcular preco com custos fixos.
          </AlertDescription>
        </Alert>
      ) : null}

      {summary.isHigh ? (
        <Alert variant="destructive">
          <AlertDescription>
            Seu custo fixo esta alto em relacao ao faturamento medio. Os precos
            sugeridos podem ficar elevados.
          </AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form
        onSubmit={createForm.handleSubmit(createFixedCost)}
        className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_1fr_160px_auto_auto]"
      >
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" {...createForm.register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Input id="category" {...createForm.register("category")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Valor</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            {...createForm.register("amount", { valueAsNumber: true })}
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" {...createForm.register("active")} />
          Ativo
        </label>
        <Button type="submit" className="self-end">
          <Plus />
          Criar
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3 font-medium">Nome</th>
              <th className="p-3 font-medium">Categoria</th>
              <th className="p-3 font-medium">Valor</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {fixedCosts.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                  Cadastre seu primeiro custo fixo.
                </td>
              </tr>
            ) : (
              fixedCosts.map((cost) =>
                editingId === cost.id ? (
                  <tr key={cost.id} className="border-t">
                    <td colSpan={5} className="p-3">
                      <form
                        onSubmit={editForm.handleSubmit(saveEditing)}
                        className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto_auto]"
                      >
                        <Input {...editForm.register("name")} />
                        <Input {...editForm.register("category")} />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...editForm.register("amount", { valueAsNumber: true })}
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" {...editForm.register("active")} />
                          Ativo
                        </label>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                          <Button type="submit">Salvar</Button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={cost.id} className="border-t">
                    <td className="p-3">{cost.name}</td>
                    <td className="p-3 text-muted-foreground">{cost.category || "-"}</td>
                    <td className="p-3">{formatCurrency(cost.amount)}</td>
                    <td className="p-3">{cost.active ? "Ativo" : "Inativo"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => toggleActive(cost)}>
                          {cost.active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => startEditing(cost)}>
                          <Pencil />
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => deleteFixedCost(cost)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ),
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
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
