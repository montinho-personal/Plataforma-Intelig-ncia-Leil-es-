import { roundCents } from "../money";
import type { Cents, Rate } from "../types";
import { computeUnderwriting, type UnderwritingInput, type UnderwritingResult } from "../underwriting";

/**
 * Lance máximo: resolve a equação ao contrário.
 * "Dado o retorno exigido e o VALOR DE SAÍDA do investidor, qual é o máximo que podemos pagar?"
 * Nunca usa valor de mercado nem avaliação do leilão como base.
 */

export interface BidConstraints {
  /** ROI mínimo aceitável (fração) */
  minRoi: Rate;
  /** ROI desejado (fração) */
  targetRoi: Rate;
  minProfit?: Cents | null;
  minIrrAnnual?: Rate | null;
  maxCapital?: Cents | null;
}

export interface ExitValueTiers {
  /** Valor de saída conservador (limite inferior da faixa no prazo-alvo) */
  conservative: Cents;
  /** Valor de saída base (provável no prazo-alvo) */
  base: Cents;
}

export type BidTierKey = "IDEAL" | "COMFORTABLE" | "LIMIT" | "ABSOLUTE_MAX";

export interface BidTier {
  key: BidTierKey;
  label: string;
  bid: Cents;
  /** Restrição que definiu este patamar */
  bindingConstraint: string;
  /** Underwriting no lance deste patamar (valor de saída correspondente) */
  underwriting: UnderwritingResult;
  description: string;
}

export interface MaxBidResult {
  tiers: BidTier[];
  byKey: Record<BidTierKey, BidTier>;
  warnings: string[];
  blocked: boolean;
  blockedReason?: string;
}

export type BidInputFactory = (bid: Cents, exitValue: Cents) => UnderwritingInput;

interface SolveOptions {
  toleranceCents?: number;
  maxIterations?: number;
}

/**
 * Bisseção genérica: encontra o maior lance B em [0, hi] tal que metric(B) >= target,
 * assumindo metric decrescente em B. Retorna 0 quando nem lance zero atende.
 */
export function solveBidFor(metric: (bid: Cents) => number | null, target: number, hi: Cents, options: SolveOptions = {}): { bid: Cents; feasible: boolean } {
  const tol = options.toleranceCents ?? 100;
  const maxIter = options.maxIterations ?? 200;
  const f = (b: Cents) => {
    const v = metric(b);
    return v === null ? Number.NEGATIVE_INFINITY : v - target;
  };
  if (f(0) < 0) return { bid: 0, feasible: false };
  if (f(hi) >= 0) return { bid: hi, feasible: true };
  let lo = 0;
  let high = hi;
  for (let i = 0; i < maxIter && high - lo > tol; i++) {
    const mid = Math.floor((lo + high) / 2);
    if (f(mid) >= 0) lo = mid;
    else high = mid;
  }
  return { bid: roundCents(Math.floor(lo / 100) * 100), feasible: true };
}

function solveAllConstraints(factory: BidInputFactory, exitValue: Cents, roiTarget: Rate, constraints: BidConstraints): { bid: Cents; binding: string } {
  const candidates: { bid: Cents; label: string }[] = [];
  const uw = (b: Cents) => computeUnderwriting(factory(b, exitValue));

  const roiSolved = solveBidFor((b) => uw(b).metrics.roi, roiTarget, exitValue);
  candidates.push({ bid: roiSolved.bid, label: `ROI ${(roiTarget * 100).toFixed(1)}%` });

  if (constraints.minProfit !== null && constraints.minProfit !== undefined && constraints.minProfit > 0) {
    const s = solveBidFor((b) => uw(b).metrics.netProfit, constraints.minProfit, exitValue);
    candidates.push({ bid: s.bid, label: "lucro mínimo" });
  }
  if (constraints.minIrrAnnual !== null && constraints.minIrrAnnual !== undefined && constraints.minIrrAnnual > 0) {
    const s = solveBidFor((b) => uw(b).metrics.irrAnnual, constraints.minIrrAnnual, exitValue);
    candidates.push({ bid: s.bid, label: "TIR mínima" });
  }
  if (constraints.maxCapital !== null && constraints.maxCapital !== undefined && constraints.maxCapital > 0) {
    // capital necessário é crescente no lance; queremos o maior B com capital <= max
    const s = solveBidFor((b) => -uw(b).metrics.capitalNeeded, -constraints.maxCapital, exitValue);
    candidates.push({ bid: s.bid, label: "capital máximo" });
  }
  candidates.sort((a, b) => a.bid - b.bid);
  const best = candidates[0]!;
  return { bid: best.bid, binding: best.label };
}

export interface MaxBidOptions {
  /** Valuation com dados insuficientes ou atípica bloqueia o cálculo, salvo override justificado */
  valuationStatus?: "OK" | "INSUFFICIENT_DATA" | "ATYPICAL";
  overrideJustification?: string | null;
}

export function computeMaxBid(factory: BidInputFactory, exits: ExitValueTiers, constraints: BidConstraints, options: MaxBidOptions = {}): MaxBidResult {
  const warnings: string[] = [];
  const status = options.valuationStatus ?? "OK";
  if (status !== "OK" && !options.overrideJustification) {
    const reason =
      status === "INSUFFICIENT_DATA"
        ? "DADOS INSUFICIENTES PARA VALUATION CONFIÁVEL — lance máximo bloqueado até haver comparáveis suficientes ou override justificado do ADMIN."
        : "CASO ATÍPICO — NECESSITA VALIDAÇÃO ESPECIALIZADA antes de definir o lance máximo.";
    const empty = computeUnderwriting(factory(0, exits.base));
    const tier = (key: BidTierKey, label: string): BidTier => ({ key, label, bid: 0, bindingConstraint: "bloqueado", underwriting: empty, description: reason });
    const tiers = [tier("IDEAL", "Ideal"), tier("COMFORTABLE", "Confortável"), tier("LIMIT", "Limite"), tier("ABSOLUTE_MAX", "Máximo absoluto")];
    return { tiers, byKey: Object.fromEntries(tiers.map((t) => [t.key, t])) as Record<BidTierKey, BidTier>, warnings: [reason], blocked: true, blockedReason: reason };
  }
  if (status !== "OK" && options.overrideJustification) warnings.push(`Cálculo com override (${status}): ${options.overrideJustification}`);
  if (constraints.targetRoi < constraints.minRoi) warnings.push("ROI alvo menor que ROI mínimo no perfil; patamares podem se inverter.");

  const defs: { key: BidTierKey; label: string; roi: Rate; exit: Cents; description: string }[] = [
    { key: "IDEAL", label: "Ideal", roi: constraints.targetRoi, exit: exits.conservative, description: "ROI alvo com valor de saída conservador" },
    { key: "COMFORTABLE", label: "Confortável", roi: constraints.targetRoi, exit: exits.base, description: "ROI alvo com valor de saída base" },
    { key: "LIMIT", label: "Limite", roi: constraints.minRoi, exit: exits.conservative, description: "ROI mínimo com valor de saída conservador" },
    { key: "ABSOLUTE_MAX", label: "Máximo absoluto", roi: constraints.minRoi, exit: exits.base, description: "ROI mínimo com valor de saída base. Acima disto: NÃO ARREMATAR." },
  ];

  const tiers: BidTier[] = defs.map((d) => {
    const solved = solveAllConstraints(factory, d.exit, d.roi, constraints);
    return {
      key: d.key,
      label: d.label,
      bid: solved.bid,
      bindingConstraint: solved.binding,
      underwriting: computeUnderwriting(factory(solved.bid, d.exit)),
      description: d.description,
    };
  });

  // Ordem esperada: IDEAL ≤ CONFORTÁVEL ≤ LIMITE ≤ MÁXIMO. Inversões são divulgadas, nunca escondidas.
  for (let i = 1; i < tiers.length; i++) {
    const prev = tiers[i - 1]!;
    const cur = tiers[i]!;
    if (cur.bid < prev.bid) {
      warnings.push(`${cur.label} (${cur.bid / 100}) ficou abaixo de ${prev.label} (${prev.bid / 100}); os patamares foram ordenados.`);
    }
  }
  tiers.sort((a, b) => a.bid - b.bid);
  const order: BidTierKey[] = ["IDEAL", "COMFORTABLE", "LIMIT", "ABSOLUTE_MAX"];
  const labels: Record<BidTierKey, string> = { IDEAL: "Ideal", COMFORTABLE: "Confortável", LIMIT: "Limite", ABSOLUTE_MAX: "Máximo absoluto" };
  // Reatribui as chaves pela ordem numérica, preservando a descrição do cálculo original
  const relabeled = tiers.map((t, i) => ({ ...t, key: order[i]!, label: labels[order[i]!] }));

  if (relabeled.every((t) => t.bid === 0)) warnings.push("Nenhum lance atende ao retorno exigido com estas premissas.");

  return {
    tiers: relabeled,
    byKey: Object.fromEntries(relabeled.map((t) => [t.key, t])) as Record<BidTierKey, BidTier>,
    warnings,
    blocked: false,
  };
}

/** Loss framing: impacto de um lance sobre o lucro e o ROI, em relação a um lance de referência. */
export function bidImpact(factory: BidInputFactory, exitValue: Cents, fromBid: Cents, toBid: Cents) {
  const a = computeUnderwriting(factory(fromBid, exitValue)).metrics;
  const b = computeUnderwriting(factory(toBid, exitValue)).metrics;
  return {
    profitDelta: b.netProfit - a.netProfit,
    roiFrom: a.roi,
    roiTo: b.roi,
    profitFrom: a.netProfit,
    profitTo: b.netProfit,
  };
}
