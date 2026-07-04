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
    title: "Itens em prejuizo",
    description: "Itens ativos com lucro liquido estimado menor ou igual a zero.",
    emptyText: "Nenhum item avaliavel em prejuizo.",
  },
  attention: {
    title: "Itens em atencao",
    description: "Itens avaliaveis abaixo da margem desejada.",
    emptyText: "Nenhum item avaliavel abaixo da margem desejada.",
  },
  healthy: {
    title: "Itens saudaveis",
    description: "Itens avaliaveis com margem liquida estimada dentro da meta.",
    emptyText: "Nenhum item saudavel ainda.",
  },
  incomplete: {
    title: "Dados incompletos",
    description: "Itens ativos que nao podem ser avaliados sem custo, preco ou faturamento medio.",
    emptyText: "Nenhum item ativo com dados incompletos.",
  },
};

export function MenuMarginDiagnosis({ report, activeFilter }: MenuMarginDiagnosisProps) {
  const view = diagnosisView[activeFilter];
  const items = getItemsByFilter(report, activeFilter);

  return (
    <section className="rounded-lg border bg-background">
      <div className="border-b px-4 py-3">
        <h3 className="font-medium">{view.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{view.description}</p>
      </div>
      {items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{view.emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3 font-medium">Item</th>
                <th className="p-3 font-medium">Tipo</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Preco atual</th>
                <th className="p-3 font-medium">Custo seguro</th>
                <th className="p-3 font-medium">Margem liquida</th>
                <th className="p-3 font-medium">Sugerido proprio</th>
                <th className="p-3 font-medium">Sugerido iFood</th>
                <th className="p-3 font-medium">Dif.</th>
                <th className="p-3 font-medium">Motivo</th>
                <th className="p-3 font-medium">Acoes</th>
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

  return (
    <tr className="border-t align-top">
      <td className="p-3 font-medium">{item.name}</td>
      <td className="p-3">{item.type === "product" ? "Produto" : "Combo"}</td>
      <td className="p-3">{getStatusLabel(item.status)}</td>
      <td className="p-3">{formatCurrency(item.sellingPrice)}</td>
      <td className="p-3">{item.safeCost == null ? "-" : formatCurrency(item.safeCost)}</td>
      <td className="p-3">
        {item.estimatedNetMargin == null
          ? "-"
          : `${(item.estimatedNetMargin * 100).toFixed(2)}%`}
      </td>
      <td className="p-3">
        {item.suggestedOwnChannelPrice.status === "ready"
          ? formatCurrency(item.suggestedOwnChannelPrice.price)
          : "-"}
      </td>
      <td className="p-3">
        {item.suggestedIfoodPrice.status === "ready"
          ? formatCurrency(item.suggestedIfoodPrice.price)
          : "-"}
      </td>
      <td className="p-3">
        {item.ownChannelPriceDifference == null
          ? "-"
          : formatCurrency(item.ownChannelPriceDifference)}
      </td>
      <td className="max-w-[260px] p-3 text-muted-foreground">{item.alertReason}</td>
      <td className="p-3">
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-md border px-2 py-1 text-xs hover:bg-muted" href={detailHref}>
            Abrir
          </Link>
          {item.safeCost == null ? null : (
            <Link
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
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

function getStatusLabel(status: EvaluatedOperationItem["status"]) {
  const labels: Record<EvaluatedOperationItem["status"], string> = {
    incomplete: "Incompleto",
    loss: "Prejuizo",
    danger: "Perigoso",
    warning: "Atencao",
    healthy: "Saudavel",
  };

  return labels[status];
}
