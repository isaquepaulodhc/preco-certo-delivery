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
  showDiagnosis?: boolean;
};

export function OperationHealthDashboard({
  report,
  showDiagnosis = true,
}: OperationHealthDashboardProps) {
  const defaultFilter = useMemo(() => getDefaultHealthFilter(report), [report]);
  const [activeFilter, setActiveFilter] = useState<HealthFilter>(defaultFilter);

  function handleFilterChange(filter: HealthFilter) {
    setActiveFilter(filter);

    if (!showDiagnosis) {
      return;
    }

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
        showCounters={showDiagnosis}
      />

      {showDiagnosis ? (
        <div id="menu-margin-diagnosis" className="scroll-mt-6">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#F97316]">
                Diagnóstico de margem do cardápio
              </p>
              <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">
                Itens que precisam de atenção
              </h2>
            </div>
            <p className="max-w-xl text-sm text-[#64748B]">
              Filtre por status e abra o produto, combo ou simulador para agir no preço.
            </p>
          </div>
          <MenuMarginDiagnosis report={report} activeFilter={activeFilter} />
        </div>
      ) : null}
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
