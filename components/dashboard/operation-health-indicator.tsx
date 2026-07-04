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
    icon: ComponentType<{ className?: string }>;
  }
> = {
  neutral: {
    label: "Neutro",
    description: "Ainda faltam dados para avaliar a margem liquida do cardapio.",
    className: "border-muted-foreground/30 bg-muted/40",
    icon: Info,
  },
  red: {
    label: "Vermelho",
    description: "Existe pelo menos um item ativo com lucro liquido estimado menor ou igual a zero.",
    className: "border-destructive/40 bg-destructive/10",
    icon: CircleAlert,
  },
  yellow: {
    label: "Amarelo",
    description: "Ha itens abaixo da margem desejada ou dados incompletos relevantes.",
    className: "border-yellow-500/40 bg-yellow-500/10",
    icon: AlertTriangle,
  },
  green: {
    label: "Verde",
    description: "Todos os itens ativos avaliaveis estao na margem desejada.",
    className: "border-green-600/40 bg-green-600/10",
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
    <section className={`rounded-lg border p-4 ${view.className}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Saude da Operacao</p>
            <h2 className="text-2xl font-semibold">{view.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{view.description}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          <HealthCount
            filter="loss"
            label="Prejuizo"
            value={report.lossItems.length}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
          <HealthCount
            filter="attention"
            label="Atencao"
            value={report.belowMarginItems.length}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
          <HealthCount
            filter="healthy"
            label="Saudaveis"
            value={report.healthyItems.length}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
          />
          <HealthCount
            filter="incomplete"
            label="Incompletos"
            value={report.incompleteItems.length}
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
  activeFilter,
  onFilterChange,
}: {
  filter: HealthFilter;
  label: string;
  value: number;
  activeFilter?: HealthFilter;
  onFilterChange?: (filter: HealthFilter) => void;
}) {
  const isActive = activeFilter === filter;

  return (
    <button
      type="button"
      onClick={() => onFilterChange?.(filter)}
      className={`rounded-lg border bg-background px-3 py-2 text-center transition hover:border-foreground/40 ${
        isActive ? "border-foreground shadow-sm ring-2 ring-foreground/10" : ""
      }`}
      aria-pressed={isActive}
    >
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </button>
  );
}
