import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { Badge, Money } from "@/components/ui";
import { OpportunityTabs } from "@/components/opportunity-tabs";

export default async function OpportunityLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await loadOpportunity(user, id);
  if (!ctx) notFound();
  const { property: p, analysis: a, comparables, risks, approvals } = ctx;
  const critical = p.atypicalFlags.some((f) => f.severity === "CRITICAL");
  const cap = approvals.find((x) => !x.supersededBy) ?? null;
  const criticalRisks = risks.filter((r) => r.isCritical && r.status === "ABERTO").length;

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-fg-faint">#{p.code}</span>
              <h1 className="text-base font-semibold">{p.title}</h1>
              <Badge tone={p.status === "APROVADO" ? "ok" : p.status === "REPROVADO" || p.status === "DESCARTADO" ? "bad" : "neutral"}>{p.status.replace("_", " ")}</Badge>
              {critical && <Badge tone="hot">CASO ATÍPICO — NECESSITA VALIDAÇÃO ESPECIALIZADA</Badge>}
              {a.valuation.status === "INSUFFICIENT_DATA" && comparables.length > 0 && <Badge tone="warn">DADOS INSUFICIENTES</Badge>}
            </div>
            <div className="mt-1 text-xs text-fg-muted">
              {p.type} · {p.usableAreaM2} m²{p.bedrooms ? ` · ${p.bedrooms} dorm.` : ""}
              {p.parking ? ` · ${p.parking} vaga(s)` : ""} · {p.neighborhood ? `${p.neighborhood}, ` : ""}
              {p.city}/{p.state}
              {p.condoName ? ` · ${p.condoName}` : ""} · ocupação {p.occupancy}
            </div>
            {p.auction && (
              <div className="mt-1 text-xs text-fg-muted">
                Leilão {p.auction.modality.toLowerCase()}
                {p.auction.auctioneer ? ` · ${p.auction.auctioneer}` : ""}
                {p.auction.secondCallAt ? ` · 2ª praça ${new Date(p.auction.secondCallAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}
                {p.auction.secondCallMinBid ? (
                  <>
                    {" "}
                    · lance mín. <Money cents={p.auction.secondCallMinBid} /> <span className="text-ok">■</span>
                  </>
                ) : null}
                {p.auction.appraisalValue ? (
                  <>
                    {" "}
                    · avaliação do edital <Money cents={p.auction.appraisalValue} /> <span className="text-fg-faint">(não é valor de mercado)</span>
                  </>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            {cap ? (
              <div className="rounded border border-ok/40 px-2 py-1">
                <span className="text-xxs uppercase tracking-wider text-fg-faint">Teto aprovado</span> <Money cents={cap.approvedCap} className="text-ok" />
                <span className="ml-1 text-xxs text-fg-faint">até {new Date(cap.validUntil).toLocaleDateString("pt-BR")}</span>
              </div>
            ) : (
              <span className="text-xxs text-fg-faint">sem teto aprovado</span>
            )}
            {criticalRisks > 0 && <Badge tone="bad">{criticalRisks} risco(s) crítico(s) em aberto</Badge>}
            <Link href={`/oportunidades/${p.id}/memorando`} className="text-accent hover:underline">
              Memorando →
            </Link>
          </div>
        </div>
        <OpportunityTabs id={p.id} counts={{ comparaveis: comparables.length, riscos: risks.filter((r) => r.status === "ABERTO").length }} states={{ valuation: a.valuation.status, maxBidBlocked: a.maxBid?.blocked ?? true }} />
      </header>
      {children}
    </div>
  );
}
