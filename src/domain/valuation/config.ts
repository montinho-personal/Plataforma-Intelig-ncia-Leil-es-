import type { BuildingStandard, Condition, ExitHorizonDays, LiquidityClass, Rate } from "../types";

/**
 * Configuração do valuation. TODOS os valores abaixo são HIPÓTESES editáveis no perfil do grupo.
 * Nada aqui é "verdade de mercado"; são pontos de partida documentados, a serem calibrados
 * pelo histórico do próprio grupo (Fase 5).
 */
export interface ValuationWeights {
  location: number;
  area: number;
  bedrooms: number;
  parking: number;
  floor: number;
  age: number;
  standard: number;
  condition: number;
}

export interface AdjustmentCoefficients {
  /** Ajuste por vaga de diferença (fração do R$/m²) */
  perParkingSpot: Rate;
  /** Ajuste por dormitório de diferença (fração do R$/m²) */
  perBedroom: Rate;
  /** Ajuste por andar de diferença, com teto absoluto */
  perFloor: Rate;
  perFloorCap: Rate;
  /** Prêmio/desconto por estado de conservação, relativo a BOM = 0 */
  condition: Record<Condition, Rate>;
  /** Prêmio/desconto por padrão construtivo, relativo a MEDIO = 0 */
  standard: Record<BuildingStandard, Rate>;
  /** Anúncio parado há muito tempo tende a estar acima do preço de fechamento */
  staleListingDays: number;
  staleListingDiscount: Rate;
}

export type LiquidityCurve = Record<LiquidityClass, Record<ExitHorizonDays, Rate>>;

export interface ValuationConfig {
  weights: ValuationWeights;
  adjustments: AdjustmentCoefficients;
  /** Desconto típico entre preço anunciado e preço de fechamento (aplicado a comparáveis do tipo anúncio) */
  askingToClosingDiscount: Rate;
  /** Concessão adicional esperada quando o investidor vende com prazo-alvo (hipótese; calibrar com histórico) */
  investorExitMargin: Rate;
  /** Curva de desconto de liquidez por classe e prazo de saída */
  liquidityCurve: LiquidityCurve;
  /** Guardrails de dados insuficientes */
  minIncludedComparables: number;
  minEffectiveN: number;
  maxCoefficientOfVariation: Rate;
  /** Similaridade abaixo da qual o comparável é sinalizado como fraco */
  weakSimilarityThreshold: number;
}

export const DEFAULT_VALUATION_CONFIG: ValuationConfig = {
  weights: { location: 0.3, area: 0.25, bedrooms: 0.1, parking: 0.08, floor: 0.05, age: 0.07, standard: 0.08, condition: 0.07 },
  adjustments: {
    perParkingSpot: 0.03,
    perBedroom: 0.02,
    perFloor: 0.004,
    perFloorCap: 0.04,
    condition: { RUIM: -0.14, REGULAR: -0.07, BOM: 0, REFORMADO: 0.08, NOVO: 0.12 },
    standard: { ECONOMICO: -0.15, MEDIO: 0, ALTO: 0.12, LUXO: 0.25 },
    staleListingDays: 180,
    staleListingDiscount: 0.03,
  },
  askingToClosingDiscount: 0.06,
  investorExitMargin: 0.02,
  liquidityCurve: {
    ALTA: { 180: 0.01, 120: 0.02, 90: 0.04, 60: 0.07, 30: 0.12 },
    MEDIA: { 180: 0.02, 120: 0.04, 90: 0.06, 60: 0.1, 30: 0.16 },
    BAIXA: { 180: 0.04, 120: 0.07, 90: 0.1, 60: 0.15, 30: 0.22 },
  },
  minIncludedComparables: 3,
  minEffectiveN: 2.5,
  maxCoefficientOfVariation: 0.25,
  weakSimilarityThreshold: 0.45,
};
