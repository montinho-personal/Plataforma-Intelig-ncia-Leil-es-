import type { AuctionModality, Cents, ExitHorizonDays, PropertyType, Rate } from "../types";
import { DEFAULT_VALUATION_CONFIG, type ValuationConfig } from "../valuation/config";
import { DEFAULT_RENOVATION_TABLE, type RenovationReferenceTable } from "../renovation/config";
import { DEFAULT_COST_TABLE, DEFAULT_TEAM_FEE, type CostTable, type TeamFee } from "../underwriting/config";
import { DEFAULT_SCENARIO_CONFIG, type ScenarioConfig } from "../scenarios";

/**
 * Perfil de investimento: TUDO que é critério, taxa ou hipótese do grupo vive aqui.
 * O código de domínio nunca contém percentuais fixos; os defaults abaixo são o seed inicial,
 * editável por ADMIN.
 */
export interface InvestmentProfile {
  id: string;
  groupId: string;
  name: string;
  isDefault: boolean;
  minRoi: Rate;
  targetRoi: Rate;
  minRoe: Rate | null;
  minIrrAnnual: Rate | null;
  minMargin: Rate | null;
  minProfit: Cents | null;
  maxCapital: Cents | null;
  maxMonths: number | null;
  acceptedModalities: AuctionModality[];
  acceptedPropertyTypes: PropertyType[];
  locations: string[];
  maxRiskLevel: "BAIXO" | "MEDIO" | "ALTO";
  defaultExitHorizonDays: ExitHorizonDays;
  /** Meses padrão entre arrematação e venda, além da obra e desocupação */
  defaultHoldingMonths: number;
  defaultEvictionMonthsIfOccupied: number;
  defaultEvictionCostIfOccupied: Cents;
  regionFactor: number;
  valuation: ValuationConfig;
  renovationTable: RenovationReferenceTable;
  costs: CostTable;
  teamFee: TeamFee;
  scenarios: ScenarioConfig;
}

export const DEFAULT_PROFILE: Omit<InvestmentProfile, "id" | "groupId"> = {
  name: "Padrão do grupo",
  isDefault: true,
  minRoi: 0.27,
  targetRoi: 0.34,
  minRoe: null,
  minIrrAnnual: 0.3,
  minMargin: null,
  minProfit: 150_000_00,
  maxCapital: 1_200_000_00,
  maxMonths: 12,
  acceptedModalities: ["JUDICIAL", "EXTRAJUDICIAL"],
  acceptedPropertyTypes: ["APARTAMENTO", "CASA"],
  locations: [],
  maxRiskLevel: "MEDIO",
  defaultExitHorizonDays: 90,
  defaultHoldingMonths: 4,
  defaultEvictionMonthsIfOccupied: 3,
  defaultEvictionCostIfOccupied: 15_000_00,
  regionFactor: 1,
  valuation: DEFAULT_VALUATION_CONFIG,
  renovationTable: DEFAULT_RENOVATION_TABLE,
  costs: DEFAULT_COST_TABLE,
  teamFee: DEFAULT_TEAM_FEE,
  scenarios: DEFAULT_SCENARIO_CONFIG,
};
