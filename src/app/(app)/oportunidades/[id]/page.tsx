import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { buildMemo } from "@/server/memo";
import { Badge, Card, ConfidenceBar, Disclosure, Money, Pct, RangeText, Stat, Notice } from "@/components/ui";
import { RENOVATION_LEVEL_LABELS } from "@/domain/renovation";

const REC_TONE = { APROVAR: "ok", APROVAR_COM_CONDICOES: "warn", REVISAR: "accent", REPROVAR: "bad" } as const;

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { analysis: a, comparables, property: p } = ctx;
  const memo = buildMemo(ctx);
  const uw = a.underwriting?.metrics ?? null;
  const exit = a.valuation.exitValues?.[a.exitHorizonDays] ?? null;

  if (comparables.length === 0) {
    return (
      <Card>
        <p className="text-xs text-fg-muted">
          Sem comparáveis ainda. A primeira pergunta é "quanto vale?". <Link href={`/oportunidades/${id}/comparaveis`} className="text-accent underline">Cadastre comparáveis</Link> para liberar valuation, reforma, underwriting e lance máximo.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {a.valuation.status !== "OK" && <Notice tone={a.valuation.status === "ATYPICAL" ? "bad" : "warn"}>{a.valuation.statusReasons.join(" · ")}</Notice>}

      {/* Camada 1: DECISÃO */}
      <Card title="Decisão" subtitle="Camada 1 — o que importa, em 60 segundos">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4 lg:grid-cols-5">
          <Stat label={`Valor de saída · ${a.exitHorizonDays} d`} hint={exit ? <><RangeText low={exit.low} likely={exit.amount} high={exit.high} /> · conf. {a.valuation.confidence}%</> : "—"}>
            <Money cents={exit?.amount ?? null} />
          </Stat>
          <Stat label="Custo total projetado" hint={uw ? <>capital necessário <Money cents={uw.capitalNeeded} /></> : undefined}>
            <Money cents={uw?.totalCost ?? null} />
          </Stat>
          <Stat label={`Reforma · ${RENOVATION_LEVEL_LABELS[a.renovation.level].toLowerCase()}`} hint={`${a.renovation.durationWeeks.low}–${a.renovation.durationWeeks.high} semanas`}>
            <span className="text-base">
              <Money cents={a.renovation.total.low} compact /> – <Money cents={a.renovation.total.high} compact />
            </span>
          </Stat>
          <Stat label="Lucro líquido provável" tone={uw && uw.netProfit > 0 ? "ok" : "bad"} hint={uw ? <>margem <Pct value={uw.margin} /> · {uw.months} meses</> : undefined}>
            <Money cents={uw?.netProfit ?? null} />
          </Stat>
          <Stat label="ROI · TIR" hint={uw ? <>ROE <Pct value={uw.roe} /> · {((uw.monthlyEquivalent ?? 0) * 100).toFixed(1)}%/mês</> : undefined}>
            <Pct value={uw?.roi ?? null} /> <span className="text-fg-faint">·</span> <Pct value={uw?.irrAnnual ?? null} digits={0} />
          </Stat>
          <Stat label="Risco" tone={memo.riskLevel === "CRITICO" ? "bad" : memo.riskLevel === "ALTO" ? "hot" : memo.riskLevel === "MEDIO" ? "warn" : "ok"} hint={memo.criticalRisks.length ? `${memo.criticalRisks.length} crítico(s)` : p.occupancy === "DESCONHECIDO" ? "ocupação desconhecida" : undefined}>
            {memo.riskLevel}
          </Stat>
          <Stat label="Lance ideal" hint="ROI alvo · saída conservadora">
            <Money cents={memo.idealBid} />
          </Stat>
          <Stat label="Lance máximo absoluto" tone="hot" hint="acima: NÃO ARREMATAR">
            <Money cents={memo.absoluteMaxBid} />
          </Stat>
          <Stat label="Lance de referência" hint={p.auction?.secondCallMinBid ? "2ª praça (edital) ■" : "configurado"}>
            <Money cents={memo.referenceBid} />
          </Stat>
          <Stat label="Recomendação do sistema" tone={REC_TONE[memo.recommendation]}>
            <span className="text-base">{memo.recommendation.replace(/_/g, " ")}</span>
          </Stat>
        </div>
        {memo.maxBidBlocked && memo.maxBidBlockedReason && (
          <p className="mt-3 text-xs text-warn">{memo.maxBidBlockedReason}</p>
        )}
        {memo.conditions.length > 0 && (
          <div className="mt-4">
            <div className="text-xxs uppercase tracking-wider text-fg-faint">Condições sugeridas</div>
            <ul className="mt-1 grid grid-cols-1 gap-x-6 text-xs md:grid-cols-2">
              {memo.conditions.map((c) => (
                <li key={c} className="py-0.5">
                  • {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Camada 2: POR QUÊ */}
      <Disclosure summary="Por quê (camada 2)" open>
        <ul className="space-y-1 text-xs">
          {memo.why.map((w, i) => (
            <li key={i}>• {w}</li>
          ))}
          <li>
            • Triagem: <Badge tone={a.screening.verdict === "MERECE_ANALISE" ? "ok" : a.screening.verdict === "DESCARTAR" ? "bad" : "warn"}>{a.screening.verdict.replace(/_/g, " ")}</Badge> {a.screening.reasons.join(" ")}
          </li>
        </ul>
        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className="text-fg-faint">Confiança do valuation</span>
          <ConfidenceBar value={a.valuation.confidence} />
        </div>
      </Disclosure>

      {/* Camada 3: EVIDÊNCIAS (links) */}
      <Disclosure summary="Evidências (camada 3)">
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          <Link className="text-accent hover:underline" href={`/oportunidades/${id}/comparaveis`}>
            Comparáveis ({a.valuation.stats?.included ?? 0} incluídos) →
          </Link>
          <Link className="text-accent hover:underline" href={`/oportunidades/${id}/valuation`}>
            Valuation por prazo e fatores de confiança →
          </Link>
          <Link className="text-accent hover:underline" href={`/oportunidades/${id}/reforma`}>
            Reforma por categoria e ponto ótimo →
          </Link>
          <Link className="text-accent hover:underline" href={`/oportunidades/${id}/underwriting`}>
            Underwriting linha a linha →
          </Link>
          <Link className="text-accent hover:underline" href={`/oportunidades/${id}/cenarios`}>
            Cenários e sensibilidade →
          </Link>
          <Link className="text-accent hover:underline" href={`/oportunidades/${id}/lance-maximo`}>
            Quatro patamares de lance →
          </Link>
          <Link className="text-accent hover:underline" href={`/oportunidades/${id}/riscos`}>
            Riscos →
          </Link>
        </div>
      </Disclosure>
    </div>
  );
}
