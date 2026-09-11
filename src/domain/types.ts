/**
 * Tipos compartilhados do domínio. Sem dependência de React ou banco.
 * Dinheiro: sempre inteiro em centavos (Cents). Taxas: fração (0.34 = 34%).
 */

export type Cents = number;
export type Rate = number;

export type Currency = "BRL";

export interface Money {
  amount: Cents;
  currency: Currency;
  /** Data de referência (ISO) */
  asOf?: string;
  /** Origem do valor: "edital p.3", "perfil", "estimador", "informado" */
  source?: string;
}

export type EpistemicStatus = "FACT" | "ESTIMATE" | "HYPOTHESIS" | "MISSING";

export type AuctionModality = "JUDICIAL" | "EXTRAJUDICIAL";
export type PropertyType = "APARTAMENTO" | "CASA" | "TERRENO" | "COMERCIAL" | "RURAL" | "OUTRO";
export type BuildingStandard = "ECONOMICO" | "MEDIO" | "ALTO" | "LUXO";
export type Condition = "RUIM" | "REGULAR" | "BOM" | "REFORMADO" | "NOVO";
export type Occupancy = "DESOCUPADO" | "OCUPADO" | "DESCONHECIDO";
export type LiquidityClass = "ALTA" | "MEDIA" | "BAIXA";
export type ExitHorizonDays = 30 | 60 | 90 | 120 | 180;
export const EXIT_HORIZONS: ExitHorizonDays[] = [30, 60, 90, 120, 180];

export type RenovationLevel = "NONE" | "COSMETIC" | "LIGHT" | "MEDIUM" | "HEAVY" | "FULL";
export const RENOVATION_LEVELS: RenovationLevel[] = ["NONE", "COSMETIC", "LIGHT", "MEDIUM", "HEAVY", "FULL"];

export type AtypicalSeverity = "WARNING" | "CRITICAL";
export interface AtypicalFlag {
  code:
    | "MADEIRA"
    | "RURAL"
    | "MUITO_ANTIGO"
    | "IRREGULAR"
    | "AREA_DIVERGENTE"
    | "COMERCIAL_INCOMUM"
    | "PADRAO_RARO"
    | "AREA_FORA_DA_FAIXA"
    | "OUTRO";
  severity: AtypicalSeverity;
  note?: string;
}

/** Faixa: valor provável com limites inferior e superior. Nunca um número só. */
export interface Range {
  low: Cents;
  likely: Cents;
  high: Cents;
}

export interface Explanation {
  label: string;
  /** Contribuição (pontos, R$ ou %), conforme o contexto */
  value: number;
  note?: string;
}
