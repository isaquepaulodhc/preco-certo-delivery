import Link from "next/link";

import { type HealthFilter } from "@/components/dashboard/operation-health-indicator";
import { formatCurrency } from "@/lib/calculations/money";
import { type EvaluatedOperationItem, type OperationHealthReport } from "@/lib/calculations/operation-health";

type MenuMarginDiagnosisProps = {
  report: OperationHealthReport;
  activeFilter: HealthFilter;
};

const diagnosisView: Record<
  HealthFilter,
  { title: string; description: string; emptyText: string }
> = {
  loss: {
    title: "Itens em prejuízo",
    description: "Itens ativos com lucro líquido estimado menor ou igual a zero.",
    emptyText: "Nenhum item avaliável em prejuízo.",
  },
  attention: {
    title: "Itens em atenção",
    description: "Itens avaliáveis abaixo da margem desejada.",
    emptyText: "Nenhum item avaliável abaixo da margem desejada.",
  },
  healthy: {
    title: "Itens saudáveis",
    description: "Itens avaliáveis com margem líquida estimada dentro da meta.",
    emptyText: "Nenhum item saudável ainda.",
  },
  incomplete: {
    title: "Dados incompletos",
    description: "Itens ativos que não podem ser avaliados sem custo, preço ou faturamento médio.",
    emptyText: "Nenhum item ativo com dados incompletos.",
  },
};

export function MenuMarginDiagnosis({ report, activeFilter }: MenuMarginDiagnosisProps) {
  const view = diagnosisView[activeFilter];
  const items = getItemsByFilter(report, activeFilter);

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#E2E8F0] bg-white shadow-sm">
      <div className="border-b border-[#E2E8F0] px-5 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-[#0F172A]">{view.title}</h3>
            <p className="mt-1 text-sm text-[#64748B]">{view.description}</p>
          </div>
          <span className="w-fit rounded-full bg-[#F8FAFC] px-3 py-1 text-sm font-semibold text-[#64748B]">
            {items.length} item(ns)
          </span>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="p-5 text-sm text-[#64748B]">{view.emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-[#F8FAFC] text-left text-[#64748B]">
              <tr>
                <th className="p-3 font-medium">Item</th>
                <th className="p-3 font-medium">Tipo</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Preço atual</th>
                <th className="p-3 font-medium">Custo seguro</th>
                <th className="p-3 font-medium">Margem líquida</th>
                <th className="p-3 font-medium">Sugerido próprio</th>
                <th className="p-3 font-medium">Sugerido iFood</th>
                <th className="p-3 font-medium">Dif.</th>
                <th className="p-3 font-medium">Motivo</th>
                <th className="p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <DiagnosisRow key={`${item.type}-${item.id}`} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DiagnosisRow({ item }: { item: EvaluatedOperationItem }) {
  const detailHref =
    item.type === "product" ? `/products?focus=${item.id}` : `/combos?focus=${item.id}`;
  const simulatorHref = `/simulator?type=${item.type}&id=${item.id}`;
  const statusView = getStatusView(item.status);

  return (
    <tr className="border-t border-[#E2E8F0] align-top transition hover:bg-[#F8FAFC]">
      <td className="p-3 font-semibold text-[#0F172A]">{item.name}</td>
      <td className="p-3 text-[#64748B]">{item.type === "product" ? "Produto" : "Combo"}</td>
      <td className="p-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusView.className}`}>
          {statusView.label}
        </span>
      </td>
      <td className="p-3 font-semibold text-[#0F172A]">{formatCurrency(item.sellingPrice)}</td>
      <td className="p-3 text-[#64748B]">
        {item.safeCost == null ? "-" : formatCurrency(item.safeCost)}
      </td>
      <td className="p-3 text-[#64748B]">
        {item.estimatedNetMargin == null
          ? "-"
          : `${(item.estimatedNetMargin * 100).toFixed(2)}%`}
      </td>
      <td className="p-3 font-semibold text-[#0F172A]">
        {item.suggestedOwnChannelPrice.status === "ready"
          ? formatCurrency(item.suggestedOwnChannelPrice.price)
          : "-"}
      </td>
      <td className="p-3 text-[#64748B]">
        {item.suggestedIfoodPrice.status === "ready"
          ? formatCurrency(item.suggestedIfoodPrice.price)
          : "-"}
      </td>
      <td className="p-3 text-[#64748B]">
        {item.ownChannelPriceDifference == null
          ? "-"
          : formatCurrency(item.ownChannelPriceDifference)}
      </td>
      <td className="max-w-[280px] p-3 leading-5 text-[#64748B]">{item.alertReason}</td>
      <td className="p-3">
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-xl border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#0F172A] transition hover:border-[#F97316]/40 hover:bg-[#FFF7ED] hover:text-[#EA580C]"
            href={detailHref}
          >
            Abrir
          </Link>
          {item.safeCost == null ? null : (
            <Link
              className="rounded-xl bg-[#F97316] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#EA580C]"
              href={simulatorHref}
            >
              Simular
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

function getItemsByFilter(report: OperationHealthReport, filter: HealthFilter) {
  if (filter === "loss") {
    return report.lossItems;
  }

  if (filter === "attention") {
    return report.belowMarginItems;
  }

  if (filter === "healthy") {
    return report.healthyItems;
  }

  return report.incompleteItems;
}

function getStatusView(status: EvaluatedOperationItem["status"]) {
  const labels: Record<
    EvaluatedOperationItem["status"],
    { label: string; className: string }
  > = {
    incomplete: { label: "Incompleto", className: "bg-slate-100 text-[#64748B]" },
    loss: { label: "Prejuízo", className: "bg-[#FEF2F2] text-[#DC2626]" },
    danger: { label: "Perigoso", className: "bg-[#FEF2F2] text-[#DC2626]" },
    warning: { label: "Atenção", className: "bg-[#FFF7ED] text-[#F59E0B]" },
    healthy: { label: "Saudável", className: "bg-[#F0FDF4] text-[#16A34A]" },
  };

  return labels[status];
}
