import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PROFILE } from "@/domain/profile";
import { detectAtypicalFlags } from "@/domain/valuation";
import type { PropertyFilters, Repository } from "./repository";
import type {
  AnalysisSettings,
  AuditLogRecord,
  BidApprovalRecord,
  ComparableInputRecord,
  ComparableRecord,
  CurrentUser,
  DecisionRecord,
  GroupMember,
  MemberRole,
  ProfileRecord,
  PropertyInput,
  PropertyRecord,
  RenovationOverrideRecord,
  RiskRecord,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function fail(error: { message: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? "erro desconhecido"}`);
}

/** Repositório de produção. A autorização real é feita pelo RLS do banco; aqui só mapeamos linhas. */
export class SupabaseRepository implements Repository {
  constructor(private readonly db: SupabaseClient) {}

  async getCurrentUser(): Promise<CurrentUser | null> {
    const { data } = await this.db.auth.getUser();
    if (!data.user) return null;
    const { data: memberships } = await this.db
      .from("group_members")
      .select("group_id, role, groups(name), users:users!group_members_user_id_fkey(full_name)")
      .eq("user_id", data.user.id)
      .order("created_at")
      .limit(1);
    const m = memberships?.[0] as Row | undefined;
    if (!m) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      name: m.users?.full_name || data.user.email || "",
      groupId: m.group_id,
      groupName: m.groups?.name ?? "",
      role: m.role,
    };
  }

  async listMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await this.db.from("group_members").select("user_id, role, users(email, full_name)").eq("group_id", groupId);
    if (error) fail(error, "listMembers");
    return (data as Row[]).map((r) => ({ userId: r.user_id, role: r.role, email: r.users?.email ?? "", name: r.users?.full_name || r.users?.email || "" }));
  }

  async updateMemberRole(groupId: string, userId: string, role: MemberRole): Promise<void> {
    const { error } = await this.db.from("group_members").update({ role }).eq("group_id", groupId).eq("user_id", userId);
    if (error) fail(error, "updateMemberRole");
  }

  async getDefaultProfile(groupId: string): Promise<ProfileRecord> {
    const { data } = await this.db.from("investment_profiles").select("*").eq("group_id", groupId).eq("is_default", true).maybeSingle();
    if (data) return profileFromRow(data);
    const seed = { ...structuredClone(DEFAULT_PROFILE), groupId };
    const { data: created, error } = await this.db.from("investment_profiles").insert(profileToRow(seed)).select("*").single();
    if (error) fail(error, "createDefaultProfile");
    return profileFromRow(created);
  }

  async updateProfile(groupId: string, profile: ProfileRecord): Promise<ProfileRecord> {
    const { data, error } = await this.db.from("investment_profiles").update(profileToRow(profile)).eq("group_id", groupId).eq("id", profile.id).select("*").single();
    if (error) fail(error, "updateProfile");
    return profileFromRow(data);
  }

  async listProperties(groupId: string, filters: PropertyFilters = {}): Promise<PropertyRecord[]> {
    let q = this.db.from("properties").select("*, auctions(*)").eq("group_id", groupId).order("code", { ascending: false });
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.city) q = q.ilike("city", filters.city);
    if (filters.type) q = q.eq("type", filters.type);
    if (filters.favorites) q = q.eq("is_favorite", true);
    if (filters.q) q = q.or(`title.ilike.%${filters.q}%,address.ilike.%${filters.q}%,neighborhood.ilike.%${filters.q}%,condo_name.ilike.%${filters.q}%`);
    const { data, error } = await q;
    if (error) fail(error, "listProperties");
    let rows = (data as Row[]).map(propertyFromRow);
    if (filters.modality) rows = rows.filter((p) => p.auction?.modality === filters.modality);
    return rows;
  }

  async getProperty(groupId: string, id: string): Promise<PropertyRecord | null> {
    const { data, error } = await this.db.from("properties").select("*, auctions(*)").eq("group_id", groupId).eq("id", id).maybeSingle();
    if (error) fail(error, "getProperty");
    return data ? propertyFromRow(data) : null;
  }

  async createProperty(groupId: string, input: PropertyInput, createdBy: string): Promise<PropertyRecord> {
    const { data: code } = await this.db.rpc("next_property_code", { p_group: groupId });
    const { data, error } = await this.db
      .from("properties")
      .insert({ ...propertyToRow(input), group_id: groupId, code: code ?? 1, created_by: createdBy, atypical_flags: flagsFor(input) })
      .select("*")
      .single();
    if (error) fail(error, "createProperty");
    if (input.auction) {
      const { error: e2 } = await this.db.from("auctions").insert({ ...auctionToRow(input.auction), group_id: groupId, property_id: data.id });
      if (e2) fail(e2, "createAuction");
    }
    return (await this.getProperty(groupId, data.id))!;
  }

  async updateProperty(groupId: string, id: string, patch: Partial<PropertyInput>): Promise<PropertyRecord> {
    const current = await this.getProperty(groupId, id);
    if (!current) throw new Error("Imóvel não encontrado");
    const merged = { ...current, ...patch };
    const { error } = await this.db.from("properties").update({ ...propertyToRow(merged), atypical_flags: flagsFor(merged) }).eq("id", id).eq("group_id", groupId);
    if (error) fail(error, "updateProperty");
    if (patch.auction !== undefined) {
      if (patch.auction) {
        const { error: e2 } = await this.db.from("auctions").upsert({ ...auctionToRow(patch.auction), group_id: groupId, property_id: id, id: current.auction ? (current as Row).auctionId : undefined }, { onConflict: "id" });
        if (e2) fail(e2, "upsertAuction");
      }
    }
    return (await this.getProperty(groupId, id))!;
  }

  async listComparables(groupId: string, propertyId: string): Promise<ComparableRecord[]> {
    const { data, error } = await this.db.from("market_comparables").select("*").eq("group_id", groupId).eq("property_id", propertyId).order("created_at");
    if (error) fail(error, "listComparables");
    return (data as Row[]).map(comparableFromRow);
  }

  async createComparable(groupId: string, input: ComparableInputRecord, createdBy: string): Promise<ComparableRecord> {
    const { data, error } = await this.db.from("market_comparables").insert({ ...comparableToRow(input), group_id: groupId, created_by: createdBy }).select("*").single();
    if (error) fail(error, "createComparable");
    return comparableFromRow(data);
  }

  async updateComparable(groupId: string, id: string, patch: Partial<ComparableInputRecord>): Promise<ComparableRecord> {
    const { data, error } = await this.db.from("market_comparables").update(comparableToRow(patch)).eq("id", id).eq("group_id", groupId).select("*").single();
    if (error) fail(error, "updateComparable");
    return comparableFromRow(data);
  }

  async deleteComparable(groupId: string, id: string): Promise<void> {
    const { error } = await this.db.from("market_comparables").delete().eq("id", id).eq("group_id", groupId);
    if (error) fail(error, "deleteComparable");
  }

  async getAnalysisSettings(groupId: string, propertyId: string): Promise<AnalysisSettings | null> {
    const { data } = await this.db.from("analysis_settings").select("*").eq("group_id", groupId).eq("property_id", propertyId).maybeSingle();
    if (!data) return null;
    return {
      propertyId: data.property_id,
      profileId: data.profile_id,
      renovationLevel: data.renovation_level,
      exitHorizonDays: data.exit_horizon_days,
      referenceBid: num(data.reference_bid_amount),
      evictionMonths: data.eviction_months,
      evictionCost: num(data.eviction_cost_amount),
      holdingMonths: data.holding_months,
      maxBidOverrideJustification: data.max_bid_override_justification,
    };
  }

  async upsertAnalysisSettings(groupId: string, s: AnalysisSettings, changedBy: string): Promise<AnalysisSettings> {
    const { error } = await this.db.from("analysis_settings").upsert(
      {
        property_id: s.propertyId,
        group_id: groupId,
        profile_id: s.profileId,
        renovation_level: s.renovationLevel,
        exit_horizon_days: s.exitHorizonDays,
        reference_bid_amount: s.referenceBid,
        eviction_months: s.evictionMonths,
        eviction_cost_amount: s.evictionCost,
        holding_months: s.holdingMonths,
        max_bid_override_justification: s.maxBidOverrideJustification,
        updated_by: changedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "property_id" },
    );
    if (error) fail(error, "upsertAnalysisSettings");
    return s;
  }

  async listRenovationOverrides(groupId: string, propertyId: string): Promise<RenovationOverrideRecord[]> {
    const { data, error } = await this.db.from("renovation_overrides").select("*").eq("group_id", groupId).eq("property_id", propertyId);
    if (error) fail(error, "listRenovationOverrides");
    return (data as Row[]).map((r) => ({ id: r.id, propertyId: r.property_id, category: r.category, low: Number(r.low_amount), likely: Number(r.likely_amount), high: Number(r.high_amount), basis: r.basis, source: r.source }));
  }

  async upsertRenovationOverride(groupId: string, o: Omit<RenovationOverrideRecord, "id">, changedBy: string): Promise<RenovationOverrideRecord> {
    const { data, error } = await this.db
      .from("renovation_overrides")
      .upsert({ group_id: groupId, property_id: o.propertyId, category: o.category, low_amount: o.low, likely_amount: o.likely, high_amount: o.high, basis: o.basis, source: o.source, created_by: changedBy }, { onConflict: "property_id,category" })
      .select("*")
      .single();
    if (error) fail(error, "upsertRenovationOverride");
    return { id: data.id, propertyId: data.property_id, category: data.category, low: Number(data.low_amount), likely: Number(data.likely_amount), high: Number(data.high_amount), basis: data.basis, source: data.source };
  }

  async deleteRenovationOverride(groupId: string, id: string): Promise<void> {
    const { error } = await this.db.from("renovation_overrides").delete().eq("id", id).eq("group_id", groupId);
    if (error) fail(error, "deleteRenovationOverride");
  }

  async listRisks(groupId: string, propertyId: string): Promise<RiskRecord[]> {
    const { data, error } = await this.db.from("legal_risks").select("*").eq("group_id", groupId).eq("property_id", propertyId).order("created_at");
    if (error) fail(error, "listRisks");
    return (data as Row[]).map((r) => ({ id: r.id, propertyId: r.property_id, category: r.category, fact: r.fact, risk: r.risk, impact: r.impact, recommendedAction: r.recommended_action, probability: r.probability, impactScore: r.impact_score, isCritical: r.is_critical, status: r.status, createdAt: r.created_at }));
  }

  async createRisk(groupId: string, r: Omit<RiskRecord, "id" | "createdAt">, createdBy: string): Promise<RiskRecord> {
    const { data, error } = await this.db
      .from("legal_risks")
      .insert({ group_id: groupId, property_id: r.propertyId, category: r.category, fact: r.fact, risk: r.risk, impact: r.impact, recommended_action: r.recommendedAction, probability: r.probability, impact_score: r.impactScore, is_critical: r.isCritical, status: r.status, created_by: createdBy })
      .select("*")
      .single();
    if (error) fail(error, "createRisk");
    return { ...r, id: data.id, createdAt: data.created_at };
  }

  async updateRiskStatus(groupId: string, id: string, status: RiskRecord["status"]): Promise<void> {
    const { error } = await this.db.from("legal_risks").update({ status }).eq("id", id).eq("group_id", groupId);
    if (error) fail(error, "updateRiskStatus");
  }

  async listDecisions(groupId: string, propertyId: string): Promise<DecisionRecord[]> {
    const { data, error } = await this.db.from("investment_decisions").select("*, users(full_name, email)").eq("group_id", groupId).eq("property_id", propertyId).order("version", { ascending: false });
    if (error) fail(error, "listDecisions");
    return (data as Row[]).map((r) => ({ id: r.id, propertyId: r.property_id, version: r.version, decision: r.decision, conditions: r.conditions ?? [], memoSnapshot: r.memo_snapshot, decidedAt: r.decided_at, decidedBy: r.decided_by, decidedByName: r.users?.full_name || r.users?.email || "" }));
  }

  async createDecision(groupId: string, input: { propertyId: string; decision: DecisionRecord["decision"]; conditions: string[]; memoSnapshot: unknown }, user: CurrentUser): Promise<DecisionRecord> {
    const existing = await this.listDecisions(groupId, input.propertyId);
    const version = (existing[0]?.version ?? 0) + 1;
    const { data, error } = await this.db
      .from("investment_decisions")
      .insert({ group_id: groupId, property_id: input.propertyId, version, decision: input.decision, conditions: input.conditions, memo_snapshot: input.memoSnapshot, decided_by: user.id })
      .select("*")
      .single();
    if (error) fail(error, "createDecision");
    return { id: data.id, propertyId: input.propertyId, version, decision: input.decision, conditions: input.conditions, memoSnapshot: input.memoSnapshot, decidedAt: data.decided_at, decidedBy: user.id, decidedByName: user.name };
  }

  async listBidApprovals(groupId: string, propertyId: string): Promise<BidApprovalRecord[]> {
    const { data, error } = await this.db.from("bid_approvals").select("*, users(full_name, email)").eq("group_id", groupId).eq("property_id", propertyId).order("approved_at", { ascending: false });
    if (error) fail(error, "listBidApprovals");
    return (data as Row[]).map((r) => ({ id: r.id, propertyId: r.property_id, decisionId: r.decision_id, approvedCap: Number(r.approved_cap_amount), approvedBy: r.approved_by, approvedByName: r.users?.full_name || r.users?.email || "", approvedAt: r.approved_at, validUntil: r.valid_until, justification: r.justification, supersededBy: r.superseded_by }));
  }

  async createBidApproval(groupId: string, input: { propertyId: string; decisionId: string | null; approvedCap: number; validUntil: string; justification: string | null }, user: CurrentUser): Promise<BidApprovalRecord> {
    const previous = (await this.listBidApprovals(groupId, input.propertyId)).filter((a) => !a.supersededBy);
    const { data, error } = await this.db
      .from("bid_approvals")
      .insert({ group_id: groupId, property_id: input.propertyId, decision_id: input.decisionId, approved_cap_amount: input.approvedCap, approved_by: user.id, valid_until: input.validUntil, justification: input.justification })
      .select("*")
      .single();
    if (error) fail(error, "createBidApproval");
    for (const p of previous) await this.db.rpc("supersede_bid_approval", { p_old: p.id, p_new: data.id });
    return { id: data.id, propertyId: input.propertyId, decisionId: input.decisionId, approvedCap: input.approvedCap, approvedBy: user.id, approvedByName: user.name, approvedAt: data.approved_at, validUntil: input.validUntil, justification: input.justification, supersededBy: null };
  }

  async listAuditLogs(groupId: string, limit = 200): Promise<AuditLogRecord[]> {
    const { data, error } = await this.db.from("audit_logs").select("*").eq("group_id", groupId).order("changed_at", { ascending: false }).limit(limit);
    if (error) fail(error, "listAuditLogs");
    return (data as Row[]).map((r) => ({ id: String(r.id), tableName: r.table_name, rowId: r.row_id, action: r.action, changedBy: r.changed_by, changedAt: r.changed_at, oldValues: r.old_values, newValues: r.new_values }));
  }
}

// ---------- mapeadores ----------
function num(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function flagsFor(p: PropertyInput | PropertyRecord) {
  return detectAtypicalFlags({ type: p.type, ageYears: p.ageYears, condition: p.condition, woodConstruction: p.woodConstruction, irregularConstruction: p.irregularConstruction, registryAreaM2: p.registryAreaM2, usableAreaM2: p.usableAreaM2, buildingStandard: p.buildingStandard });
}

function propertyFromRow(r: Row): PropertyRecord & { auctionId?: string } {
  const a = Array.isArray(r.auctions) ? r.auctions[0] : r.auctions;
  return {
    id: r.id,
    groupId: r.group_id,
    code: r.code,
    status: r.status,
    type: r.type,
    title: r.title,
    address: r.address,
    neighborhood: r.neighborhood,
    city: r.city,
    state: r.state,
    condoName: r.condo_name,
    usableAreaM2: Number(r.usable_area_m2),
    registryAreaM2: num(r.registry_area_m2),
    bedrooms: r.bedrooms,
    suites: r.suites,
    parking: r.parking,
    floor: r.floor,
    ageYears: r.age_years,
    buildingStandard: r.building_standard,
    condition: r.condition,
    occupancy: r.occupancy,
    liquidityClass: r.liquidity_class,
    woodConstruction: r.wood_construction,
    irregularConstruction: r.irregular_construction,
    atypicalFlags: r.atypical_flags ?? [],
    monthlyCondo: num(r.monthly_condo_amount),
    monthlyIptu: num(r.monthly_iptu_amount),
    isFavorite: r.is_favorite,
    notes: r.notes,
    auction: a
      ? { modality: a.modality, auctioneer: a.auctioneer, courtCaseNumber: a.court_case_number, firstCallAt: a.first_call_at, firstCallMinBid: num(a.first_call_min_bid), secondCallAt: a.second_call_at, secondCallMinBid: num(a.second_call_min_bid), appraisalValue: num(a.appraisal_value), commissionRate: num(a.commission_rate), condoDebt: num(a.condo_debt_amount), iptuDebt: num(a.iptu_debt_amount), url: a.url }
      : null,
    auctionId: a?.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function propertyToRow(p: Partial<PropertyInput>): Row {
  return {
    status: p.status,
    type: p.type,
    title: p.title,
    address: p.address,
    neighborhood: p.neighborhood,
    city: p.city,
    state: p.state,
    condo_name: p.condoName,
    usable_area_m2: p.usableAreaM2,
    registry_area_m2: p.registryAreaM2,
    bedrooms: p.bedrooms,
    suites: p.suites,
    parking: p.parking,
    floor: p.floor,
    age_years: p.ageYears,
    building_standard: p.buildingStandard,
    condition: p.condition,
    occupancy: p.occupancy,
    liquidity_class: p.liquidityClass,
    wood_construction: p.woodConstruction,
    irregular_construction: p.irregularConstruction,
    monthly_condo_amount: p.monthlyCondo,
    monthly_iptu_amount: p.monthlyIptu,
    is_favorite: p.isFavorite,
    notes: p.notes,
  };
}

function auctionToRow(a: NonNullable<PropertyInput["auction"]>): Row {
  return {
    modality: a.modality,
    auctioneer: a.auctioneer,
    court_case_number: a.courtCaseNumber,
    first_call_at: a.firstCallAt,
    first_call_min_bid: a.firstCallMinBid,
    second_call_at: a.secondCallAt,
    second_call_min_bid: a.secondCallMinBid,
    appraisal_value: a.appraisalValue,
    commission_rate: a.commissionRate,
    condo_debt_amount: a.condoDebt,
    iptu_debt_amount: a.iptuDebt,
    url: a.url,
  };
}

function comparableFromRow(r: Row): ComparableRecord {
  return {
    id: r.id,
    groupId: r.group_id,
    propertyId: r.property_id,
    source: r.source,
    url: r.url,
    capturedAt: r.captured_at,
    kind: r.kind,
    address: r.address,
    distanceM: r.distance_m,
    sameCondo: r.same_condo,
    sameStreet: r.same_street,
    sameNeighborhood: r.same_neighborhood,
    usableAreaM2: Number(r.usable_area_m2),
    bedrooms: r.bedrooms,
    parking: r.parking,
    floor: r.floor,
    ageYears: r.age_years,
    buildingStandard: r.building_standard,
    condition: r.condition,
    monthlyCondo: num(r.monthly_condo_amount),
    price: Number(r.price_amount),
    daysOnMarket: r.days_on_market,
    notes: r.notes,
    excluded: r.excluded,
    excludedReason: r.excluded_reason,
    createdAt: r.created_at,
  };
}

function comparableToRow(c: Partial<ComparableInputRecord>): Row {
  const row: Row = {
    property_id: c.propertyId,
    source: c.source,
    url: c.url,
    captured_at: c.capturedAt,
    kind: c.kind,
    address: c.address,
    distance_m: c.distanceM,
    same_condo: c.sameCondo,
    same_street: c.sameStreet,
    same_neighborhood: c.sameNeighborhood,
    usable_area_m2: c.usableAreaM2,
    bedrooms: c.bedrooms,
    parking: c.parking,
    floor: c.floor,
    age_years: c.ageYears,
    building_standard: c.buildingStandard,
    condition: c.condition,
    monthly_condo_amount: c.monthlyCondo,
    price_amount: c.price,
    days_on_market: c.daysOnMarket,
    notes: c.notes,
    excluded: c.excluded,
    excluded_reason: c.excludedReason,
  };
  for (const k of Object.keys(row)) if (row[k] === undefined) delete row[k];
  return row;
}

function profileFromRow(r: Row): ProfileRecord {
  return {
    id: r.id,
    groupId: r.group_id,
    name: r.name,
    isDefault: r.is_default,
    minRoi: Number(r.min_roi),
    targetRoi: Number(r.target_roi),
    minRoe: num(r.min_roe),
    minIrrAnnual: num(r.min_irr_annual),
    minMargin: num(r.min_margin),
    minProfit: num(r.min_profit_amount),
    maxCapital: num(r.max_capital_amount),
    maxMonths: r.max_months,
    acceptedModalities: r.accepted_modalities ?? [],
    acceptedPropertyTypes: r.accepted_property_types ?? [],
    locations: r.locations ?? [],
    maxRiskLevel: r.max_risk_level,
    defaultExitHorizonDays: r.default_exit_horizon_days,
    defaultHoldingMonths: r.default_holding_months,
    defaultEvictionMonthsIfOccupied: r.default_eviction_months_if_occupied,
    defaultEvictionCostIfOccupied: Number(r.default_eviction_cost_if_occupied),
    regionFactor: Number(r.region_factor),
    valuation: r.valuation_config,
    renovationTable: r.renovation_table,
    costs: r.cost_table,
    teamFee: r.team_fee,
    scenarios: r.scenario_config,
  };
}

function profileToRow(p: Omit<ProfileRecord, "id"> & { id?: string }): Row {
  return {
    group_id: p.groupId,
    name: p.name,
    is_default: p.isDefault,
    min_roi: p.minRoi,
    target_roi: p.targetRoi,
    min_roe: p.minRoe,
    min_irr_annual: p.minIrrAnnual,
    min_margin: p.minMargin,
    min_profit_amount: p.minProfit,
    max_capital_amount: p.maxCapital,
    max_months: p.maxMonths,
    accepted_modalities: p.acceptedModalities,
    accepted_property_types: p.acceptedPropertyTypes,
    locations: p.locations,
    max_risk_level: p.maxRiskLevel,
    default_exit_horizon_days: p.defaultExitHorizonDays,
    default_holding_months: p.defaultHoldingMonths,
    default_eviction_months_if_occupied: p.defaultEvictionMonthsIfOccupied,
    default_eviction_cost_if_occupied: p.defaultEvictionCostIfOccupied,
    region_factor: p.regionFactor,
    valuation_config: p.valuation,
    renovation_table: p.renovationTable,
    cost_table: p.costs,
    team_fee: p.teamFee,
    scenario_config: p.scenarios,
  };
}
