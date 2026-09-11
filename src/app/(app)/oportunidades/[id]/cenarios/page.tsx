import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { Card, Money, Notice, Pct, Table } from "@/components/ui";
import { formatBRL } from "@/domain/money";

export default async function ScenariosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { analysis: a, profile } = ctx;
  if (!a.scenarios || !a.sensitivityPriceMonths || !a.sensitivityPriceRenovation) {
    return <Notice tone="warn">Sem valuation: cadastre comparáveis para gerar cenários.</Notice>;
  }
  const s = a.scenarios;
  const pm = a.sensitivityPriceMonths;
  const pr = a.sensitivityPriceRenovation;

  const roiTone = (roi: number | null) => (roi === null ? "" : roi >= profile.targetRoi ? "text-ok" : roi >= profile.minRoi ? "text-warn" : "text-bad");

  return (
    <div className="space-y-4">
      <Card title="Cenários" subtitle="Variáveis: valor de venda, prazo, reforma, desocupação e custos. Δ vs base mostra o que se perde (loss framing).">
        <Table>
          <thead>
            <tr>
              <th></th>
              {s.map((x) => (
                <th key={x.key} className="text-right">
                  {x.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Valor de venda</td>
              {s.map((x) => (
                <td key={x.key} className="text-right">
                  <Money cents={x.assumptions.exitValue} />
                  <div className="text-xxs text-fg-faint">{x.assumptions.exitLabel}</div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Prazo total (meses)</td>
              {s.map((x) => (
                <td key={x.key} className="text-right font-mono">
                  {x.assumptions.months}
                </td>
              ))}
            </tr>
            <tr>
              <td>Reforma</td>
              {s.map((x) => (
                <td key={x.key} className="text-right">
                  <Money cents={x.assumptions.renovation} />
                  <div className="text-xxs text-fg-faint">{x.assumptions.renovationLabel}</div>
                </td>
              ))}
            </tr>
            <tr>
              <td>Desocupação (meses)</td>
              {s.map((x) => (
                <td key={x.key} className="text-right font-mono">
                  {x.assumptions.evictionMonths}
                </td>
              ))}
            </tr>
            <tr>
              <td>Multiplicador de custos</td>
              {s.map((x) => (
                <td key={x.key} className="text-right font-mono">
                  ×{x.assumptions.costMultiplier.toFixed(2)}
                </td>
              ))}
            </tr>
            <tr className="border-t border-line-strong font-medium">
              <td>Lucro líquido</td>
              {s.map((x) => (
                <td key={x.key} className="text-right">
                  <Money cents={x.underwriting.metrics.netProfit} />
                </td>
              ))}
            </tr>
            <tr>
              <td>Δ vs base</td>
              {s.map((x) => (
                <td key={x.key} className="text-right">
                  {x.key === "BASE" ? <span className="text-fg-faint">—</span> : <Money cents={x.profitDeltaVsBase} signed />}
                </td>
              ))}
            </tr>
            <tr>
              <td>ROI</td>
              {s.map((x) => (
                <td key={x.key} className={`text-right ${roiTone(x.underwriting.metrics.roi)}`}>
                  <Pct value={x.underwriting.metrics.roi} />
                </td>
              ))}
            </tr>
            <tr>
              <td>ROE</td>
              {s.map((x) => (
                <td key={x.key} className="text-right">
                  <Pct value={x.underwriting.metrics.roe} />
                </td>
              ))}
            </tr>
            <tr>
              <td>TIR anual</td>
              {s.map((x) => (
                <td key={x.key} className="text-right">
                  <Pct value={x.underwriting.metrics.irrAnnual} digits={0} />
                </td>
              ))}
            </tr>
            <tr>
              <td>Capital necessário</td>
              {s.map((x) => (
                <td key={x.key} className="text-right">
                  <Money cents={x.underwriting.metrics.capitalNeeded} />
                </td>
              ))}
            </tr>
          </tbody>
        </Table>
        <p className="mt-2 text-xxs text-fg-faint">
          Verde ≥ ROI alvo ({(profile.targetRoi * 100).toFixed(0)}%) · âmbar ≥ ROI mínimo ({(profile.minRoi * 100).toFixed(0)}%) · vermelho abaixo do mínimo.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Sensibilidade · ROI: preço de venda × prazo">
          <Table>
            <thead>
              <tr>
                <th>Δ preço</th>
                {pm.cols.map((c) => (
                  <th key={c} className="text-right">
                    {c} m
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pm.cells.map((row, i) => (
                <tr key={i}>
                  <td className="font-mono">
                    {pm.rows[i]! > 0 ? "+" : ""}
                    {(pm.rows[i]! * 100).toFixed(0)}%
                  </td>
                  {row.map((c, j) => (
                    <td key={j} className={`text-right ${roiTone(c.roi)}`}>
                      <Pct value={c.roi} digits={0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card title="Sensibilidade · lucro: preço de venda × reforma">
          <Table>
            <thead>
              <tr>
                <th>Δ preço</th>
                {pr.cols.map((c, j) => (
                  <th key={j} className="text-right">
                    {["baixa", "provável", "alta"][j]} {formatBRL(c).replace("R$ ", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pr.cells.map((row, i) => (
                <tr key={i}>
                  <td className="font-mono">
                    {pr.rows[i]! > 0 ? "+" : ""}
                    {(pr.rows[i]! * 100).toFixed(0)}%
                  </td>
                  {row.map((c, j) => (
                    <td key={j} className="text-right">
                      <Money cents={c.netProfit} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
