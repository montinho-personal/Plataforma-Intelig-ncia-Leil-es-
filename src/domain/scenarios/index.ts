import { roundCents } from "../money";
import type { Cents, Occupancy, Range, Rate } from "../types";
import { computeUnderwriting, type UnderwritingInput, type UnderwritingResult } from "../underwriting";
import type { ValueRange } from "../valuation";

export type ScenarioKey = "PESSIMISTA" | "CONSERVADOR" | "BASE" | "OTIMISTA";
export const SCENARIO_KEYS: ScenarioKey[] = ["PESSIMISTA", "CONSERVADOR", "BASE", "OTIMISTA"];

export interface ScenarioAssumptions {
  exitValue: Cents;
  exitLabel: string;
  months: number;
  renovation: Cents;
  renovationLabel: "baixa" | "provável" | "alta";
  evictionMonths: number;
  evictionCost: Cents;
  costMultiplier: number;
}

export interface ScenarioResult {
  key: ScenarioKey;
  assumptions: ScenarioAssumptions;
  underwriting: UnderwritingResult;
  /** Diferença de lucro em relação ao cenário BASE (loss framing) */
  profitDeltaVsBase: Cents;
}

export interface ScenarioConfig {
  /** Meses adicionais por cenário, relativos ao base */
  extraMonths: Record<ScenarioKey, number>;
  extraEvictionMonths: Record<ScenarioKey, number>;
  costMultiplier: Record<ScenarioKey, number>;
  /** Custo mensal de desocupação além do carregamento (hipótese) */
  evictionMonthlyCost: Cents;
}

export const DEFAULT_SCENARIO_CONFIG: ScenarioConfig = {
  extraMonths: { PESSIMISTA: 6, CONSERVADOR: 2, BASE: 0, OTIMISTA: -2 },
  extraEvictionMonths: { PESSIMISTA: 4, CONSERVADOR: 1, BASE: 0, OTIMISTA: 0 },
  costMultiplier: { PESSIMISTA: 1.1, CONSERVADOR: 1.05, BASE: 1, OTIMISTA: 1 },
  evictionMonthlyCost: 0,
};

export interface ScenarioInputs {
  base: UnderwritingInput;
  /** Valor de saída no prazo-alvo (faixa) */
  exitRange: ValueRange;
  /** Venda rápida (cenário pessimista) */
  quickSale: Cents;
  renovationRange: Range;
  occupancy?: Occupancy;
  config?: ScenarioConfig;
}

export function buildScenarios(inputs: ScenarioInputs): ScenarioResult[] {
  const cfg = inputs.config ?? DEFAULT_SCENARIO_CONFIG;
  const b = inputs.base;
  const occupiedOrUnknown = inputs.occupancy !== "DESOCUPADO";
  const renoMonthsBase = Math.max(1, b.renovationMonths);

  const defs: Record<ScenarioKey, ScenarioAssumptions> = {
    PESSIMISTA: {
      exitValue: Math.min(inputs.exitRange.low, inputs.quickSale),
      exitLabel: "menor entre saída conservadora e venda rápida",
      months: b.months + cfg.extraMonths.PESSIMISTA + (occupiedOrUnknown ? cfg.extraEvictionMonths.PESSIMISTA : 0),
      renovation: inputs.renovationRange.high,
      renovationLabel: "alta",
      evictionMonths: b.evictionMonths + (occupiedOrUnknown ? cfg.extraEvictionMonths.PESSIMISTA : 0),
      evictionCost: b.evictionCost + (occupiedOrUnknown ? cfg.extraEvictionMonths.PESSIMISTA * cfg.evictionMonthlyCost : 0),
      costMultiplier: cfg.costMultiplier.PESSIMISTA,
    },
    CONSERVADOR: {
      exitValue: inputs.exitRange.low,
      exitLabel: "saída conservadora",
      months: b.months + cfg.extraMonths.CONSERVADOR + (occupiedOrUnknown ? cfg.extraEvictionMonths.CONSERVADOR : 0),
      renovation: inputs.renovationRange.high,
      renovationLabel: "alta",
      evictionMonths: b.evictionMonths + (occupiedOrUnknown ? cfg.extraEvictionMonths.CONSERVADOR : 0),
      evictionCost: b.evictionCost + (occupiedOrUnknown ? cfg.extraEvictionMonths.CONSERVADOR * cfg.evictionMonthlyCost : 0),
      costMultiplier: cfg.costMultiplier.CONSERVADOR,
    },
    BASE: {
      exitValue: inputs.exitRange.amount,
      exitLabel: "saída provável",
      months: b.months,
      renovation: inputs.renovationRange.likely,
      renovationLabel: "provável",
      evictionMonths: b.evictionMonths,
      evictionCost: b.evictionCost,
      costMultiplier: cfg.costMultiplier.BASE,
    },
    OTIMISTA: {
      exitValue: inputs.exitRange.high,
      exitLabel: "saída otimista",
      months: Math.max(renoMonthsBase + 1, b.months + cfg.extraMonths.OTIMISTA),
      renovation: inputs.renovationRange.low,
      renovationLabel: "baixa",
      evictionMonths: b.evictionMonths,
      evictionCost: b.evictionCost,
      costMultiplier: cfg.costMultiplier.OTIMISTA,
    },
  };

  const results = SCENARIO_KEYS.map((key) => {
    const a = defs[key];
    const uw = computeUnderwriting({
      ...b,
      exitValue: a.exitValue,
      months: a.months,
      renovation: a.renovation,
      evictionMonths: a.evictionMonths,
      evictionCost: a.evictionCost,
      costMultiplier: a.costMultiplier,
    });
    return { key, assumptions: a, underwriting: uw, profitDeltaVsBase: 0 };
  });
  const baseProfit = results.find((r) => r.key === "BASE")!.underwriting.metrics.netProfit;
  return results.map((r) => ({ ...r, profitDeltaVsBase: r.underwriting.metrics.netProfit - baseProfit }));
}

export interface SensitivityCell {
  rowValue: number;
  colValue: number;
  roi: Rate | null;
  netProfit: Cents;
}

export interface SensitivityMatrix {
  rowLabel: string;
  colLabel: string;
  rows: number[];
  cols: number[];
  cells: SensitivityCell[][];
}

export const DEFAULT_PRICE_DELTAS = [-0.15, -0.1, -0.05, 0, 0.05, 0.1];
export const DEFAULT_MONTH_DELTAS = [-2, 0, 2, 4, 6];

/** Sensibilidade ROI/lucro a preço de venda × prazo. */
export function sensitivityPriceByMonths(base: UnderwritingInput, priceDeltas = DEFAULT_PRICE_DELTAS, monthDeltas = DEFAULT_MONTH_DELTAS): SensitivityMatrix {
  const cells = priceDeltas.map((pd) =>
    monthDeltas.map((md) => {
      const months = Math.max(1, base.months + md);
      const exitValue = roundCents(base.exitValue * (1 + pd));
      const m = computeUnderwriting({ ...base, exitValue, months }).metrics;
      return { rowValue: pd, colValue: months, roi: m.roi, netProfit: m.netProfit };
    }),
  );
  return { rowLabel: "Δ preço de venda", colLabel: "prazo (meses)", rows: priceDeltas, cols: monthDeltas.map((d) => Math.max(1, base.months + d)), cells };
}

/** Sensibilidade lucro a preço de venda × reforma (baixa/provável/alta). */
export function sensitivityPriceByRenovation(base: UnderwritingInput, renovationRange: Range, priceDeltas = DEFAULT_PRICE_DELTAS): SensitivityMatrix {
  const renos = [renovationRange.low, renovationRange.likely, renovationRange.high];
  const cells = priceDeltas.map((pd) =>
    renos.map((reno) => {
      const exitValue = roundCents(base.exitValue * (1 + pd));
      const m = computeUnderwriting({ ...base, exitValue, renovation: reno }).metrics;
      return { rowValue: pd, colValue: reno, roi: m.roi, netProfit: m.netProfit };
    }),
  );
  return { rowLabel: "Δ preço de venda", colLabel: "reforma", rows: priceDeltas, cols: renos, cells };
}
