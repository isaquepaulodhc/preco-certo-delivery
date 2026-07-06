"use client";

import { type ComponentType } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, HeartPulse, Info } from "lucide-react";

import {
  type OperationHealthReport,
  type OperationHealthStatus,
} from "@/lib/calculations/operation-health";

export type HealthFilter = "loss" | "attention" | "healthy" | "incomplete";

type OperationHealthIndicatorProps = {
  report: OperationHealthReport;
  activeFilter?: HealthFilter;
  onFilterChange?: (filter: HealthFilter) => void;
  showCounters?: boolean;
};

const healthView: Record<
  OperationHealthStatus,
  {
    label: string;
    description: string;
    className: string;
    iconClassName: string;
    badgeClassName: string;
    scoreClassName: string;
    tip: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  neutral: {
    label: "Neutro",
    description: "Ainda faltam dados para medir a margem dos itens ativos.",
    className: "border-[#E2E8F0] bg-white",
    iconClassName: "bg-slate-100 text-[#64748B]",
    badgeClassName: "bg-slate-100 text-[#64748B]",
    scoreClassName: "text-[#64748B]",
    tip: "Cadastre custos e preços para liberar uma leitura confiável da precificação.",
    icon: Info,
  },
  red: {
    label: "Prejuízo",
    description: "Existe pelo menos um item ativo com lucro líquido estimado menor ou igual a zero.",
    className: "border-[#FECACA] bg-white",
    iconClassName: "bg-[#FEF2F2] text-[#DC2626]",
    badgeClassName: "bg-[#DC2626] text-white",
    scoreClassName: "text-[#DC2626]",
    tip: "Priorize os itens em prejuízo antes de buscar otimizações finas.",
    icon: CircleAlert,
  },
  yellow: {
    label: "Atenção",
    description: "Há itens abaixo da margem desejada ou dados incompletos relevantes.",
    className: "border-[#FED7AA] bg-white",
    iconClassName: "bg-[#FFF7ED] text-[#F97316]",
    badgeClassName: "bg-[#F59E0B] text-white",
    scoreClassName: "text-[#F97316]",
    tip: "Revise itens sem custo calculado e produtos abaixo da margem desejada.",
    icon: AlertTriangle,
  },
  green: {
    label: "Saudável",
    description: "Todos os itens ativos avaliáveis estão na margem desejada.",
    className: "border-[#BBF7D0] bg-white",
    iconClassName: "bg-[#F0FDF4] text-[#16A34A]",
    badgeClassName: "bg-[#16A34A] text-white",
    scoreClassName: "text-[#16A34A]",
    tip: "Mantenha o acompanhamento ao atualizar custos, combos ou taxas.",
    icon: CheckCircle2,
  },
};

export function OperationHealthIndicator({
  report,
  activeFilter,
  onFilterChange,
  showCounters = true,
}: OperationHealthIndicatorProps) {
  const view = healthView[report.status];
  const Icon = view.icon;
  const score = calculatePricingHealthScore(report);
  const scoreValue = score ?? 0;

  return (
    <section className={`rounded-[24px] border p-6 shadow-sm ${view.className}`}>
      <div
        className={
          showCounters
            ? "grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-center"
            : "min-h-[260px]"
        }
      >
        <div className="min-w-0">
          <span className={`mb-4 flex size-11 items-center justify-center rounded-2xl ${view.iconClassName}`}>
            <Icon className="size-5" />
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-extrabold text-[#0F172A]">Saúde da precificação</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${view.badgeClassName}`}>
              {view.label}
            </span>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className={`text-[58px] font-extrabold leading-none ${view.scoreClassName}`}>
              {score == null ? "--" : score}
            </span>
            <span className="pb-1.5 text-[22px] font-bold text-[#64748B]">/100</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div
              className="h-full rounded-full bg-[#F97316] transition-all"
              style={{ width: `${scoreValue}%` }}
            />
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#64748B]">
            {view.description}
          </p>
          <div className="mt-5 flex flex-col gap-3 rounded-[16px] border border-[#FED7AA] bg-[#FFF7ED] p-3.5 text-sm text-[#7C2D12] sm:flex-row sm:items-center">
            <HeartPulse className="size-4 shrink-0 text-[#F97316]" />
            <span>
              <strong>Dica:</strong> {view.tip}
            </span>
          </div>
        </div>

        {showCounters ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <HealthCount
              filter="loss"
              label="Prejuízo"
              value={report.lossItems.length}
              tone="red"
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
            />
            <HealthCount
              filter="attention"
              label="Atenção"
              value={report.belowMarginItems.length}
              tone="yellow"
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
            />
            <HealthCount
              filter="healthy"
              label="Saudáveis"
              value={report.healthyItems.length}
              tone="green"
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
            />
            <HealthCount
              filter="incomplete"
              label="Incompletos"
              value={report.incompleteItems.length}
              tone="neutral"
              activeFilter={activeFilter}
              onFilterChange={onFilterChange}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HealthCount({
  filter,
  label,
  value,
  tone,
  activeFilter,
  onFilterChange,
}: {
  filter: HealthFilter;
  label: string;
  value: number;
  tone: "red" | "yellow" | "green" | "neutral";
  activeFilter?: HealthFilter;
  onFilterChange?: (filter: HealthFilter) => void;
}) {
  const isActive = activeFilter === filter;
  const tones = {
    red: "text-[#DC2626] bg-[#FEF2F2]",
    yellow: "text-[#F59E0B] bg-[#FFF7ED]",
    green: "text-[#16A34A] bg-[#F0FDF4]",
    neutral: "text-[#64748B] bg-slate-100",
  };

  return (
    <button
      type="button"
      onClick={() => onFilterChange?.(filter)}
      className={`rounded-[18px] border bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#F97316]/50 hover:shadow-md ${
        isActive ? "border-[#F97316] ring-2 ring-[#F97316]/15" : "border-[#E2E8F0]"
      }`}
      aria-pressed={isActive}
    >
      <span className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>
        {label}
      </span>
      <p className="mt-2 text-[22px] font-extrabold text-[#0F172A]">{value}</p>
    </button>
  );
}

function calculatePricingHealthScore(report: OperationHealthReport) {
  if (report.evaluableItems.length === 0) {
    return null;
  }

  const itemScores: number[] = report.items.map((item) => {
    if (item.status === "healthy") {
      return 100;
    }

    if (item.status === "warning") {
      return 65;
    }

    if (item.status === "danger") {
      return 40;
    }

    if (item.status === "incomplete") {
      return 45;
    }

    return 0;
  });

  return Math.round(
    itemScores.reduce((total, score) => total + score, 0) / itemScores.length,
  );
}
