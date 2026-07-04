"use client";

import { type ComponentType } from "react";
import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";

import { type OperationHealthReport, type OperationHealthStatus } from "@/lib/calculations/operation-health";

export type HealthFilter = "loss" | "attention" | "healthy" | "incomplete";

type OperationHealthIndicatorProps = {
  report: OperationHealthReport;
  activeFilter?: HealthFilter;
  onFilterChange?: (filter: HealthFilter) => void;
};

const healthView: Record<
  OperationHealthStatus,
  {
    label: string;
    description: string;
    className: string;
    iconClassName: string;
    badgeClassName: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  neutral: {
    label: "Neutro",
    description: "Ainda faltam dados para avaliar a margem liquida do cardapio.",
    className: "border-[#E2E8F0] bg-white",
    iconClassName: "bg-slate-100 text-[#64748B]",
    badgeClassName: "bg-slate-100 text-[#64748B]",
    icon: Info,
  },
  red: {
    label: "Vermelho",
    description: "Existe pelo menos um item ativo com lucro liquido estimado menor ou igual a zero.",
    className: "border-[#FECACA] bg-[#FEF2F2]",
    iconClassName: "bg-white text-[#DC2626]",
    badgeClassName: "bg-[#DC2626] text-white",
    icon: CircleAlert,
  },
  yellow: {
    label: "Amarelo",
    description: "Ha itens abaixo da margem desejada ou dados incompletos relevantes.",
    className: "border-[#FDE68A] bg-[#FFF7ED]",
    iconClassName: "bg-white text-[#F59E0B]",
    badgeClassName: "bg-[#F59E0B] text-white",
    icon: AlertTriangle,
  },
  green: {
    label: "Verde",
    description: "Todos os itens ativos avaliaveis estao na margem desejada.",
    className: "border-[#BBF7D0] bg-[#F0FDF4]",
    iconClassName: "bg-white text-[#16A34A]",
    badgeClassName: "bg-[#16A34A] text-white",
    icon: CheckCircle2,
  },
};

export function OperationHealthIndicator({
  report,
  activeFilter,
  onFilterChange,
}: OperationHealthIndicatorProps) {
  const view = healthView[report.status];
  const Icon = view.icon;

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${view.className}`}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <span className={`flex size-12 items-center justify-center rounded-2xl ${view.iconClassName}`}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#64748B]">Saude da Operacao</p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${view.badgeClassName}`}>
                {view.label}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#0F172A]">
              Diagnostico do cardapio
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#64748B]">
              {view.description}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <HealthCount
            filter="loss"
            label="Prejuizo"
            value={report.lossItems.length}
            tone="red"
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
          <HealthCount
            filter="attention"
            label="Atencao"
            value={report.belowMarginItems.length}
            tone="yellow"
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
          <HealthCount
            filter="healthy"
            label="Saudaveis"
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
      className={`rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#F97316]/50 hover:shadow-md ${
        isActive ? "border-[#F97316] ring-2 ring-[#F97316]/15" : "border-[#E2E8F0]"
      }`}
      aria-pressed={isActive}
    >
      <span className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>
        {label}
      </span>
      <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
    </button>
  );
}
