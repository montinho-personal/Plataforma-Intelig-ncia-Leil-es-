import type { Cents, Rate } from "../types";

/**
 * Tabela de custos do perfil. HIPÓTESES editáveis; nada aqui é constante do sistema.
 * Valores fixos em centavos; taxas em fração.
 */
export interface CostTable {
  auctioneerCommissionRate: Rate;
  itbiRate: Rate;
  registryRate: Rate;
  registryFixed: Cents;
  /** Carta de arrematação / escritura */
  deedFixed: Cents;
  courtCostsFixed: Cents;
  lawyerFixed: Cents;
  lawyerRateOfBid: Rate;
  advisoryFixed: Cents;
  engineeringFixed: Cents;
  documentationFixed: Cents;
  insuranceMonthly: Cents;
  marketingFixed: Cents;
  saleFeesFixed: Cents;
  brokerageRate: Rate;
  capitalGainsTaxRate: Rate;
  /** Reforma documentada entra no custo de aquisição para o IR */
  renovationDeductible: boolean;
  capitalCostAnnualRate: Rate;
  /** Contingência geral sobre custos (exclui lance e reforma, que já tem a própria) */
  contingencyRate: Rate;
}

export type TeamFeeType = "PCT_OF_BID" | "PCT_OF_PROFIT" | "FIXED" | "COMBINED" | "NONE";

export interface TeamFee {
  type: TeamFeeType;
  pctOfBid: Rate;
  pctOfProfit: Rate;
  fixed: Cents;
}

export const DEFAULT_COST_TABLE: CostTable = {
  auctioneerCommissionRate: 0.05,
  itbiRate: 0.03,
  registryRate: 0.0125,
  registryFixed: 0,
  deedFixed: 250_000,
  courtCostsFixed: 150_000,
  lawyerFixed: 800_000,
  lawyerRateOfBid: 0,
  advisoryFixed: 0,
  engineeringFixed: 0,
  documentationFixed: 150_000,
  insuranceMonthly: 0,
  marketingFixed: 150_000,
  saleFeesFixed: 0,
  brokerageRate: 0.06,
  capitalGainsTaxRate: 0.15,
  renovationDeductible: true,
  capitalCostAnnualRate: 0.12,
  contingencyRate: 0.05,
};

export const DEFAULT_TEAM_FEE: TeamFee = { type: "PCT_OF_BID", pctOfBid: 0.1, pctOfProfit: 0, fixed: 0 };
