import { applyRate, roundCents, sumCents } from "../money";
import type { BuildingStandard, Cents, Condition, EpistemicStatus, PropertyType, Range, RenovationLevel } from "../types";
import {
  DEFAULT_RENOVATION_TABLE,
  RENOVATION_CATEGORY_LABELS,
  appliesToType,
  type RenovationCategory,
  type RenovationReferenceTable,
} from "./config";

export * from "./config";

export interface RenovationSubject {
  type: PropertyType;
  usableAreaM2: number;
  ageYears?: number | null;
  condition?: Condition | null;
  /** Padrão que o imóvel terá após a reforma (define custo dos acabamentos) */
  targetStandard?: BuildingStandard | null;
  atypicalCritical?: boolean;
}

export interface RenovationItemOverride {
  category: RenovationCategory;
  low: Cents;
  likely: Cents;
  high: Cents;
  source: string;
  basis: "QUOTE" | "MANUAL";
}

export interface RenovationOptions {
  table?: RenovationReferenceTable;
  /** Fator regional de custo (1,0 = base da tabela) */
  regionFactor?: number;
  /** Itens com orçamento real substituem a tabela (viram FATO com fonte) */
  overrides?: RenovationItemOverride[];
  /** Sobrescreve a contingência do nível */
  contingencyRate?: number | null;
}

export interface RenovationItem {
  category: RenovationCategory;
  label: string;
  low: Cents;
  likely: Cents;
  high: Cents;
  basis: "REFERENCE_TABLE" | "QUOTE" | "MANUAL" | "DERIVED";
  epistemicStatus: EpistemicStatus;
  source: string;
  note?: string;
}

export interface RenovationEstimate {
  level: RenovationLevel;
  items: RenovationItem[];
  subtotal: Range;
  project: Range;
  contingency: Range;
  contingencyRate: number;
  total: Range;
  durationWeeks: { low: number; likely: number; high: number };
  factors: { standard: number; age: number; condition: number; region: number };
  requiresProfessionalQuote: boolean;
  warnings: string[];
}

const AGE_SENSITIVE: RenovationCategory[] = ["ELETRICA", "HIDRAULICA", "ESTRUTURA", "TELHADO"];

function zeroRange(): Range {
  return { low: 0, likely: 0, high: 0 };
}

function sumRanges(ranges: Range[]): Range {
  return {
    low: sumCents(ranges.map((r) => r.low)),
    likely: sumCents(ranges.map((r) => r.likely)),
    high: sumCents(ranges.map((r) => r.high)),
  };
}

function scaleRange(r: Range, rate: number): Range {
  return { low: applyRate(r.low, rate), likely: applyRate(r.likely, rate), high: applyRate(r.high, rate) };
}

/**
 * Estimador de reforma sem vistoria. Sempre devolve baixa/provável/alta.
 * Cada item informa a base (tabela de referência = HIPÓTESE; orçamento = FATO).
 */
export function estimateRenovation(subject: RenovationSubject, level: RenovationLevel, options: RenovationOptions = {}): RenovationEstimate {
  const table = options.table ?? DEFAULT_RENOVATION_TABLE;
  const region = options.regionFactor ?? 1;
  const warnings: string[] = [];

  if (level === "NONE") {
    return {
      level,
      items: [],
      subtotal: zeroRange(),
      project: zeroRange(),
      contingency: zeroRange(),
      contingencyRate: 0,
      total: zeroRange(),
      durationWeeks: { low: 0, likely: 0, high: 0 },
      factors: { standard: 1, age: 1, condition: 1, region },
      requiresProfessionalQuote: false,
      warnings: ["Sem reforma: o imóvel será vendido no estado atual."],
    };
  }

  const standard = subject.targetStandard ?? "MEDIO";
  const standardFactor = table.standardFactor[standard];
  const age = subject.ageYears ?? null;
  const ageFactor = age === null ? 1.05 : age > 50 ? table.ageFactor.over50 : age > 30 ? table.ageFactor.over30 : 1;
  if (age === null) warnings.push("Idade do imóvel não informada: fator de idade assumido em 1,05.");
  const conditionFactor = subject.condition ? table.conditionFactor[subject.condition] : 1.05;
  if (!subject.condition) warnings.push("Estado de conservação não informado: fator assumido em 1,05.");
  const spread = table.spread[level];
  const overrides = new Map((options.overrides ?? []).map((o) => [o.category, o]));

  const items: RenovationItem[] = [];
  for (const [categoryKey, levels] of Object.entries(table.perM2) as [Exclude<RenovationCategory, "PROJETO" | "CONTINGENCIA">, Record<string, number>][]) {
    const category = categoryKey;
    const override = overrides.get(category);
    if (override) {
      items.push({
        category,
        label: RENOVATION_CATEGORY_LABELS[category],
        low: override.low,
        likely: override.likely,
        high: override.high,
        basis: override.basis,
        epistemicStatus: override.basis === "QUOTE" ? "FACT" : "ESTIMATE",
        source: override.source,
      });
      continue;
    }
    if (!appliesToType(category, subject.type, table)) continue;
    const perM2 = levels[level] ?? 0;
    if (perM2 === 0) continue;
    const f = standardFactor * conditionFactor * region * (AGE_SENSITIVE.includes(category) ? ageFactor : 1);
    const likelyReais = perM2 * subject.usableAreaM2 * f;
    const likely = roundCents(likelyReais * 100);
    items.push({
      category,
      label: RENOVATION_CATEGORY_LABELS[category],
      low: roundCents(likely * (1 - spread.low)),
      likely,
      high: roundCents(likely * (1 + spread.high)),
      basis: "REFERENCE_TABLE",
      epistemicStatus: "HYPOTHESIS",
      source: `tabela de referência · ${perM2} R$/m² × ${subject.usableAreaM2} m² × fator ${f.toFixed(2)}`,
    });
  }

  const subtotal = sumRanges(items);
  const project = scaleRange(subtotal, table.projectRate[level]);
  const contingencyRate = options.contingencyRate ?? table.contingencyRate[level];
  const contingency = scaleRange(sumRanges([subtotal, project]), contingencyRate);
  const total = sumRanges([subtotal, project, contingency]);

  if (table.projectRate[level] > 0) {
    items.push({
      category: "PROJETO",
      label: RENOVATION_CATEGORY_LABELS.PROJETO,
      ...project,
      basis: "DERIVED",
      epistemicStatus: "HYPOTHESIS",
      source: `${(table.projectRate[level] * 100).toFixed(0)}% do subtotal`,
    });
  }
  items.push({
    category: "CONTINGENCIA",
    label: RENOVATION_CATEGORY_LABELS.CONTINGENCIA,
    ...contingency,
    basis: "DERIVED",
    epistemicStatus: "HYPOTHESIS",
    source: `${(contingencyRate * 100).toFixed(0)}% sobre subtotal + projeto`,
  });

  const areaScale = Math.max(0.6, Math.min(2.5, subject.usableAreaM2 / 100));
  const d = table.durationWeeks[level];
  const durationWeeks = {
    low: Math.max(1, Math.round(d.low * Math.sqrt(areaScale))),
    likely: Math.max(1, Math.round(d.likely * Math.sqrt(areaScale))),
    high: Math.max(1, Math.round(d.high * Math.sqrt(areaScale))),
  };

  const requiresProfessionalQuote = (level === "HEAVY" || level === "FULL") && !!subject.atypicalCritical;
  if (requiresProfessionalQuote) warnings.push("Reforma pesada/integral em imóvel atípico: exigir orçamento profissional antes de aprovar.");
  if (level === "HEAVY" || level === "FULL") warnings.push("Nível pesado/integral: a tabela de referência tem alta incerteza; considere vistoria ou orçamento.");

  return {
    level,
    items,
    subtotal,
    project,
    contingency,
    contingencyRate,
    total,
    durationWeeks,
    factors: { standard: standardFactor, age: ageFactor, condition: conditionFactor, region },
    requiresProfessionalQuote,
    warnings,
  };
}

export function weeksToMonths(weeks: number): number {
  return weeks / 4.345;
}
