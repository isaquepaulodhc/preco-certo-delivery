"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { type UseFormReturn, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateFixedCostPercentage,
  calculateFixedCostsTotal,
} from "@/lib/calculations/fixed-costs";
import { formatCurrency } from "@/lib/calculations/money";
import { createClient } from "@/lib/supabase/client";
import {
  FIXED_COST_NAME_OPTIONS,
  FIXED_COST_OTHER_OPTION,
  fixedCostSchema,
  type FixedCostInput,
} from "@/lib/validations/fixed-costs";

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
    defaultValues: {
      name: "",
      customName: "",
      category: "",
      amount: 0,
      active: true,
    },
  });
  const editForm = useForm<FixedCostInput>({
    resolver: zodResolver(fixedCostSchema),
    defaultValues: {
      name: "",
      customName: "",
      category: "",
      amount: 0,
      active: true,
    },
  });

  const summary = useMemo(() => {
    const total = calculateFixedCostsTotal(fixedCosts, ifoodMonthlyFee);
    const percentage = calculateFixedCostPercentage(total, averageMonthlyRevenue);

    return {
      total,
      percentage,
      risk: getFixedCostRiskView(percentage),
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
        name: resolveFixedCostName(values),
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
    createForm.reset({
      name: "",
      customName: "",
      category: "",
      amount: 0,
      active: true,
    });
    setMessage("Custo fixo criado.");
  }

  function startEditing(cost: FixedCostRow) {
    setEditingId(cost.id);
    const nameSelection = getNameSelection(cost.name);
    editForm.reset({
      name: nameSelection.name,
      customName: nameSelection.customName,
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
        name: resolveFixedCostName(values),
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
        <SummaryCard
          label="Custos fixos ativos"
          value={formatCurrency(summary.total)}
          detail="Inclui mensalidade iFood configurada"
        />
        <SummaryCard
          label="Percentual do faturamento"
          value={summary.percentage == null ? "Informe faturamento" : `${(summary.percentage * 100).toFixed(2)}%`}
          detail={summary.risk.label}
          tone={summary.risk.tone}
        />
        <SummaryCard
          label="Mensalidade iFood inclusa"
          value={formatCurrency(ifoodMonthlyFee)}
          detail="Somada ao total fixo mensal"
        />
      </div>

      {averageMonthlyRevenue <= 0 ? (
        <Alert>
          <AlertDescription>
            Informe faturamento medio para calcular preco com custos fixos.
          </AlertDescription>
        </Alert>
      ) : null}

      {summary.percentage != null ? (
        <div className={`rounded-[20px] border p-4 text-sm leading-6 ${summary.risk.className}`}>
          <p className="font-extrabold">{summary.risk.label}</p>
          <p className="mt-1">{summary.risk.description}</p>
        </div>
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
        className="rounded-[24px] border border-[#E2E8F0] bg-white p-5 shadow-sm"
      >
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-[#0F172A]">Novo custo fixo</h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Use uma opção comum ou escolha Outros para informar um nome próprio.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_160px_auto_auto]">
          <FixedCostNameFields form={createForm} idPrefix="create" />
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
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-[#0F172A]">
            <input type="checkbox" {...createForm.register("active")} />
            Ativo
          </label>
          <Button
            type="submit"
            className="h-9 self-end rounded-xl bg-[#F97316] font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-[#EA580C]"
          >
            <Plus />
            Criar
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-[24px] border border-[#E2E8F0] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] text-left">
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
                        className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_160px_auto_auto]"
                      >
                        <FixedCostNameFields form={editForm} idPrefix={`edit-${cost.id}`} compact />
                        <Input {...editForm.register("category")} />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...editForm.register("amount", { valueAsNumber: true })}
                        />
                        <label className="flex items-center gap-2 text-sm font-medium">
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
                    <td className="p-3 font-semibold text-[#0F172A]">{cost.name}</td>
                    <td className="p-3 text-muted-foreground">{cost.category || "-"}</td>
                    <td className="p-3">{formatCurrency(cost.amount)}</td>
                    <td className="p-3">
                      <StatusBadge active={cost.active} />
                    </td>
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

function FixedCostNameFields({
  form,
  idPrefix,
  compact = false,
}: {
  form: UseFormReturn<FixedCostInput>;
  idPrefix: string;
  compact?: boolean;
}) {
  const selectedName = useWatch({ control: form.control, name: "name" });

  return (
    <>
      <div className={compact ? "space-y-1" : "space-y-2"}>
        {!compact ? <Label htmlFor={`${idPrefix}-name`}>Nome</Label> : null}
        <select
          id={`${idPrefix}-name`}
          aria-label={compact ? "Nome" : undefined}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          {...form.register("name")}
        >
          <option value="">Selecione</option>
          {FIXED_COST_NAME_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        ) : null}
      </div>

      {selectedName === FIXED_COST_OTHER_OPTION ? (
        <div className={compact ? "space-y-1" : "space-y-2"}>
          {!compact ? (
            <Label htmlFor={`${idPrefix}-customName`}>Nome personalizado</Label>
          ) : null}
          <Input
            id={`${idPrefix}-customName`}
            aria-label={compact ? "Nome personalizado" : undefined}
            placeholder="Digite o nome"
            {...form.register("customName")}
          />
          {form.formState.errors.customName ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.customName.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function resolveFixedCostName(values: FixedCostInput) {
  return values.name === FIXED_COST_OTHER_OPTION
    ? values.customName?.trim() ?? ""
    : values.name;
}

function getNameSelection(name: string) {
  if (
    FIXED_COST_NAME_OPTIONS.some(
      (option) => option !== FIXED_COST_OTHER_OPTION && option === name,
    )
  ) {
    return { name, customName: "" };
  }

  return { name: FIXED_COST_OTHER_OPTION, customName: name };
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        active
          ? "bg-[#F0FDF4] text-[#16A34A]"
          : "bg-slate-100 text-[#64748B]"
      }`}
    >
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function getFixedCostRiskView(percentage: number | null) {
  if (percentage == null) {
    return {
      label: "Sem faturamento",
      description: "Informe o faturamento médio para medir o peso dos custos fixos.",
      tone: "neutral" as const,
      className: "border-[#E2E8F0] bg-white text-[#64748B]",
    };
  }

  if (percentage <= 0.2) {
    return {
      label: "Saudável",
      description: "Custos fixos dentro de uma faixa saudável para o faturamento informado.",
      tone: "green" as const,
      className: "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]",
    };
  }

  if (percentage <= 0.3) {
    return {
      label: "Atenção leve",
      description:
        "Custos fixos acima de 20% do faturamento pedem acompanhamento mais próximo.",
      tone: "yellow" as const,
      className: "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]",
    };
  }

  if (percentage <= 0.4) {
    return {
      label: "Alerta",
      description:
        "Seus custos fixos estão consumindo uma parte relevante do faturamento. Revise despesas recorrentes e acompanhe se o volume de vendas atual sustenta essa estrutura.",
      tone: "orange" as const,
      className: "border-[#FED7AA] bg-[#FFF7ED] text-[#7C2D12]",
    };
  }

  return {
    label: "Crítico",
    description:
      "Custos fixos acima de 40% do faturamento podem comprometer fortemente a margem. Avalie redução de despesas ou aumento de faturamento antes de reajustar preços de forma brusca.",
    tone: "red" as const,
    className: "border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]",
  };
}

function SummaryCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "green" | "yellow" | "orange" | "red";
}) {
  const toneClassName = {
    neutral: "bg-slate-100 text-[#64748B]",
    green: "bg-[#F0FDF4] text-[#16A34A]",
    yellow: "bg-[#FFFBEB] text-[#D97706]",
    orange: "bg-[#FFF7ED] text-[#EA580C]",
    red: "bg-[#FEF2F2] text-[#DC2626]",
  };

  return (
    <div className="rounded-[20px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#64748B]">{label}</p>
      <p className="mt-2 text-[22px] font-extrabold text-[#0F172A]">{value}</p>
      {detail ? (
        <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${toneClassName[tone]}`}>
          {detail}
        </span>
      ) : null}
    </div>
  );
}
