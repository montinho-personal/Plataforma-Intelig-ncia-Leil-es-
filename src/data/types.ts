import type { InvestmentProfile } from "@/domain/profile";
import type { RenovationCategory } from "@/domain/renovation";
import type {
  AtypicalFlag,
  AuctionModality,
  BuildingStandard,
  Cents,
  Condition,
  ExitHorizonDays,
  LiquidityClass,
  Occupancy,
  PropertyType,
  RenovationLevel,
} from "@/domain/types";
import type { ComparableKind } from "@/domain/valuation";

export type MemberRole = "ADMIN" | "ANALISTA" | "INVESTIDOR" | "JURIDICO" | "FINANCEIRO" | "VISUALIZACAO";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  groupId: string;
  groupName: string;
  role: MemberRole;
}

export interface GroupMember {
  userId: string;
  email: string;
  name: string;
  role: MemberRole;
}

export type PropertyStatus = "RADAR" | "TRIAGEM" | "EM_ANALISE" | "APROVADO" | "REPROVADO" | "ARREMATADO" | "ENCERRADO" | "DESCARTADO";

export interface AuctionInfo {
  modality: AuctionModality;
  auctioneer: string | null;
  courtCaseNumber: string | null;
  firstCallAt: string | null;
  firstCallMinBid: Cents | null;
  secondCallAt: string | null;
  secondCallMinBid: Cents | null;
  /** Valor de avaliação do edital: FATO do edital, nunca valor de mercado */
  appraisalValue: Cents | null;
  commissionRate: number | null;
  condoDebt: Cents | null;
  iptuDebt: Cents | null;
  url: string | null;
}

export interface PropertyRecord {
  id: string;
  groupId: string;
  code: number;
  status: PropertyStatus;
  type: PropertyType;
  title: string;
  address: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  condoName: string | null;
  usableAreaM2: number;
  registryAreaM2: number | null;
  bedrooms: number | null;
  suites: number | null;
  parking: number | null;
  floor: number | null;
  ageYears: number | null;
  buildingStandard: BuildingStandard | null;
  condition: Condition | null;
  occupancy: Occupancy;
  liquidityClass: LiquidityClass | null;
  woodConstruction: boolean;
  irregularConstruction: boolean;
  atypicalFlags: AtypicalFlag[];
  monthlyCondo: Cents | null;
  monthlyIptu: Cents | null;
  isFavorite: boolean;
  notes: string | null;
  auction: AuctionInfo | null;
  createdAt: string;
  updatedAt: string;
}

export type PropertyInput = Omit<PropertyRecord, "id" | "groupId" | "code" | "createdAt" | "updatedAt" | "atypicalFlags">;

export interface ComparableRecord {
  id: string;
  groupId: string;
  propertyId: string;
  source: string;
  url: string | null;
  capturedAt: string | null;
  kind: ComparableKind;
  address: string | null;
  distanceM: number | null;
  sameCondo: boolean | null;
  sameStreet: boolean | null;
  sameNeighborhood: boolean | null;
  usableAreaM2: number;
  bedrooms: number | null;
  parking: number | null;
  floor: number | null;
  ageYears: number | null;
  buildingStandard: BuildingStandard | null;
  condition: Condition | null;
  monthlyCondo: Cents | null;
  price: Cents;
  daysOnMarket: number | null;
  notes: string | null;
  excluded: boolean;
  excludedReason: string | null;
  createdAt: string;
}

export type ComparableInputRecord = Omit<ComparableRecord, "id" | "groupId" | "createdAt">;

export interface AnalysisSettings {
  propertyId: string;
  profileId: string | null;
  renovationLevel: RenovationLevel;
  exitHorizonDays: ExitHorizonDays | null;
  referenceBid: Cents | null;
  evictionMonths: number | null;
  evictionCost: Cents | null;
  holdingMonths: number | null;
  maxBidOverrideJustification: string | null;
}

export interface RenovationOverrideRecord {
  id: string;
  propertyId: string;
  category: RenovationCategory;
  low: Cents;
  likely: Cents;
  high: Cents;
  basis: "QUOTE" | "MANUAL";
  source: string;
}

export type DecisionKind = "APROVAR" | "APROVAR_COM_CONDICOES" | "REVISAR" | "REPROVAR";

export interface DecisionRecord {
  id: string;
  propertyId: string;
  version: number;
  decision: DecisionKind;
  conditions: string[];
  memoSnapshot: unknown;
  decidedAt: string;
  decidedBy: string;
  decidedByName: string;
}

export interface BidApprovalRecord {
  id: string;
  propertyId: string;
  decisionId: string | null;
  approvedCap: Cents;
  approvedBy: string;
  approvedByName: string;
  approvedAt: string;
  validUntil: string;
  justification: string | null;
  supersededBy: string | null;
}

export interface RiskRecord {
  id: string;
  propertyId: string;
  category: "JURIDICO" | "FINANCEIRO" | "MERCADO" | "OCUPACAO" | "REFORMA" | "LIQUIDEZ" | "DOCUMENTAL";
  fact: string;
  risk: string;
  impact: string | null;
  recommendedAction: string | null;
  probability: number;
  impactScore: number;
  isCritical: boolean;
  status: "ABERTO" | "MITIGADO" | "ACEITO" | "ENCERRADO";
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  tableName: string;
  rowId: string;
  action: string;
  changedBy: string | null;
  changedAt: string;
  oldValues: unknown;
  newValues: unknown;
}

export type ProfileRecord = InvestmentProfile;
