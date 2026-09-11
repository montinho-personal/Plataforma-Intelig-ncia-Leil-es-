import type { BuildingStandard, Condition, PropertyType, Rate, RenovationLevel } from "../types";

export type RenovationCategory =
  | "PINTURA"
  | "ELETRICA"
  | "HIDRAULICA"
  | "PISOS"
  | "REVESTIMENTOS"
  | "COZINHA"
  | "BANHEIROS"
  | "MARCENARIA"
  | "ILUMINACAO"
  | "GESSO"
  | "CLIMATIZACAO"
  | "PAISAGISMO"
  | "FACHADA"
  | "TELHADO"
  | "ESTRUTURA"
  | "LIMPEZA"
  | "DEMOLICAO"
  | "CACAMBA"
  | "MAO_DE_OBRA"
  | "PROJETO"
  | "CONTINGENCIA";

export const RENOVATION_CATEGORY_LABELS: Record<RenovationCategory, string> = {
  PINTURA: "Pintura",
  ELETRICA: "Elétrica",
  HIDRAULICA: "Hidráulica",
  PISOS: "Pisos",
  REVESTIMENTOS: "Revestimentos",
  COZINHA: "Cozinha",
  BANHEIROS: "Banheiros",
  MARCENARIA: "Marcenaria",
  ILUMINACAO: "Iluminação",
  GESSO: "Gesso",
  CLIMATIZACAO: "Climatização",
  PAISAGISMO: "Paisagismo",
  FACHADA: "Fachada",
  TELHADO: "Telhado",
  ESTRUTURA: "Estrutura",
  LIMPEZA: "Limpeza",
  DEMOLICAO: "Demolição",
  CACAMBA: "Caçamba",
  MAO_DE_OBRA: "Mão de obra (gestão de obra)",
  PROJETO: "Projeto",
  CONTINGENCIA: "Contingência",
};

export const RENOVATION_LEVEL_LABELS: Record<RenovationLevel, string> = {
  NONE: "Sem reforma",
  COSMETIC: "Cosmética",
  LIGHT: "Leve",
  MEDIUM: "Média",
  HEAVY: "Pesada",
  FULL: "Integral",
};

type LevelTable = Record<Exclude<RenovationLevel, "NONE">, number>;

/**
 * Tabela de referência: valor PROVÁVEL em R$/m² de área útil (material + mão de obra), padrão MÉDIO,
 * região base (fator 1,0). HIPÓTESE editável no perfil do grupo. Não substitui orçamento.
 * Categorias que só se aplicam a casas (telhado, fachada, paisagismo) são zeradas para apartamentos.
 */
export interface RenovationReferenceTable {
  perM2: Record<Exclude<RenovationCategory, "PROJETO" | "CONTINGENCIA">, LevelTable>;
  /** Projeto como fração do subtotal */
  projectRate: LevelTable;
  /** Contingência como fração do subtotal (inclui projeto) */
  contingencyRate: LevelTable;
  /** Espalhamento baixa/alta em torno do provável */
  spread: Record<Exclude<RenovationLevel, "NONE">, { low: Rate; high: Rate }>;
  /** Duração em semanas (baixa/provável/alta) para ~100 m²; escala com a área */
  durationWeeks: Record<Exclude<RenovationLevel, "NONE">, { low: number; likely: number; high: number }>;
  standardFactor: Record<BuildingStandard, number>;
  /** Fator por idade (anos): aplicado a elétrica, hidráulica, estrutura, telhado */
  ageFactor: { over30: number; over50: number };
  conditionFactor: Record<Condition, number>;
  houseOnlyCategories: RenovationCategory[];
}

export const DEFAULT_RENOVATION_TABLE: RenovationReferenceTable = {
  perM2: {
    PINTURA: { COSMETIC: 45, LIGHT: 55, MEDIUM: 65, HEAVY: 75, FULL: 85 },
    ELETRICA: { COSMETIC: 0, LIGHT: 30, MEDIUM: 70, HEAVY: 130, FULL: 180 },
    HIDRAULICA: { COSMETIC: 0, LIGHT: 20, MEDIUM: 60, HEAVY: 120, FULL: 160 },
    PISOS: { COSMETIC: 0, LIGHT: 40, MEDIUM: 130, HEAVY: 200, FULL: 260 },
    REVESTIMENTOS: { COSMETIC: 0, LIGHT: 20, MEDIUM: 60, HEAVY: 110, FULL: 150 },
    COZINHA: { COSMETIC: 0, LIGHT: 60, MEDIUM: 130, HEAVY: 200, FULL: 260 },
    BANHEIROS: { COSMETIC: 0, LIGHT: 40, MEDIUM: 110, HEAVY: 170, FULL: 220 },
    MARCENARIA: { COSMETIC: 0, LIGHT: 40, MEDIUM: 110, HEAVY: 190, FULL: 260 },
    ILUMINACAO: { COSMETIC: 10, LIGHT: 15, MEDIUM: 30, HEAVY: 45, FULL: 60 },
    GESSO: { COSMETIC: 0, LIGHT: 10, MEDIUM: 35, HEAVY: 60, FULL: 80 },
    CLIMATIZACAO: { COSMETIC: 0, LIGHT: 0, MEDIUM: 25, HEAVY: 50, FULL: 70 },
    PAISAGISMO: { COSMETIC: 0, LIGHT: 5, MEDIUM: 10, HEAVY: 15, FULL: 20 },
    FACHADA: { COSMETIC: 0, LIGHT: 10, MEDIUM: 25, HEAVY: 60, FULL: 100 },
    TELHADO: { COSMETIC: 0, LIGHT: 0, MEDIUM: 15, HEAVY: 50, FULL: 110 },
    ESTRUTURA: { COSMETIC: 0, LIGHT: 0, MEDIUM: 0, HEAVY: 40, FULL: 120 },
    LIMPEZA: { COSMETIC: 10, LIGHT: 12, MEDIUM: 15, HEAVY: 20, FULL: 25 },
    DEMOLICAO: { COSMETIC: 0, LIGHT: 8, MEDIUM: 25, HEAVY: 50, FULL: 80 },
    CACAMBA: { COSMETIC: 0, LIGHT: 6, MEDIUM: 12, HEAVY: 22, FULL: 30 },
    MAO_DE_OBRA: { COSMETIC: 0, LIGHT: 10, MEDIUM: 30, HEAVY: 50, FULL: 70 },
  },
  projectRate: { COSMETIC: 0, LIGHT: 0, MEDIUM: 0.03, HEAVY: 0.05, FULL: 0.06 },
  contingencyRate: { COSMETIC: 0.08, LIGHT: 0.1, MEDIUM: 0.15, HEAVY: 0.2, FULL: 0.25 },
  spread: {
    COSMETIC: { low: 0.15, high: 0.2 },
    LIGHT: { low: 0.15, high: 0.25 },
    MEDIUM: { low: 0.2, high: 0.3 },
    HEAVY: { low: 0.2, high: 0.4 },
    FULL: { low: 0.2, high: 0.45 },
  },
  durationWeeks: {
    COSMETIC: { low: 1, likely: 2, high: 3 },
    LIGHT: { low: 3, likely: 4, high: 6 },
    MEDIUM: { low: 6, likely: 8, high: 12 },
    HEAVY: { low: 10, likely: 14, high: 20 },
    FULL: { low: 16, likely: 22, high: 32 },
  },
  standardFactor: { ECONOMICO: 0.8, MEDIO: 1, ALTO: 1.35, LUXO: 1.8 },
  ageFactor: { over30: 1.1, over50: 1.2 },
  conditionFactor: { RUIM: 1.15, REGULAR: 1.05, BOM: 1, REFORMADO: 0.9, NOVO: 0.85 },
  houseOnlyCategories: ["TELHADO", "FACHADA", "PAISAGISMO"],
};

/** Estado de conservação esperado após cada nível de reforma (para o valor pós-reforma). */
export function conditionAfterRenovation(current: Condition | null | undefined, level: RenovationLevel): Condition {
  const order: Condition[] = ["RUIM", "REGULAR", "BOM", "REFORMADO", "NOVO"];
  const idx = current ? order.indexOf(current) : 1;
  switch (level) {
    case "NONE":
      return current ?? "REGULAR";
    case "COSMETIC":
      return order[Math.min(idx + 1, 2)] ?? "BOM";
    case "LIGHT":
      return "BOM";
    case "MEDIUM":
    case "HEAVY":
      return "REFORMADO";
    case "FULL":
      return "NOVO";
  }
}

export function appliesToType(category: RenovationCategory, type: PropertyType, table: RenovationReferenceTable): boolean {
  if (type === "APARTAMENTO" && table.houseOnlyCategories.includes(category)) return false;
  return true;
}
