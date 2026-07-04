"use client";

import { useMemo, useState } from "react";

import {
  OperationHealthIndicator,
  type HealthFilter,
} from "@/components/dashboard/operation-health-indicator";
import { MenuMarginDiagnosis } from "@/components/dashboard/menu-margin-diagnosis";
import { type OperationHealthReport } from "@/lib/calculations/operation-health";

type OperationHealthDashboardProps = {
  report: OperationHealthReport;
};

export function OperationHealthDashboard({ report }: OperationHealthDashboardProps) {
  const defaultFilter = useMemo(() => getDefaultHealthFilter(report), [report]);
  const [activeFilter, setActiveFilter] = useState<HealthFilter>(defaultFilter);

  function handleFilterChange(filter: HealthFilter) {
    setActiveFilter(filter);
    window.setTimeout(() => {
      document
        .getElementById("menu-margin-diagnosis")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  return (
    <div className="space-y-6">
      <OperationHealthIndicator
        report={report}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />
      <div id="menu-margin-diagnosis" className="scroll-mt-6">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Diagnostico de Margem do Cardapio
          </p>
          <h2 className="mt-1 text-2xl font-semibold">Itens que precisam de atencao</h2>
        </div>
        <MenuMarginDiagnosis report={report} activeFilter={activeFilter} />
      </div>
    </div>
  );
}

function getDefaultHealthFilter(report: OperationHealthReport): HealthFilter {
  if (report.lossItems.length > 0) {
    return "loss";
  }

  if (report.belowMarginItems.length > 0) {
    return "attention";
  }

  if (report.incompleteItems.length > 0) {
    return "incomplete";
  }

  return "healthy";
}
