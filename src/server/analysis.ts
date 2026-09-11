import "server-only";
import { getRepository } from "@/data";
import type { AnalysisSettings, ComparableRecord, CurrentUser, ProfileRecord, PropertyRecord, RenovationOverrideRecord, RiskRecord, BidApprovalRecord, DecisionRecord } from "@/data/types";
import { analyzeOpportunity, type OpportunityAnalysis } from "@/domain/analysis";
import type { ComparableInput } from "@/domain/valuation";

export interface OpportunityContext {
  user: CurrentUser;
  property: PropertyRecord;
  comparables: ComparableRecord[];
  settings: AnalysisSettings;
  overrides: RenovationOverrideRecord[];
  profile: ProfileRecord;
  risks: RiskRecord[];
  decisions: DecisionRecord[];
  approvals: BidApprovalRecord[];
  analysis: OpportunityAnalysis;
}

export function defaultSettings(propertyId: string): AnalysisSettings {
  return { propertyId, profileId: null, renovationLevel: "MEDIUM", exitHorizonDays: null, referenceBid: null, evictionMonths: null, evictionCost: null, holdingMonths: null, maxBidOverrideJustification: null };
}

export function toComparableInput(c: ComparableRecord): ComparableInput {
  return {
    id: c.id,
    kind: c.kind,
    priceCents: c.price,
    usableAreaM2: c.usableAreaM2,
    bedrooms: c.bedrooms,
    parking: c.parking,
    floor: c.floor,
    ageYears: c.ageYears,
    buildingStandard: c.buildingStandard,
    condition: c.condition,
    sameCondo: c.sameCondo,
    sameStreet: c.sameStreet,
    sameNeighborhood: c.sameNeighborhood,
    distanceM: c.distanceM,
    capturedAt: c.capturedAt,
    daysOnMarket: c.daysOnMarket,
    excluded: c.excluded,
    excludedReason: c.excludedReason,
  };
}

/** Lance de referência: o informado nas configurações ou, na falta, o lance mínimo da 2ª praça (ou 1ª). */
export function referenceBidFor(property: PropertyRecord, settings: AnalysisSettings): number {
  return settings.referenceBid ?? property.auction?.secondCallMinBid ?? property.auction?.firstCallMinBid ?? 0;
}

export async function loadOpportunity(user: CurrentUser, propertyId: string): Promise<OpportunityContext | null> {
  const repo = await getRepository();
  const property = await repo.getProperty(user.groupId, propertyId);
  if (!property) return null;
  const [comparables, storedSettings, overrides, profile, risks, decisions, approvals] = await Promise.all([
    repo.listComparables(user.groupId, propertyId),
    repo.getAnalysisSettings(user.groupId, propertyId),
    repo.listRenovationOverrides(user.groupId, propertyId),
    repo.getDefaultProfile(user.groupId),
    repo.listRisks(user.groupId, propertyId),
    repo.listDecisions(user.groupId, propertyId),
    repo.listBidApprovals(user.groupId, propertyId),
  ]);
  const settings = storedSettings ?? defaultSettings(propertyId);
  const analysis = analyzeOpportunity({
    subject: {
      type: property.type,
      usableAreaM2: property.usableAreaM2,
      bedrooms: property.bedrooms,
      suites: property.suites,
      parking: property.parking,
      floor: property.floor,
      ageYears: property.ageYears,
      buildingStandard: property.buildingStandard,
      condition: property.condition,
      atypicalFlags: property.atypicalFlags,
      liquidityClass: property.liquidityClass,
      occupancy: property.occupancy,
      monthlyCondo: property.monthlyCondo,
      monthlyIptu: property.monthlyIptu,
      condoDebt: property.auction?.condoDebt,
      iptuDebt: property.auction?.iptuDebt,
      auctionCommissionRate: property.auction?.commissionRate,
    },
    comparables: comparables.map(toComparableInput),
    profile,
    renovationLevel: settings.renovationLevel,
    renovationOverrides: overrides.map((o) => ({ category: o.category, low: o.low, likely: o.likely, high: o.high, source: o.source, basis: o.basis })),
    exitHorizonDays: settings.exitHorizonDays ?? undefined,
    referenceBid: referenceBidFor(property, settings),
    evictionMonths: settings.evictionMonths,
    evictionCost: settings.evictionCost,
    holdingMonths: settings.holdingMonths,
    maxBidOverrideJustification: settings.maxBidOverrideJustification,
  });
  return { user, property, comparables, settings, overrides, profile, risks, decisions, approvals, analysis };
}
