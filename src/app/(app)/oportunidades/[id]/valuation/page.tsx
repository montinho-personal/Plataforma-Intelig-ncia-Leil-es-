import { notFound } from "next/navigation";
import { requireUser, can } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { updateAnalysisSettingsAction } from "@/server/actions/analysis";
import { btnGhost, Card, ConfidenceBar, Epistemic, Money, Notice, Table } from "@/components/ui";
import { EXIT_HORIZONS } from "@/domain/types";

export default async function ValuationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { analysis: a, property: p, profile } = ctx;
  const v = a.valuation;
  const editable = can(user, "editAnalysis");
  const curve = profile.valuation.liquidityCurve[v.liquidityClass];

  if (!v.marketValue) {
    return (
      <Card>
        <p className="text-xs text-fg-muted">Sem comparáveis válidos. Cadastre comparáveis para calcular o valuation.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {v.status !== "OK" && (
        <Notice tone={v.status === "ATYPICAL" ? "bad" : "warn"}>
          {v.status === "INSUFFICIENT_DATA" ? "DADOS INSUFICIENTES PARA VALUATION CONFIÁVEL — " : ""}
          {v.statusReasons.join(" · ")}. Os números abaixo são exibidos para transparência, mas não alimentam o lance máximo sem override justificado.
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Valores" subtitle="Valor de mercado ≠ valor de saída. O teto usa o valor de saída no prazo-alvo.">
          <Table>
            <tbody>
              <tr>
                <td>Preço anunciado (mediana dos comparáveis)</td>
                <td className="text-right">
                  <Money cents={v.askingReference} />
                </td>
                <td className="text-xxs text-fg-faint">referência, não é valor</td>
              </tr>
              {p.auction?.appraisalValue ? (
                <tr>
                  <td>Avaliação do edital</td>
                  <td className="text-right">
                    <Money cents={p.auction.appraisalValue} />
                  </td>
                  <td className="text-xxs text-fg-faint">
                    <Epistemic status="FACT" /> edital · <span className="text-warn">ignorado no valuation</span>
                  </td>
                </tr>
              ) : null}
              <tr className="font-medium">
                <td>Valor de mercado (estado atual)</td>
                <td className="text-right">
                  <Money cents={v.marketValue.amount} />
                </td>
                <td className="text-xxs text-fg-muted">
                  <Epistemic status="ESTIMATE" /> <Money cents={v.marketValue.low} compact /> – <Money cents={v.marketValue.high} compact />
                </td>
              </tr>
              <tr>
                <td>Conservador</td>
                <td className="text-right">
                  <Money cents={v.conservative} />
                </td>
                <td className="text-xxs text-fg-faint">P25 ponderado</td>
              </tr>
              <tr>
                <td>Provável de venda</td>
                <td className="text-right">
                  <Money cents={v.probableSale} />
                </td>
                <td className="text-xxs text-fg-faint">
                  <Epistemic status="HYPOTHESIS" /> −{(profile.valuation.investorExitMargin * 100).toFixed(0)}% concessão do investidor
                </td>
              </tr>
              <tr>
                <td>Venda rápida (30 d)</td>
                <td className="text-right">
                  <Money cents={v.quickSale} />
                </td>
                <td className="text-xxs text-fg-faint">liquidez {v.liquidityClass} −{(curve[30] * 100).toFixed(0)}%</td>
              </tr>
              <tr>
                <td>Otimista</td>
                <td className="text-right">
                  <Money cents={v.optimistic} />
                </td>
                <td className="text-xxs text-fg-faint">P75 ponderado</td>
              </tr>
              {v.postRenovationMarket && (
                <tr className="font-medium">
                  <td>Valor de mercado pós-reforma ({a.renovation.level})</td>
                  <td className="text-right">
                    <Money cents={v.postRenovationMarket.amount} />
                  </td>
                  <td className="text-xxs text-fg-muted">
                    <Epistemic status="HYPOTHESIS" /> estado após reforma · <Money cents={v.postRenovationMarket.low} compact /> – <Money cents={v.postRenovationMarket.high} compact />
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>

        <Card title="Valor de saída do investidor por prazo" subtitle={`Base: ${v.postRenovationMarket ? "provável pós-reforma" : "provável no estado atual"} × (1 − desconto de liquidez ${v.liquidityClass})`}>
          <Table>
            <thead>
              <tr>
                <th>Prazo</th>
                <th className="text-right">Desconto</th>
                <th className="text-right">Saída</th>
                <th className="text-right">Faixa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...EXIT_HORIZONS].reverse().map((h) => {
                const e = v.exitValues![h];
                const active = h === a.exitHorizonDays;
                return (
                  <tr key={h} className={active ? "bg-accent/5 font-medium" : ""}>
                    <td className="font-mono">{h} d</td>
                    <td className="text-right font-mono text-fg-muted">−{(curve[h] * 100).toFixed(0)}%</td>
                    <td className="text-right">
                      <Money cents={e.amount} />
                    </td>
                    <td className="text-right text-xxs text-fg-muted">
                      <Money cents={e.low} compact /> – <Money cents={e.high} compact />
                    </td>
                    <td className="text-xxs">
                      {active ? (
                        <span className="text-accent">◀ prazo-alvo · usado no teto</span>
                      ) : editable ? (
                        <form action={updateAnalysisSettingsAction.bind(null, id)}>
                          <input type="hidden" name="exitHorizonDays" value={h} />
                          <button className="text-fg-faint hover:text-fg">usar</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <p className="mt-2 text-xxs text-fg-faint">A curva de liquidez é uma hipótese do perfil (Configurações › Perfil). Com histórico do grupo (Fase 5), passa a ser calibrada por dados próprios.</p>
        </Card>
      </div>

      <Card title={`Confiança da estimativa: ${v.confidence}%`} subtitle="Base 40 + fatores. Dados insuficientes limitam a 40; caso atípico a 50.">
        <div className="mb-3">
          <ConfidenceBar value={v.confidence} />
        </div>
        <Table>
          <tbody>
            {v.confidenceFactors.map((f) => (
              <tr key={f.label}>
                <td>{f.label}</td>
                <td className={`text-right font-mono ${f.value > 0 ? "text-ok" : f.value < 0 ? "text-bad" : "text-fg-faint"}`}>
                  {f.value > 0 ? "+" : ""}
                  {f.value}
                </td>
                <td className="text-xxs text-fg-faint">{f.note}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <div className="mt-3 text-xxs text-fg-faint">
          Premissas: {v.assumptions.map((x) => `${x.label} ${x.value ? `${(x.value * 100).toFixed(0)}%` : ""} ${x.note ? `(${x.note})` : ""}`).join(" · ")}
        </div>
        {editable && (
          <p className="mt-2 text-xxs text-fg-faint">
            Para ajustar coeficientes e curva de liquidez: <a className="text-accent" href="/config/perfil">Perfil de investimento</a>. <span className={btnGhost + " hidden"} />
          </p>
        )}
      </Card>
    </div>
  );
}
