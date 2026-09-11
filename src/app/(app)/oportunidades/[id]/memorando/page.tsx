import { notFound } from "next/navigation";
import { requireUser, can } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { buildMemo } from "@/server/memo";
import { approveCapAction, registerDecisionAction } from "@/server/actions/decisions";
import { Badge, btnPrimary, Card, Disclosure, Field, Input, Money, Notice, Pct, Select, Table, Textarea } from "@/components/ui";
import { RENOVATION_LEVEL_LABELS } from "@/domain/renovation";
import type { RenovationLevel } from "@/domain/types";

const REC_TONE = { APROVAR: "ok", APROVAR_COM_CONDICOES: "warn", REVISAR: "accent", REPROVAR: "bad" } as const;

export default async function MemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { property: p, decisions, approvals, risks, analysis: a } = ctx;
  const m = buildMemo(ctx);
  const criticalOpen = risks.filter((r) => r.isCritical && r.status === "ABERTO");
  const currentCap = approvals.find((x) => !x.supersededBy) ?? null;
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <Card title={`Memorando do investimento · Oportunidade #${m.propertyCode}`} subtitle={`${p.title} · gerado ${new Date(m.generatedAt).toLocaleString("pt-BR")} · valuation ${m.valuationStatus} · confiança ${m.confidence}%`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
          <Line label={`Valor de saída provável (${m.exitHorizonDays} d)`} hint={m.exitLow !== null && m.exitHigh !== null ? <><Money cents={m.exitLow} compact /> – <Money cents={m.exitHigh} compact /> · conf. {m.confidence}%</> : undefined}>
            <Money cents={m.exitValue} />
          </Line>
          <Line label="Custo total projetado" hint={<>capital <Money cents={m.capitalNeeded} compact /></>}>
            <Money cents={m.totalCost} />
          </Line>
          <Line label={`Reforma (${RENOVATION_LEVEL_LABELS[m.renovationLevel as RenovationLevel].toLowerCase()})`}>
            <Money cents={m.renovationLow} compact /> – <Money cents={m.renovationHigh} compact />
          </Line>
          <Line label="Lucro líquido provável">
            <Money cents={m.netProfit} />
          </Line>
          <Line label="ROI">
            <Pct value={m.roi} />
          </Line>
          <Line label="TIR">
            <Pct value={m.irrAnnual} digits={0} />
          </Line>
          <Line label="Risco">
            <span className={m.riskLevel === "CRITICO" ? "text-bad" : m.riskLevel === "ALTO" ? "text-hot" : m.riskLevel === "MEDIO" ? "text-warn" : "text-ok"}>{m.riskLevel}</span>
          </Line>
          <Line label="Prazo">
            <span className="font-mono">{m.months} meses</span>
          </Line>
          <Line label="Lance ideal">
            <Money cents={m.idealBid} />
          </Line>
          <Line label="Lance confortável">
            <Money cents={m.comfortableBid} />
          </Line>
          <Line label="Lance limite">
            <Money cents={m.limitBid} />
          </Line>
          <Line label="Lance máximo absoluto">
            <Money cents={m.absoluteMaxBid} className="text-hot" />
          </Line>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xxs uppercase tracking-wider text-fg-faint">Recomendação do sistema</span>
          <Badge tone={REC_TONE[m.recommendation]} className="text-xs">
            {m.recommendation.replace(/_/g, " ")}
          </Badge>
          <span className="text-xxs text-fg-faint">a decisão é das pessoas; o sistema sugere e registra</span>
        </div>
        {m.conditions.length > 0 && (
          <ul className="mt-2 grid grid-cols-1 gap-x-6 text-xs md:grid-cols-2">
            {m.conditions.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        )}
        {m.criticalRisks.length > 0 && (
          <Notice tone="bad">
            Riscos críticos em aberto: {m.criticalRisks.join(" · ")}
          </Notice>
        )}
      </Card>

      <Disclosure summary="Por quê" open>
        <ul className="space-y-1 text-xs">
          {m.why.map((w, i) => (
            <li key={i}>• {w}</li>
          ))}
        </ul>
        {m.scenarioProfits.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-4 font-mono text-xxs text-fg-muted">
            {m.scenarioProfits.map((s) => (
              <span key={s.key}>
                {s.key}: <Money cents={s.netProfit} compact /> ({s.roi === null ? "—" : `${(s.roi * 100).toFixed(0)}%`})
              </span>
            ))}
          </div>
        )}
      </Disclosure>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Registrar decisão" subtitle="Congela este memorando como snapshot imutável (versão). Aprovação exige valuation OK.">
          {can(user, "registerDecision") ? (
            <form action={registerDecisionAction.bind(null, id)} className="space-y-2">
              <Field label="Decisão">
                <Select name="decision" defaultValue={m.recommendation}>
                  <option value="APROVAR">APROVAR</option>
                  <option value="APROVAR_COM_CONDICOES">APROVAR COM CONDIÇÕES</option>
                  <option value="REVISAR">REVISAR</option>
                  <option value="REPROVAR">REPROVAR</option>
                </Select>
              </Field>
              <Field label="Condições (uma por linha)">
                <Textarea name="conditions" rows={4} defaultValue={m.conditions.join("\n")} />
              </Field>
              <button className={btnPrimary}>Registrar decisão</button>
            </form>
          ) : (
            <p className="text-xs text-fg-muted">Seu papel ({user.role}) não registra decisões. Votação por membros chega na Fase 2.</p>
          )}
          {decisions.length > 0 && (
            <Table className="mt-3">
              <thead>
                <tr>
                  <th>v</th>
                  <th>Decisão</th>
                  <th>Quem</th>
                  <th>Quando</th>
                  <th>Condições</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono">{d.version}</td>
                    <td>
                      <Badge tone={REC_TONE[d.decision]}>{d.decision.replace(/_/g, " ")}</Badge>
                    </td>
                    <td>{d.decidedByName}</td>
                    <td className="font-mono text-xxs">{new Date(d.decidedAt).toLocaleString("pt-BR")}</td>
                    <td className="text-xxs text-fg-muted">{d.conditions.join("; ")}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Teto de lance aprovado (precommitment)" subtitle="Definido ANTES do leilão, por ADMIN, com validade. Nova aprovação substitui a anterior; o histórico é imutável.">
          {currentCap && (
            <p className="mb-2 text-xs">
              Teto vigente: <Money cents={currentCap.approvedCap} className="text-ok" /> · aprovado por {currentCap.approvedByName} em {new Date(currentCap.approvedAt).toLocaleDateString("pt-BR")} · válido até {new Date(currentCap.validUntil).toLocaleDateString("pt-BR")}
              {currentCap.justification && <span className="text-fg-faint"> · {currentCap.justification}</span>}
            </p>
          )}
          {can(user, "approveCap") ? (
            a.maxBid?.blocked ? (
              <Notice tone="warn">Lance máximo bloqueado ({a.valuation.status}). Resolva o valuation ou registre override justificado antes de aprovar o teto.</Notice>
            ) : (
              <form action={approveCapAction.bind(null, id)} className="space-y-2">
                <Field label="Teto aprovado (R$)" hint={m.absoluteMaxBid !== null ? `sugestão: entre ideal ${(m.idealBid! / 100).toLocaleString("pt-BR")} e máximo absoluto ${(m.absoluteMaxBid / 100).toLocaleString("pt-BR")}; acima do absoluto exige justificativa` : undefined}>
                  <Input name="approvedCap" inputMode="decimal" defaultValue={m.comfortableBid ? (m.comfortableBid / 100).toLocaleString("pt-BR") : ""} required />
                </Field>
                <Field label="Válido até">
                  <Input name="validUntil" type="date" defaultValue={p.auction?.secondCallAt ? p.auction.secondCallAt.slice(0, 10) : in30} required />
                </Field>
                <Field label="Justificativa (obrigatória acima do máximo absoluto)">
                  <Textarea name="justification" rows={2} />
                </Field>
                {criticalOpen.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-bad">
                    <input type="checkbox" name="acknowledgeCritical" /> Reconheço {criticalOpen.length} risco(s) crítico(s) em aberto
                  </label>
                )}
                <button className={btnPrimary}>Aprovar teto</button>
              </form>
            )
          ) : (
            <p className="text-xs text-fg-muted">Somente ADMIN aprova o teto.</p>
          )}
          {approvals.length > 1 && (
            <Table className="mt-3">
              <tbody>
                {approvals.map((x) => (
                  <tr key={x.id} className={x.supersededBy ? "opacity-50" : ""}>
                    <td>
                      <Money cents={x.approvedCap} />
                    </td>
                    <td>{x.approvedByName}</td>
                    <td className="font-mono text-xxs">{new Date(x.approvedAt).toLocaleString("pt-BR")}</td>
                    <td className="text-xxs">{x.supersededBy ? "substituído" : "vigente"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function Line({ label, children, hint, }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xxs uppercase tracking-wider text-fg-faint">{label}</div>
      <div className="font-mono text-lg tabular-nums">{children}</div>
      {hint && <div className="text-xxs text-fg-muted">{hint}</div>}
    </div>
  );
}
