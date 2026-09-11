import { notFound } from "next/navigation";
import { requireUser, can } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { setMaxBidOverrideAction } from "@/server/actions/analysis";
import { btnGhost, Card, Field, Money, Notice, Pct, Table, Textarea } from "@/components/ui";
import { bidImpact } from "@/domain/maxBid";

export default async function MaxBidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { analysis: a, profile, property: p, settings } = ctx;
  const mb = a.maxBid;
  const exit = a.valuation.exitValues?.[a.exitHorizonDays] ?? null;

  if (!mb || !a.underwriting || !exit) return <Notice tone="warn">Sem valuation: cadastre comparáveis para calcular o lance máximo.</Notice>;

  const minBid = p.auction?.secondCallMinBid ?? p.auction?.firstCallMinBid ?? null;
  const ref = a.underwriting.input.bid;
  const uwInput = a.underwriting.input;
  const factory = (bid: number, exitValue: number) => ({ ...uwInput, bid, exitValue });
  const impact = ref > 0 && !mb.blocked ? bidImpact(factory, exit.amount, ref, ref + 5_000_00) : null;

  return (
    <div className="space-y-4">
      <Card
        title="Lance máximo — resolvido de trás para frente"
        subtitle={`Base: VALOR DE SAÍDA em ${a.exitHorizonDays} dias (${(exit.amount / 100).toLocaleString("pt-BR")}; conservador ${(exit.low / 100).toLocaleString("pt-BR")}) · perfil: ROI alvo ${(profile.targetRoi * 100).toFixed(0)}% · ROI mínimo ${(profile.minRoi * 100).toFixed(0)}%${profile.minProfit ? ` · lucro mínimo ${(profile.minProfit / 100).toLocaleString("pt-BR")}` : ""}${profile.maxCapital ? ` · capital máximo ${(profile.maxCapital / 100).toLocaleString("pt-BR")}` : ""}${profile.minIrrAnnual ? ` · TIR mínima ${(profile.minIrrAnnual * 100).toFixed(0)}%` : ""}`}
      >
        {mb.blocked ? (
          <Notice tone="bad">{mb.blockedReason}</Notice>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {mb.tiers.map((t) => {
                const tone = t.key === "IDEAL" ? "border-ok/50" : t.key === "COMFORTABLE" ? "border-accent/50" : t.key === "LIMIT" ? "border-warn/50" : "border-bad/60";
                return (
                  <div key={t.key} className={`rounded border ${tone} p-3`}>
                    <div className="text-xxs uppercase tracking-wider text-fg-faint">{t.label}</div>
                    <div className="mt-1 font-mono text-xl tabular-nums">
                      <Money cents={t.bid} />
                    </div>
                    <div className="mt-1 text-xxs text-fg-muted">{t.description}</div>
                    <div className="mt-1 text-xxs text-fg-faint">
                      restrição ativa: {t.bindingConstraint} · ROI <Pct value={t.underwriting.metrics.roi} /> · lucro <Money cents={t.underwriting.metrics.netProfit} compact /> · TIR <Pct value={t.underwriting.metrics.irrAnnual} digits={0} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs">
              Acima de <Money cents={mb.byKey.ABSOLUTE_MAX.bid} className="text-bad" />: <span className="font-semibold text-bad">NÃO ARREMATAR</span>.
              {minBid !== null && (
                <>
                  {" "}
                  Lance mínimo do edital <Money cents={minBid} /> → margem de segurança até o teto <Money cents={mb.byKey.ABSOLUTE_MAX.bid - minBid} signed />{" "}
                  {minBid > 0 && <span className="text-fg-faint">({(((mb.byKey.ABSOLUTE_MAX.bid - minBid) / minBid) * 100).toFixed(0)}%)</span>}.
                </>
              )}
            </p>
            {impact && (
              <p className="mt-1 text-xs text-fg-muted">
                Loss framing: cada R$ 5.000 a mais no lance de referência reduz o lucro esperado em <Money cents={-impact.profitDelta} /> (comissão, ITBI, registro, taxa e contingência acompanham) e o ROI de <Pct value={impact.roiFrom} /> para <Pct value={impact.roiTo} />.
              </p>
            )}
            {mb.warnings.map((w) => (
              <p key={w} className="mt-1 text-xxs text-warn">
                {w}
              </p>
            ))}
          </>
        )}
      </Card>

      {!mb.blocked && (
        <Card title="Como cada patamar foi resolvido" subtitle="Bisseção sobre o lance até o ROI igualar o exigido (tolerância R$ 1). Lucro mínimo, TIR mínima e capital máximo do perfil reduzem o teto quando ativos.">
          <Table>
            <thead>
              <tr>
                <th>Patamar</th>
                <th className="text-right">Valor de saída usado</th>
                <th className="text-right">Lance</th>
                <th className="text-right">Capital</th>
                <th className="text-right">Lucro</th>
                <th className="text-right">ROI</th>
                <th className="text-right">TIR</th>
                <th>Restrição ativa</th>
              </tr>
            </thead>
            <tbody>
              {mb.tiers.map((t) => (
                <tr key={t.key}>
                  <td>{t.label}</td>
                  <td className="text-right">
                    <Money cents={t.underwriting.input.exitValue} />
                  </td>
                  <td className="text-right">
                    <Money cents={t.bid} />
                  </td>
                  <td className="text-right">
                    <Money cents={t.underwriting.metrics.capitalNeeded} />
                  </td>
                  <td className="text-right">
                    <Money cents={t.underwriting.metrics.netProfit} />
                  </td>
                  <td className="text-right">
                    <Pct value={t.underwriting.metrics.roi} />
                  </td>
                  <td className="text-right">
                    <Pct value={t.underwriting.metrics.irrAnnual} digits={0} />
                  </td>
                  <td className="text-xxs">{t.bindingConstraint}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {a.valuation.status !== "OK" && can(user, "approveCap") && (
        <Card title="Override do bloqueio (somente ADMIN, registrado em auditoria)" subtitle="Use apenas quando os comparáveis foram validados por outro meio. A justificativa fica gravada e aparece no memorando.">
          <form action={setMaxBidOverrideAction.bind(null, id)} className="space-y-2">
            <Field label="Justificativa">
              <Textarea name="justification" rows={2} defaultValue={settings.maxBidOverrideJustification ?? ""} placeholder="ex.: comparáveis validados presencialmente com corretor local em 10/09" />
            </Field>
            <div className="flex gap-2">
              <button className={btnGhost}>Salvar override</button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
