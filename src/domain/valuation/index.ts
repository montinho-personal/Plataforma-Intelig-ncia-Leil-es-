import { roundCents } from "../money";
import type {
  AtypicalFlag,
  BuildingStandard,
  Cents,
  Condition,
  ExitHorizonDays,
  Explanation,
  LiquidityClass,
  PropertyType,
} from "../types";
import { EXIT_HORIZONS } from "../types";
import { DEFAULT_VALUATION_CONFIG, type ValuationConfig, type ValuationWeights } from "./config";

export * from "./config";

export interface SubjectProperty {
  type: PropertyType;
  usableAreaM2: number;
  bedrooms?: number | null;
  suites?: number | null;
  parking?: number | null;
  floor?: number | null;
  ageYears?: number | null;
  buildingStandard?: BuildingStandard | null;
  condition?: Condition | null;
  atypicalFlags?: AtypicalFlag[];
  /** Classe de liquidez do micromercado/tipologia (informada; F4 deriva de estoque) */
  liquidityClass?: LiquidityClass | null;
}

export type ComparableKind = "LISTING" | "SOLD" | "GROUP_HISTORY";

export interface ComparableInput {
  id: string;
  kind: ComparableKind;
  priceCents: Cents;
  usableAreaM2: number;
  type?: PropertyType | null;
  bedrooms?: number | null;
  parking?: number | null;
  floor?: number | null;
  ageYears?: number | null;
  buildingStandard?: BuildingStandard | null;
  condition?: Condition | null;
  sameCondo?: boolean | null;
  sameStreet?: boolean | null;
  sameNeighborhood?: boolean | null;
  distanceM?: number | null;
  /** ISO date de captura do anúncio/venda */
  capturedAt?: string | null;
  daysOnMarket?: number | null;
  excluded?: boolean;
  excludedReason?: string | null;
}

export interface AdjustmentDetail {
  factor: string;
  delta: number;
  note: string;
}

export interface ComparableAssessment {
  id: string;
  included: boolean;
  exclusionReason?: string;
  similarity: number;
  weight: number;
  rawPricePerM2: number;
  adjustedPricePerM2: number;
  adjustments: AdjustmentDetail[];
  weak: boolean;
  similarityBreakdown: Record<keyof ValuationConfig["weights"], number>;
}

export interface ValueRange {
  amount: Cents;
  low: Cents;
  high: Cents;
}

export type ValuationStatus = "OK" | "INSUFFICIENT_DATA" | "ATYPICAL";

export interface ValuationStats {
  n: number;
  included: number;
  effectiveN: number;
  medianPricePerM2: number;
  meanPricePerM2: number;
  p25PricePerM2: number;
  p75PricePerM2: number;
  coefficientOfVariation: number;
  averageSimilarity: number;
  averageDataAgeDays: number | null;
  soldShare: number;
  askingMedianPricePerM2: number;
}

export interface ValuationResult {
  status: ValuationStatus;
  statusReasons: string[];
  comparables: ComparableAssessment[];
  stats: ValuationStats | null;
  /** Mediana dos preços anunciados (referência, não é valor de mercado) */
  askingReference: Cents | null;
  marketValue: ValueRange | null;
  conservative: Cents | null;
  probableSale: Cents | null;
  quickSale: Cents | null;
  optimistic: Cents | null;
  /** Valor de mercado recalculado no estado/padrão pós-reforma (quando informado) */
  postRenovationMarket: ValueRange | null;
  postRenovationProbableSale: Cents | null;
  /** Valor de saída do investidor por prazo, na base pós-reforma quando houver */
  exitValues: Record<ExitHorizonDays, ValueRange> | null;
  liquidityClass: LiquidityClass;
  suggestedLiquidityClass: LiquidityClass | null;
  confidence: number;
  confidenceFactors: Explanation[];
  assumptions: Explanation[];
}

export interface ValuationOptions {
  config?: ValuationConfig;
  /** Estado de conservação após a reforma planejada */
  targetCondition?: Condition | null;
  targetStandard?: BuildingStandard | null;
  /** Data de referência para idade dos dados */
  asOf?: string;
}

const CONDITION_ORDER: Condition[] = ["RUIM", "REGULAR", "BOM", "REFORMADO", "NOVO"];
const STANDARD_ORDER: BuildingStandard[] = ["ECONOMICO", "MEDIO", "ALTO", "LUXO"];

function stepDistance<T>(order: T[], a: T | null | undefined, b: T | null | undefined): number | null {
  if (a === null || a === undefined || b === null || b === undefined) return null;
  return Math.abs(order.indexOf(a) - order.indexOf(b));
}

function locationSimilarity(c: ComparableInput): number {
  if (c.sameCondo) return 1;
  if (c.sameStreet) return 0.85;
  if (c.distanceM !== null && c.distanceM !== undefined) {
    if (c.distanceM <= 300) return 0.75;
    if (c.distanceM <= 1000) return c.sameNeighborhood === false ? 0.45 : 0.55;
    if (c.distanceM <= 2500) return 0.3;
    return 0.1;
  }
  if (c.sameNeighborhood) return 0.6;
  return 0.4;
}

function areaSimilarity(subjectArea: number, compArea: number): number {
  const rel = Math.abs(compArea - subjectArea) / subjectArea;
  return Math.max(0.05, 1 - rel / 0.5);
}

function countSimilarity(a: number | null | undefined, b: number | null | undefined, unknown: number, ladder: number[]): number {
  if (a === null || a === undefined || b === null || b === undefined) return unknown;
  const d = Math.abs(a - b);
  return ladder[Math.min(d, ladder.length - 1)] ?? 0;
}

function floorSimilarity(subject: SubjectProperty, c: ComparableInput): number {
  if (subject.type !== "APARTAMENTO") return 1;
  if (subject.floor === null || subject.floor === undefined || c.floor === null || c.floor === undefined) return 0.7;
  const d = Math.abs(subject.floor - c.floor);
  if (d <= 2) return 1;
  if (d <= 5) return 0.8;
  return 0.6;
}

function ageSimilarity(a: number | null | undefined, b: number | null | undefined): number {
  if (a === null || a === undefined || b === null || b === undefined) return 0.6;
  const d = Math.abs(a - b);
  if (d <= 5) return 1;
  if (d <= 15) return 0.7;
  return 0.4;
}

function ordinalSimilarity<T>(order: T[], a: T | null | undefined, b: T | null | undefined, ladder: number[], unknown: number): number {
  const d = stepDistance(order, a, b);
  if (d === null) return unknown;
  return ladder[Math.min(d, ladder.length - 1)] ?? 0;
}

function computeSimilarity(subject: SubjectProperty, c: ComparableInput, config: ValuationConfig) {
  const breakdown = {
    location: locationSimilarity(c),
    area: areaSimilarity(subject.usableAreaM2, c.usableAreaM2),
    bedrooms: countSimilarity(subject.bedrooms, c.bedrooms, 0.5, [1, 0.6, 0.3, 0.1]),
    parking: countSimilarity(subject.parking, c.parking, 0.5, [1, 0.7, 0.4, 0.2]),
    floor: floorSimilarity(subject, c),
    age: ageSimilarity(subject.ageYears, c.ageYears),
    standard: ordinalSimilarity(STANDARD_ORDER, subject.buildingStandard, c.buildingStandard, [1, 0.6, 0.2, 0.1], 0.5),
    condition: ordinalSimilarity(CONDITION_ORDER, subject.condition, c.condition, [1, 0.7, 0.4, 0.2, 0.1], 0.6),
  };
  const w = config.weights;
  const totalW = Object.values(w).reduce((a, b) => a + b, 0);
  // Média geométrica ponderada: uma divergência forte em qualquer atributo (sobretudo localização)
  // penaliza o comparável como um todo, em vez de ser diluída pela média aritmética.
  const keys = Object.keys(w) as (keyof ValuationWeights)[];
  const logSum = keys.reduce((acc, k) => acc + (w[k] / totalW) * Math.log(Math.max(0.05, breakdown[k])), 0);
  const similarity = Math.exp(logSum);
  return { similarity, breakdown };
}

function computeAdjustments(
  subject: SubjectProperty,
  c: ComparableInput,
  config: ValuationConfig,
  effectiveCondition: Condition | null | undefined,
  effectiveStandard: BuildingStandard | null | undefined,
): AdjustmentDetail[] {
  const adj = config.adjustments;
  const out: AdjustmentDetail[] = [];

  if (effectiveCondition && c.condition) {
    const delta = adj.condition[effectiveCondition] - adj.condition[c.condition];
    if (delta !== 0) out.push({ factor: "condition", delta, note: `estado ${c.condition} → ${effectiveCondition}` });
  }
  if (effectiveStandard && c.buildingStandard) {
    const delta = adj.standard[effectiveStandard] - adj.standard[c.buildingStandard];
    if (delta !== 0) out.push({ factor: "standard", delta, note: `padrão ${c.buildingStandard} → ${effectiveStandard}` });
  }
  if (subject.parking !== null && subject.parking !== undefined && c.parking !== null && c.parking !== undefined) {
    const diff = subject.parking - c.parking;
    if (diff !== 0) out.push({ factor: "parking", delta: diff * adj.perParkingSpot, note: `${diff > 0 ? "+" : ""}${diff} vaga(s)` });
  }
  if (subject.bedrooms !== null && subject.bedrooms !== undefined && c.bedrooms !== null && c.bedrooms !== undefined) {
    const diff = subject.bedrooms - c.bedrooms;
    if (diff !== 0) out.push({ factor: "bedrooms", delta: diff * adj.perBedroom, note: `${diff > 0 ? "+" : ""}${diff} dorm.` });
  }
  if (subject.type === "APARTAMENTO" && subject.floor !== null && subject.floor !== undefined && c.floor !== null && c.floor !== undefined) {
    const diff = subject.floor - c.floor;
    const raw = diff * adj.perFloor;
    const delta = Math.max(-adj.perFloorCap, Math.min(adj.perFloorCap, raw));
    if (delta !== 0) out.push({ factor: "floor", delta, note: `${diff > 0 ? "+" : ""}${diff} andar(es)` });
  }
  if (c.kind === "LISTING") {
    out.push({ factor: "askingToClosing", delta: -config.askingToClosingDiscount, note: "anúncio → fechamento" });
    if (c.daysOnMarket !== null && c.daysOnMarket !== undefined && c.daysOnMarket >= adj.staleListingDays) {
      out.push({ factor: "staleListing", delta: -adj.staleListingDiscount, note: `anúncio há ${c.daysOnMarket} dias` });
    }
  }
  return out;
}

function applyAdjustments(ppm2: number, adjustments: AdjustmentDetail[]): number {
  return adjustments.reduce((acc, a) => acc * (1 + a.delta), ppm2);
}

interface WeightedPoint {
  value: number;
  weight: number;
}

function weightedQuantile(points: WeightedPoint[], q: number): number {
  const sorted = [...points].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((a, p) => a + p.weight, 0);
  if (total === 0) return NaN;
  let cum = 0;
  for (const p of sorted) {
    cum += p.weight;
    if (cum / total >= q) return p.value;
  }
  return sorted[sorted.length - 1]!.value;
}

function weightedMean(points: WeightedPoint[]): number {
  const total = points.reduce((a, p) => a + p.weight, 0);
  return points.reduce((a, p) => a + p.value * p.weight, 0) / total;
}

function weightedCv(points: WeightedPoint[]): number {
  const mean = weightedMean(points);
  const total = points.reduce((a, p) => a + p.weight, 0);
  const variance = points.reduce((a, p) => a + p.weight * Math.pow(p.value - mean, 2), 0) / total;
  return mean === 0 ? 0 : Math.sqrt(variance) / mean;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2 : (s[mid] ?? 0);
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / (24 * 3600 * 1000));
}

function assessComparables(
  subject: SubjectProperty,
  comparables: ComparableInput[],
  config: ValuationConfig,
  effectiveCondition: Condition | null | undefined,
  effectiveStandard: BuildingStandard | null | undefined,
): ComparableAssessment[] {
  return comparables.map((c) => {
    const rawPpm2 = c.usableAreaM2 > 0 ? c.priceCents / c.usableAreaM2 : 0;
    const invalid = c.usableAreaM2 <= 0 || c.priceCents <= 0;
    const { similarity, breakdown } = computeSimilarity(subject, c, config);
    const adjustments = computeAdjustments(subject, c, config, effectiveCondition, effectiveStandard);
    const adjusted = applyAdjustments(rawPpm2, adjustments);
    const included = !c.excluded && !invalid;
    return {
      id: c.id,
      included,
      exclusionReason: c.excluded ? (c.excludedReason ?? "excluído pela analista") : invalid ? "área ou preço inválido" : undefined,
      similarity,
      weight: included ? similarity * similarity : 0,
      rawPricePerM2: rawPpm2,
      adjustedPricePerM2: adjusted,
      adjustments,
      weak: similarity < config.weakSimilarityThreshold,
      similarityBreakdown: breakdown,
    };
  });
}

function computeStats(assessed: ComparableAssessment[], comparables: ComparableInput[], asOf: string): ValuationStats | null {
  const included = assessed.filter((a) => a.included && a.weight > 0);
  if (included.length === 0) return null;
  const points = included.map((a) => ({ value: a.adjustedPricePerM2, weight: a.weight }));
  const byId = new Map(comparables.map((c) => [c.id, c]));
  const ages = included
    .map((a) => byId.get(a.id)?.capturedAt)
    .filter((d): d is string => !!d)
    .map((d) => daysBetween(d, asOf));
  const soldCount = included.filter((a) => byId.get(a.id)?.kind !== "LISTING").length;
  return {
    n: assessed.length,
    included: included.length,
    effectiveN: included.reduce((acc, a) => acc + a.similarity, 0),
    medianPricePerM2: weightedQuantile(points, 0.5),
    meanPricePerM2: weightedMean(points),
    p25PricePerM2: weightedQuantile(points, 0.25),
    p75PricePerM2: weightedQuantile(points, 0.75),
    coefficientOfVariation: included.length > 1 ? weightedCv(points) : 0,
    averageSimilarity: included.reduce((acc, a) => acc + a.similarity, 0) / included.length,
    averageDataAgeDays: ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : null,
    soldShare: soldCount / included.length,
    askingMedianPricePerM2: median(included.map((a) => a.rawPricePerM2)),
  };
}

function rangeFromStats(stats: ValuationStats, area: number): ValueRange {
  const minHalfWidth = 0.03;
  const low = Math.min(stats.p25PricePerM2, stats.medianPricePerM2 * (1 - minHalfWidth));
  const high = Math.max(stats.p75PricePerM2, stats.medianPricePerM2 * (1 + minHalfWidth));
  return {
    amount: roundCents(stats.medianPricePerM2 * area),
    low: roundCents(low * area),
    high: roundCents(high * area),
  };
}

function confidenceFrom(stats: ValuationStats | null, subject: SubjectProperty, flags: AtypicalFlag[]): { confidence: number; factors: Explanation[] } {
  const factors: Explanation[] = [];
  let score = 40;
  if (!stats) {
    return { confidence: 0, factors: [{ label: "Sem comparáveis válidos", value: -40 }] };
  }
  const nPts = stats.effectiveN >= 6 ? 20 : stats.effectiveN >= 4 ? 14 : stats.effectiveN >= 3 ? 8 : stats.effectiveN >= 2.5 ? 3 : -10;
  factors.push({ label: "n efetivo", value: nPts, note: `${stats.effectiveN.toFixed(1)} (${stats.included} incluídos)` });
  const cv = stats.coefficientOfVariation;
  const cvPts = cv <= 0.08 ? 15 : cv <= 0.12 ? 10 : cv <= 0.18 ? 5 : cv <= 0.25 ? 0 : -20;
  factors.push({ label: "dispersão", value: cvPts, note: `CV ${(cv * 100).toFixed(1)}%` });
  const s = stats.averageSimilarity;
  const sPts = s >= 0.8 ? 12 : s >= 0.65 ? 8 : s >= 0.5 ? 3 : -5;
  factors.push({ label: "similaridade média", value: sPts, note: s.toFixed(2) });
  if (stats.averageDataAgeDays !== null) {
    const d = stats.averageDataAgeDays;
    const dPts = d <= 30 ? 6 : d <= 90 ? 3 : d <= 180 ? 0 : -6;
    factors.push({ label: "idade dos dados", value: dPts, note: `${Math.round(d)} dias em média` });
  } else {
    factors.push({ label: "idade dos dados", value: -3, note: "datas de captura ausentes" });
  }
  const attrs: (keyof SubjectProperty)[] = ["bedrooms", "parking", "floor", "ageYears", "buildingStandard", "condition"];
  const known = attrs.filter((k) => subject[k] !== null && subject[k] !== undefined).length;
  const completeness = Math.round((known / attrs.length) * 7);
  factors.push({ label: "completude do imóvel", value: completeness, note: `${known}/${attrs.length} atributos informados` });
  if (stats.soldShare >= 0.5) factors.push({ label: "comparáveis vendidos/histórico", value: 5, note: `${Math.round(stats.soldShare * 100)}%` });
  const critical = flags.filter((f) => f.severity === "CRITICAL").length;
  const warnings = flags.filter((f) => f.severity === "WARNING").length;
  const atypPts = -Math.min(25, critical * 25 + warnings * 8);
  if (atypPts !== 0) factors.push({ label: "atipicidade", value: atypPts, note: `${critical} crítico(s), ${warnings} alerta(s)` });
  score += factors.reduce((a, f) => a + f.value, 0);
  return { confidence: Math.max(0, Math.min(100, Math.round(score))), factors };
}

function suggestLiquidity(comparables: ComparableInput[]): LiquidityClass | null {
  const dom = comparables.filter((c) => !c.excluded && c.daysOnMarket !== null && c.daysOnMarket !== undefined).map((c) => c.daysOnMarket as number);
  if (dom.length < 3) return null;
  const m = median(dom);
  if (m <= 45) return "ALTA";
  if (m <= 120) return "MEDIA";
  return "BAIXA";
}

/**
 * Valuation por comparáveis ajustados, com faixa e confiança.
 * Nunca usa o valor de avaliação do leilão. Nunca fabrica precisão: com dados insuficientes
 * retorna status INSUFFICIENT_DATA (os números ainda são calculados para exibição, mas não
 * devem alimentar o lance máximo sem override justificado).
 */
export function computeValuation(subject: SubjectProperty, comparables: ComparableInput[], options: ValuationOptions = {}): ValuationResult {
  const config = options.config ?? DEFAULT_VALUATION_CONFIG;
  const asOf = options.asOf ?? new Date().toISOString().slice(0, 10);
  const flags = subject.atypicalFlags ?? [];
  const liquidityClass: LiquidityClass = subject.liquidityClass ?? "MEDIA";
  const assumptions: Explanation[] = [
    { label: "Desconto anúncio → fechamento", value: config.askingToClosingDiscount, note: "hipótese do perfil; calibrar com histórico" },
    { label: "Concessão de saída do investidor", value: config.investorExitMargin, note: "hipótese do perfil" },
    { label: "Classe de liquidez", value: 0, note: liquidityClass },
  ];

  const assessed = assessComparables(subject, comparables, config, subject.condition, subject.buildingStandard);
  const stats = computeStats(assessed, comparables, asOf);
  const { confidence, factors } = confidenceFrom(stats, subject, flags);

  const statusReasons: string[] = [];
  let status: ValuationStatus = "OK";
  if (flags.some((f) => f.severity === "CRITICAL")) {
    status = "ATYPICAL";
    statusReasons.push("CASO ATÍPICO — NECESSITA VALIDAÇÃO ESPECIALIZADA");
    for (const f of flags.filter((x) => x.severity === "CRITICAL")) statusReasons.push(`${f.code}${f.note ? `: ${f.note}` : ""}`);
  }
  if (!stats || stats.included < config.minIncludedComparables) {
    if (status === "OK") status = "INSUFFICIENT_DATA";
    statusReasons.push(`menos de ${config.minIncludedComparables} comparáveis incluídos (${stats?.included ?? 0})`);
  } else {
    if (stats.effectiveN < config.minEffectiveN) {
      if (status === "OK") status = "INSUFFICIENT_DATA";
      statusReasons.push(`n efetivo ${stats.effectiveN.toFixed(1)} abaixo do mínimo ${config.minEffectiveN}`);
    }
    if (stats.coefficientOfVariation > config.maxCoefficientOfVariation) {
      if (status === "OK") status = "INSUFFICIENT_DATA";
      statusReasons.push(`dispersão ${(stats.coefficientOfVariation * 100).toFixed(0)}% acima do máximo ${(config.maxCoefficientOfVariation * 100).toFixed(0)}%`);
    }
  }

  const capped = capConfidence(confidence, status, factors);

  if (!stats) {
    return {
      status,
      statusReasons: statusReasons.length ? statusReasons : ["sem comparáveis"],
      comparables: assessed,
      stats: null,
      askingReference: null,
      marketValue: null,
      conservative: null,
      probableSale: null,
      quickSale: null,
      optimistic: null,
      postRenovationMarket: null,
      postRenovationProbableSale: null,
      exitValues: null,
      liquidityClass,
      suggestedLiquidityClass: suggestLiquidity(comparables),
      confidence: capped,
      confidenceFactors: factors,
      assumptions,
    };
  }

  const area = subject.usableAreaM2;
  const marketValue = rangeFromStats(stats, area);
  const probableSale = roundCents(marketValue.amount * (1 - config.investorExitMargin));
  const curve = config.liquidityCurve[liquidityClass];

  let postRenovationMarket: ValueRange | null = null;
  let postRenovationProbableSale: Cents | null = null;
  if (options.targetCondition || options.targetStandard) {
    const targetCondition = options.targetCondition ?? subject.condition;
    const targetStandard = options.targetStandard ?? subject.buildingStandard;
    const assessedPost = assessComparables(subject, comparables, config, targetCondition, targetStandard);
    const statsPost = computeStats(assessedPost, comparables, asOf);
    if (statsPost) {
      postRenovationMarket = rangeFromStats(statsPost, area);
      postRenovationProbableSale = roundCents(postRenovationMarket.amount * (1 - config.investorExitMargin));
    }
  }

  const exitBasis = postRenovationMarket ?? marketValue;
  const exitBasisProbable = postRenovationProbableSale ?? probableSale;
  const exitValues = {} as Record<ExitHorizonDays, ValueRange>;
  for (const h of EXIT_HORIZONS) {
    const d = curve[h];
    exitValues[h] = {
      amount: roundCents(exitBasisProbable * (1 - d)),
      low: roundCents(exitBasis.low * (1 - config.investorExitMargin) * (1 - d)),
      high: roundCents(exitBasis.high * (1 - config.investorExitMargin) * (1 - d)),
    };
  }

  return {
    status,
    statusReasons,
    comparables: assessed,
    stats,
    askingReference: roundCents(stats.askingMedianPricePerM2 * area),
    marketValue,
    conservative: marketValue.low,
    probableSale,
    quickSale: roundCents(probableSale * (1 - curve[30])),
    optimistic: marketValue.high,
    postRenovationMarket,
    postRenovationProbableSale,
    exitValues,
    liquidityClass,
    suggestedLiquidityClass: suggestLiquidity(comparables),
    confidence: capped,
    confidenceFactors: factors,
    assumptions,
  };
}

/** Valuation com dados insuficientes ou caso atípico nunca exibe confiança alta. */
function capConfidence(confidence: number, status: ValuationStatus, factors: Explanation[]): number {
  const cap = status === "INSUFFICIENT_DATA" ? 40 : status === "ATYPICAL" ? 50 : 100;
  if (confidence > cap) {
    factors.push({ label: "teto por status", value: cap - confidence, note: status === "INSUFFICIENT_DATA" ? "dados insuficientes" : "caso atípico" });
    return cap;
  }
  return confidence;
}

/** Regras de atipicidade a partir dos dados cadastrais e da faixa dos comparáveis. */
export function detectAtypicalFlags(input: {
  type: PropertyType;
  ageYears?: number | null;
  condition?: Condition | null;
  woodConstruction?: boolean | null;
  irregularConstruction?: boolean | null;
  registryAreaM2?: number | null;
  usableAreaM2: number;
  buildingStandard?: BuildingStandard | null;
  comparableAreas?: number[];
}): AtypicalFlag[] {
  const flags: AtypicalFlag[] = [];
  if (input.woodConstruction) flags.push({ code: "MADEIRA", severity: "CRITICAL", note: "construção em madeira: custo e valor fogem das tabelas" });
  if (input.type === "RURAL") flags.push({ code: "RURAL", severity: "CRITICAL", note: "imóvel rural: comparáveis urbanos não se aplicam" });
  if (input.irregularConstruction) flags.push({ code: "IRREGULAR", severity: "CRITICAL", note: "construção irregular / sem habite-se" });
  if ((input.ageYears ?? 0) > 60 && input.condition !== "REFORMADO" && input.condition !== "NOVO") {
    flags.push({ code: "MUITO_ANTIGO", severity: "WARNING", note: `${input.ageYears} anos sem reforma registrada` });
  }
  if (input.registryAreaM2 && input.usableAreaM2 > 0) {
    const div = Math.abs(input.registryAreaM2 - input.usableAreaM2) / input.usableAreaM2;
    if (div > 0.15) flags.push({ code: "AREA_DIVERGENTE", severity: "CRITICAL", note: `área da matrícula diverge ${(div * 100).toFixed(0)}% do cadastro` });
  }
  if (input.type === "COMERCIAL" && input.buildingStandard === "LUXO") flags.push({ code: "COMERCIAL_INCOMUM", severity: "WARNING" });
  if (input.comparableAreas && input.comparableAreas.length >= 3) {
    const sorted = [...input.comparableAreas].sort((a, b) => a - b);
    const min = sorted[0]!;
    const max = sorted[sorted.length - 1]!;
    if (input.usableAreaM2 < min * 0.6 || input.usableAreaM2 > max * 1.6) {
      flags.push({ code: "AREA_FORA_DA_FAIXA", severity: "WARNING", note: "área muito fora do intervalo dos comparáveis" });
    }
  }
  return flags;
}
