import type { InvestmentProfile } from "../profile";
import { conditionAfterRenovation, estimateRenovation, weeksToMonths, type RenovationEstimate, type RenovationItemOverride } from "../renovation";
import { computeUnderwriting, type UnderwritingInput, type UnderwritingResult } from "../underwriting";
import { computeMaxBid, type BidInputFactory, type MaxBidResult } from "../maxBid";
import { buildScenarios, sensitivityPriceByMonths, sensitivityPriceByRenovation, type ScenarioResult, type SensitivityMatrix } from "../scenarios";
import { computeValuation, type ComparableInput, type SubjectProperty, type ValuationResult } from "../valuation";
import type { AtypicalFlag, Cents, Condition, EpistemicStatus, ExitHorizonDays, Occupancy, RenovationLevel } from "../types";
import { RENOVATION_LEVELS } from "../types";

/**
 * Orquestrador: a partir de imóvel, comparáveis e perfil, monta a análise completa da oportunidade.
 * Toda a matemática está nos módulos; aqui só há composição e as regras de encadeamento:
 *   valuation (estado atual e pós-reforma) → reforma → underwriting → cenários → lance máximo → ponto ótimo.
 */

export interface OpportunityInput {
  subject: SubjectProperty & {
    occupancy?: Occupancy | null;
    monthlyCondo?: Cents | null;
    monthlyIptu?: Cents | null;
    condoDebt?: Cents | null;
    iptuDebt?: Cents | null;
    auctionCommissionRate?: number | null;
    atypicalFlags?: AtypicalFlag[];
  };
  comparables: ComparableInput[];
  profile: InvestmentProfile;
  /** Nível de reforma escolhido pela analista */
  renovationLevel: RenovationLevel;
  renovationOverrides?: RenovationItemOverride[];
  exitHorizonDays?: ExitHorizonDays;
  /** Lance de referência para o underwriting (ex.: lance mínimo da 2ª praça) */
  referenceBid: Cents;
  evictionMonths?: number | null;
  evictionCost?: Cents | null;
  holdingMonths?: number | null;
  asOf?: string;
  maxBidOverrideJustification?: string | null;
}

export interface RenovationOptionResult {
  level: RenovationLevel;
  estimate: RenovationEstimate;
  exitValue: Cents;
  months: number;
  underwriting: UnderwritingResult;
  isSelected: boolean;
  isBest: boolean;
}

export interface OpportunityAnalysis {
  valuation: ValuationResult;
  renovation: RenovationEstimate;
  exitHorizonDays: ExitHorizonDays;
  exitValue: Cents | null;
  months: number;
  underwriting: UnderwritingResult | null;
  scenarios: ScenarioResult[] | null;
  sensitivityPriceMonths: SensitivityMatrix | null;
  sensitivityPriceRenovation: SensitivityMatrix | null;
  maxBid: MaxBidResult | null;
  renovationOptions: RenovationOptionResult[];
  /** Triagem: passa nos critérios do perfil? */
  screening: ScreeningResult;
  meta: Record<string, { status: EpistemicStatus; source: string }>;
}

export interface ScreeningResult {
  verdict: "MERECE_ANALISE" | "ANALISAR_COM_RESSALVAS" | "DESCARTAR" | "SEM_DADOS";
  reasons: string[];
}

function monthsFor(profile: InvestmentProfile, renovation: RenovationEstimate, evictionMonths: number, holdingMonths: number | null | undefined): number {
  const reno = weeksToMonths(renovation.durationWeeks.likely);
  return Math.max(1, Math.round(evictionMonths + reno + (holdingMonths ?? profile.defaultHoldingMonths)));
}

export function analyzeOpportunity(input: OpportunityInput): OpportunityAnalysis {
  const { subject, profile } = input;
  const horizon = input.exitHorizonDays ?? profile.defaultExitHorizonDays;
  const occupancy: Occupancy = subject.occupancy ?? "DESCONHECIDO";
  const evictionMonths = input.evictionMonths ?? (occupancy === "DESOCUPADO" ? 0 : profile.defaultEvictionMonthsIfOccupied);
  const evictionCost = input.evictionCost ?? (occupancy === "DESOCUPADO" ? 0 : profile.defaultEvictionCostIfOccupied);
  const atypicalCritical = (subject.atypicalFlags ?? []).some((f) => f.severity === "CRITICAL");

  const meta: OpportunityAnalysis["meta"] = {};
  if (subject.auctionCommissionRate !== null && subject.auctionCommissionRate !== undefined) meta.commission = { status: "FACT", source: "edital" };
  if ((subject.condoDebt ?? 0) + (subject.iptuDebt ?? 0) > 0) meta.debts = { status: "FACT", source: "edital" };
  meta.eviction = { status: input.evictionMonths !== null && input.evictionMonths !== undefined ? "ESTIMATE" : "HYPOTHESIS", source: occupancy === "DESOCUPADO" ? "imóvel desocupado" : `ocupação ${occupancy}: ${evictionMonths} meses (perfil)` };

  const costs = { ...profile.costs, ...(subject.auctionCommissionRate !== null && subject.auctionCommissionRate !== undefined ? { auctioneerCommissionRate: subject.auctionCommissionRate } : {}) };

  const factoryFor = (renovationCents: Cents, renovationMonths: number, months: number): BidInputFactory => (bid, exitValue): UnderwritingInput => ({
    bid,
    exitValue,
    months,
    renovation: renovationCents,
    renovationMonths,
    monthlyCondo: subject.monthlyCondo ?? 0,
    monthlyIptu: subject.monthlyIptu ?? 0,
    condoDebt: subject.condoDebt ?? 0,
    iptuDebt: subject.iptuDebt ?? 0,
    evictionCost,
    evictionMonths,
    costs,
    teamFee: profile.teamFee,
    meta,
  });

  // Todas as opções de reforma (para o ponto ótimo), inclusive a selecionada
  const renovationOptions: RenovationOptionResult[] = [];
  for (const level of RENOVATION_LEVELS) {
    const estimate = estimateRenovation(
      { type: subject.type, usableAreaM2: subject.usableAreaM2, ageYears: subject.ageYears, condition: subject.condition, targetStandard: subject.buildingStandard, atypicalCritical },
      level,
      { table: profile.renovationTable, regionFactor: profile.regionFactor, overrides: level === input.renovationLevel ? input.renovationOverrides : undefined },
    );
    const targetCondition: Condition = conditionAfterRenovation(subject.condition, level);
    const val = computeValuation(subject, input.comparables, { config: profile.valuation, targetCondition: level === "NONE" ? null : targetCondition, asOf: input.asOf });
    const exitValue = val.exitValues ? val.exitValues[horizon].amount : 0;
    const months = monthsFor(profile, estimate, evictionMonths, input.holdingMonths);
    const renoMonths = Math.max(1, Math.round(weeksToMonths(estimate.durationWeeks.likely)));
    const uw = computeUnderwriting(factoryFor(estimate.total.likely, renoMonths, months)(input.referenceBid, exitValue));
    renovationOptions.push({ level, estimate, exitValue, months, underwriting: uw, isSelected: level === input.renovationLevel, isBest: false });
  }
  const feasible = renovationOptions.filter((o) => o.exitValue > 0);
  if (feasible.length > 0) {
    const best = feasible.reduce((a, b) => ((b.underwriting.metrics.roi ?? -Infinity) > (a.underwriting.metrics.roi ?? -Infinity) ? b : a));
    best.isBest = true;
  }

  const selected = renovationOptions.find((o) => o.isSelected)!;
  const targetCondition = conditionAfterRenovation(subject.condition, input.renovationLevel);
  const valuation = computeValuation(subject, input.comparables, {
    config: profile.valuation,
    targetCondition: input.renovationLevel === "NONE" ? null : targetCondition,
    asOf: input.asOf,
  });

  const screening = screen(valuation, selected.underwriting, profile, subject);

  if (!valuation.exitValues) {
    return {
      valuation,
      renovation: selected.estimate,
      exitHorizonDays: horizon,
      exitValue: null,
      months: selected.months,
      underwriting: null,
      scenarios: null,
      sensitivityPriceMonths: null,
      sensitivityPriceRenovation: null,
      maxBid: null,
      renovationOptions,
      screening,
      meta,
    };
  }

  const exitRange = valuation.exitValues[horizon];
  const renoMonths = Math.max(1, Math.round(weeksToMonths(selected.estimate.durationWeeks.likely)));
  const factory = factoryFor(selected.estimate.total.likely, renoMonths, selected.months);
  const baseInput = factory(input.referenceBid, exitRange.amount);
  const underwriting = computeUnderwriting(baseInput);
  const scenarios = buildScenarios({
    base: baseInput,
    exitRange,
    quickSale: valuation.quickSale ?? exitRange.low,
    renovationRange: selected.estimate.total,
    occupancy,
    config: profile.scenarios,
  });
  const maxBid = computeMaxBid(
    factory,
    { conservative: exitRange.low, base: exitRange.amount },
    { minRoi: profile.minRoi, targetRoi: profile.targetRoi, minProfit: profile.minProfit, minIrrAnnual: profile.minIrrAnnual, maxCapital: profile.maxCapital },
    { valuationStatus: valuation.status, overrideJustification: input.maxBidOverrideJustification ?? null },
  );

  return {
    valuation,
    renovation: selected.estimate,
    exitHorizonDays: horizon,
    exitValue: exitRange.amount,
    months: selected.months,
    underwriting,
    scenarios,
    sensitivityPriceMonths: sensitivityPriceByMonths(baseInput),
    sensitivityPriceRenovation: sensitivityPriceByRenovation(baseInput, selected.estimate.total),
    maxBid,
    renovationOptions,
    screening,
    meta,
  };
}

/** Triagem econômica rápida: "este imóvel merece ser analisado?" */
export function screen(valuation: ValuationResult, uw: UnderwritingResult, profile: InvestmentProfile, subject: OpportunityInput["subject"]): ScreeningResult {
  const reasons: string[] = [];
  if (!valuation.marketValue) return { verdict: "SEM_DADOS", reasons: ["Sem comparáveis: cadastre ao menos 3 para triar."] };
  if (valuation.status === "ATYPICAL") reasons.push("Caso atípico: exige validação especializada antes de qualquer conclusão.");
  if (valuation.status === "INSUFFICIENT_DATA") reasons.push("Valuation com dados insuficientes: conclusão preliminar.");
  if (!profile.acceptedPropertyTypes.includes(subject.type)) reasons.push(`Tipo ${subject.type} fora do perfil.`);
  const roi = uw.metrics.roi ?? 0;
  if (roi < profile.minRoi) reasons.push(`ROI preliminar ${(roi * 100).toFixed(1)}% abaixo do mínimo ${(profile.minRoi * 100).toFixed(0)}% no lance de referência.`);
  if (profile.maxCapital && uw.metrics.capitalNeeded > profile.maxCapital) reasons.push("Capital necessário acima do teto do perfil.");
  if (profile.maxMonths && uw.metrics.months > profile.maxMonths) reasons.push("Prazo estimado acima do máximo do perfil.");
  if (profile.minProfit && uw.metrics.netProfit < profile.minProfit) reasons.push("Lucro estimado abaixo do mínimo do perfil.");

  const hard = reasons.filter((r) => r.startsWith("ROI") || r.startsWith("Capital") || r.startsWith("Tipo") || r.startsWith("Lucro"));
  if (hard.length > 0) return { verdict: "DESCARTAR", reasons };
  if (reasons.length > 0) return { verdict: "ANALISAR_COM_RESSALVAS", reasons };
  return { verdict: "MERECE_ANALISE", reasons: [`ROI preliminar ${(roi * 100).toFixed(1)}% no lance de referência; capital e prazo dentro do perfil.`] };
}
