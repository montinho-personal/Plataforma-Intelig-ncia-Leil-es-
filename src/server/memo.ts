import type { OpportunityContext } from "@/server/analysis";
import type { RiskRecord } from "@/data/types";
import { formatBRL } from "@/domain/money";

export type MemoRecommendation = "APROVAR" | "APROVAR_COM_CONDICOES" | "REVISAR" | "REPROVAR";

export interface Memo {
  generatedAt: string;
  propertyCode: number;
  title: string;
  valuationStatus: string;
  confidence: number;
  exitHorizonDays: number;
  exitValue: number | null;
  exitLow: number | null;
  exitHigh: number | null;
  marketValue: number | null;
  postRenovationMarket: number | null;
  totalCost: number | null;
  capitalNeeded: number | null;
  renovationLow: number;
  renovationLikely: number;
  renovationHigh: number;
  renovationLevel: string;
  netProfit: number | null;
  roi: number | null;
  irrAnnual: number | null;
  months: number;
  riskLevel: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";
  criticalRisks: string[];
  idealBid: number | null;
  comfortableBid: number | null;
  limitBid: number | null;
  absoluteMaxBid: number | null;
  maxBidBlocked: boolean;
  maxBidBlockedReason: string | null;
  referenceBid: number;
  recommendation: MemoRecommendation;
  conditions: string[];
  why: string[];
  scenarioProfits: { key: string; netProfit: number; roi: number | null }[];
}

function riskLevel(risks: RiskRecord[], ctx: OpportunityContext): Memo["riskLevel"] {
  const open = risks.filter((r) => r.status === "ABERTO");
  if (open.some((r) => r.isCritical) || ctx.analysis.valuation.status === "ATYPICAL") return "CRITICO";
  const maxSeverity = open.reduce((m, r) => Math.max(m, r.probability * r.impactScore), 0);
  const unknownOccupancy = ctx.property.occupancy === "DESCONHECIDO";
  if (maxSeverity >= 10 || unknownOccupancy) return "ALTO";
  if (maxSeverity >= 6 || ctx.analysis.valuation.status !== "OK") return "MEDIO";
  return "BAIXO";
}

/**
 * Memorando do investimento: uma tela, três camadas (decisão → por quê → evidências).
 * A recomendação do sistema é sugestão; a decisão é registrada por pessoas.
 */
export function buildMemo(ctx: OpportunityContext): Memo {
  const { analysis: a, property, risks } = ctx;
  const uw = a.underwriting?.metrics ?? null;
  const exit = a.valuation.exitValues ? a.valuation.exitValues[a.exitHorizonDays] : null;
  const criticalRisks = risks.filter((r) => r.isCritical && r.status === "ABERTO").map((r) => r.risk);
  const level = riskLevel(risks, ctx);
  const conditions: string[] = [];
  const why: string[] = [];
  const profile = ctx.profile;

  if (property.occupancy === "DESCONHECIDO") conditions.push("Confirmar ocupação do imóvel");
  if (!property.auction?.condoDebt && !property.auction?.iptuDebt) conditions.push("Confirmar débitos de condomínio e IPTU no edital");
  if (a.valuation.status === "INSUFFICIENT_DATA") conditions.push("Adicionar comparáveis: valuation com dados insuficientes");
  if (a.valuation.status === "ATYPICAL") conditions.push("Validação especializada: caso atípico");
  if (a.renovation.requiresProfessionalQuote || a.renovation.level === "HEAVY" || a.renovation.level === "FULL") conditions.push("Orçamento profissional de reforma");
  if (a.renovation.items.every((i) => i.epistemicStatus !== "FACT") && a.renovation.level !== "NONE") conditions.push("Confirmar ao menos os itens principais da reforma com orçamento");
  if (a.valuation.confidence < 70 && a.valuation.status === "OK") conditions.push("Reforçar comparáveis (confiança abaixo de 70%)");
  conditions.push("Validar matrícula (ônus, área, proprietários)");
  for (const r of criticalRisks) conditions.push(`Mitigar risco crítico: ${r}`);

  let recommendation: MemoRecommendation = "REVISAR";
  if (uw && a.valuation.status === "OK" && a.maxBid && !a.maxBid.blocked) {
    const ref = a.underwriting!.input.bid;
    const absolute = a.maxBid.byKey.ABSOLUTE_MAX.bid;
    if (ref > absolute) {
      recommendation = "REPROVAR";
      why.push(`Lance de referência (${formatBRL(ref)}) acima do máximo absoluto (${formatBRL(absolute)}).`);
    } else if (uw.roi !== null && uw.roi >= profile.targetRoi && level !== "CRITICO" && conditions.length <= 3) {
      recommendation = "APROVAR";
    } else if (uw.roi !== null && uw.roi >= profile.minRoi) {
      recommendation = "APROVAR_COM_CONDICOES";
    } else {
      recommendation = "REPROVAR";
      why.push(`ROI ${((uw.roi ?? 0) * 100).toFixed(1)}% abaixo do mínimo ${(profile.minRoi * 100).toFixed(0)}% no lance de referência.`);
    }
    if (level === "CRITICO" && recommendation !== "REPROVAR") recommendation = "APROVAR_COM_CONDICOES";
  } else if (!uw) {
    why.push("Sem comparáveis suficientes para calcular a análise.");
  } else {
    why.push(a.valuation.statusReasons[0] ?? "Valuation não confiável.");
  }

  if (a.valuation.stats) {
    why.push(`${a.valuation.stats.included} comparáveis incluídos, n efetivo ${a.valuation.stats.effectiveN.toFixed(1)}, dispersão ${(a.valuation.stats.coefficientOfVariation * 100).toFixed(0)}%, confiança ${a.valuation.confidence}%.`);
  }
  if (exit && a.valuation.marketValue) {
    why.push(`Valor de saída em ${a.exitHorizonDays} dias (${formatBRL(exit.amount)}) já desconta anúncio→fechamento, concessão do investidor e liquidez; o teto usa este valor, não o de mercado.`);
  }
  if (property.auction?.appraisalValue) why.push("O valor de avaliação do edital foi ignorado no valuation (é referência do leilão, não de mercado).");
  if (uw) why.push(`Prazo total ${uw.months} meses (desocupação ${a.underwriting!.input.evictionMonths} m + obra + venda). TIR ${uw.irrAnnual === null ? "indefinida" : `${(uw.irrAnnual * 100).toFixed(0)}% a.a.`}.`);
  const best = a.renovationOptions.find((o) => o.isBest);
  if (best && best.level !== a.renovation.level) why.push(`Ponto ótimo de reforma sugere nível ${best.level} (ROI ${((best.underwriting.metrics.roi ?? 0) * 100).toFixed(1)}%) em vez de ${a.renovation.level}.`);

  return {
    generatedAt: new Date().toISOString(),
    propertyCode: property.code,
    title: property.title,
    valuationStatus: a.valuation.status,
    confidence: a.valuation.confidence,
    exitHorizonDays: a.exitHorizonDays,
    exitValue: exit?.amount ?? null,
    exitLow: exit?.low ?? null,
    exitHigh: exit?.high ?? null,
    marketValue: a.valuation.marketValue?.amount ?? null,
    postRenovationMarket: a.valuation.postRenovationMarket?.amount ?? null,
    totalCost: uw?.totalCost ?? null,
    capitalNeeded: uw?.capitalNeeded ?? null,
    renovationLow: a.renovation.total.low,
    renovationLikely: a.renovation.total.likely,
    renovationHigh: a.renovation.total.high,
    renovationLevel: a.renovation.level,
    netProfit: uw?.netProfit ?? null,
    roi: uw?.roi ?? null,
    irrAnnual: uw?.irrAnnual ?? null,
    months: a.months,
    riskLevel: level,
    criticalRisks,
    idealBid: a.maxBid && !a.maxBid.blocked ? a.maxBid.byKey.IDEAL.bid : null,
    comfortableBid: a.maxBid && !a.maxBid.blocked ? a.maxBid.byKey.COMFORTABLE.bid : null,
    limitBid: a.maxBid && !a.maxBid.blocked ? a.maxBid.byKey.LIMIT.bid : null,
    absoluteMaxBid: a.maxBid && !a.maxBid.blocked ? a.maxBid.byKey.ABSOLUTE_MAX.bid : null,
    maxBidBlocked: a.maxBid?.blocked ?? true,
    maxBidBlockedReason: a.maxBid?.blockedReason ?? null,
    referenceBid: a.underwriting?.input.bid ?? 0,
    recommendation,
    conditions,
    why,
    scenarioProfits: (a.scenarios ?? []).map((s) => ({ key: s.key, netProfit: s.underwriting.metrics.netProfit, roi: s.underwriting.metrics.roi })),
  };
}
