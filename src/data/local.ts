import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

interface LocalDb {
  members: GroupMember[];
  profiles: ProfileRecord[];
  properties: PropertyRecord[];
  comparables: ComparableRecord[];
  settings: AnalysisSettings[];
  overrides: RenovationOverrideRecord[];
  risks: RiskRecord[];
  decisions: DecisionRecord[];
  approvals: BidApprovalRecord[];
  audit: AuditLogRecord[];
}

const LOCAL_GROUP_ID = "local-group";
const LOCAL_GROUP_NAME = "Grupo (modo local)";

const EMPTY: LocalDb = {
  members: [
    { userId: "local-admin", email: "ana@local", name: "Ana (ADMIN, demo)", role: "ADMIN" },
    { userId: "local-analista", email: "bia@local", name: "Beatriz (ANALISTA, demo)", role: "ANALISTA" },
    { userId: "local-investidora", email: "carla@local", name: "Carla (INVESTIDOR, demo)", role: "INVESTIDOR" },
  ],
  profiles: [],
  properties: [],
  comparables: [],
  settings: [],
  overrides: [],
  risks: [],
  decisions: [],
  approvals: [],
  audit: [],
};

/**
 * Repositório em arquivo JSON. Somente para desenvolvimento e demonstração (DATA_BACKEND=local).
 * Não tem autenticação real: o usuário atual vem de LOCAL_USER (id de um membro demo).
 */
export class LocalJsonRepository implements Repository {
  private file: string;

  constructor(dir = path.join(process.cwd(), ".data")) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "local.json");
    if (!existsSync(this.file)) this.write(EMPTY);
  }

  private read(): LocalDb {
    return { ...EMPTY, ...(JSON.parse(readFileSync(this.file, "utf8")) as Partial<LocalDb>) };
  }

  private write(db: LocalDb) {
    writeFileSync(this.file, JSON.stringify(db, null, 2));
  }

  private audit(db: LocalDb, tableName: string, rowId: string, action: string, changedBy: string | null, oldValues: unknown, newValues: unknown) {
    db.audit.unshift({ id: randomUUID(), tableName, rowId, action, changedBy, changedAt: new Date().toISOString(), oldValues, newValues });
    db.audit = db.audit.slice(0, 2000);
  }

  async getCurrentUser(): Promise<CurrentUser | null> {
    const db = this.read();
    const wanted = process.env.LOCAL_USER ?? "local-admin";
    const m = db.members.find((x) => x.userId === wanted) ?? db.members[0]!;
    return { id: m.userId, email: m.email, name: m.name, groupId: LOCAL_GROUP_ID, groupName: LOCAL_GROUP_NAME, role: m.role };
  }

  async listMembers(): Promise<GroupMember[]> {
    return this.read().members;
  }

  async updateMemberRole(_groupId: string, userId: string, role: MemberRole): Promise<void> {
    const db = this.read();
    const m = db.members.find((x) => x.userId === userId);
    if (!m) throw new Error("Membro não encontrado");
    this.audit(db, "group_members", userId, "UPDATE", null, { role: m.role }, { role });
    m.role = role;
    this.write(db);
  }

  async getDefaultProfile(groupId: string): Promise<ProfileRecord> {
    const db = this.read();
    let p = db.profiles.find((x) => x.groupId === groupId && x.isDefault);
    if (!p) {
      p = { ...structuredClone(DEFAULT_PROFILE), id: randomUUID(), groupId };
      db.profiles.push(p);
      this.write(db);
    }
    return p;
  }

  async updateProfile(groupId: string, profile: ProfileRecord, changedBy: string): Promise<ProfileRecord> {
    const db = this.read();
    const idx = db.profiles.findIndex((x) => x.groupId === groupId && x.id === profile.id);
    if (idx < 0) throw new Error("Perfil não encontrado");
    this.audit(db, "investment_profiles", profile.id, "UPDATE", changedBy, db.profiles[idx], profile);
    db.profiles[idx] = profile;
    this.write(db);
    return profile;
  }

  async listProperties(groupId: string, filters: PropertyFilters = {}): Promise<PropertyRecord[]> {
    const db = this.read();
    return db.properties
      .filter((p) => p.groupId === groupId)
      .filter((p) => !filters.status || p.status === filters.status)
      .filter((p) => !filters.city || p.city.toLowerCase() === filters.city.toLowerCase())
      .filter((p) => !filters.type || p.type === filters.type)
      .filter((p) => !filters.modality || p.auction?.modality === filters.modality)
      .filter((p) => !filters.favorites || p.isFavorite)
      .filter((p) => !filters.q || `${p.title} ${p.address ?? ""} ${p.neighborhood ?? ""} ${p.condoName ?? ""}`.toLowerCase().includes(filters.q.toLowerCase()))
      .sort((a, b) => b.code - a.code);
  }

  async getProperty(groupId: string, id: string): Promise<PropertyRecord | null> {
    return this.read().properties.find((p) => p.groupId === groupId && p.id === id) ?? null;
  }

  async createProperty(groupId: string, input: PropertyInput, createdBy: string): Promise<PropertyRecord> {
    const db = this.read();
    const code = db.properties.filter((p) => p.groupId === groupId).reduce((m, p) => Math.max(m, p.code), 0) + 1;
    const now = new Date().toISOString();
    const rec: PropertyRecord = { ...input, id: randomUUID(), groupId, code, atypicalFlags: flagsFor(input), createdAt: now, updatedAt: now };
    db.properties.push(rec);
    this.audit(db, "properties", rec.id, "INSERT", createdBy, null, rec);
    this.write(db);
    return rec;
  }

  async updateProperty(groupId: string, id: string, patch: Partial<PropertyInput>, changedBy: string): Promise<PropertyRecord> {
    const db = this.read();
    const idx = db.properties.findIndex((p) => p.groupId === groupId && p.id === id);
    if (idx < 0) throw new Error("Imóvel não encontrado");
    const old = db.properties[idx]!;
    const next: PropertyRecord = { ...old, ...patch, updatedAt: new Date().toISOString() };
    next.atypicalFlags = flagsFor(next);
    db.properties[idx] = next;
    this.audit(db, "properties", id, "UPDATE", changedBy, old, next);
    this.write(db);
    return next;
  }

  async listComparables(groupId: string, propertyId: string): Promise<ComparableRecord[]> {
    return this.read().comparables.filter((c) => c.groupId === groupId && c.propertyId === propertyId);
  }

  async createComparable(groupId: string, input: ComparableInputRecord, createdBy: string): Promise<ComparableRecord> {
    const db = this.read();
    const rec: ComparableRecord = { ...input, id: randomUUID(), groupId, createdAt: new Date().toISOString() };
    db.comparables.push(rec);
    this.audit(db, "market_comparables", rec.id, "INSERT", createdBy, null, rec);
    this.write(db);
    return rec;
  }

  async updateComparable(groupId: string, id: string, patch: Partial<ComparableInputRecord>, changedBy: string): Promise<ComparableRecord> {
    const db = this.read();
    const idx = db.comparables.findIndex((c) => c.groupId === groupId && c.id === id);
    if (idx < 0) throw new Error("Comparável não encontrado");
    const old = db.comparables[idx]!;
    const next = { ...old, ...patch };
    db.comparables[idx] = next;
    this.audit(db, "market_comparables", id, "UPDATE", changedBy, old, next);
    this.write(db);
    return next;
  }

  async deleteComparable(groupId: string, id: string, changedBy: string): Promise<void> {
    const db = this.read();
    const old = db.comparables.find((c) => c.groupId === groupId && c.id === id);
    if (!old) return;
    db.comparables = db.comparables.filter((c) => c.id !== id);
    this.audit(db, "market_comparables", id, "DELETE", changedBy, old, null);
    this.write(db);
  }

  async getAnalysisSettings(_groupId: string, propertyId: string): Promise<AnalysisSettings | null> {
    return this.read().settings.find((s) => s.propertyId === propertyId) ?? null;
  }

  async upsertAnalysisSettings(_groupId: string, settings: AnalysisSettings, changedBy: string): Promise<AnalysisSettings> {
    const db = this.read();
    const idx = db.settings.findIndex((s) => s.propertyId === settings.propertyId);
    const old = idx >= 0 ? db.settings[idx] : null;
    if (idx >= 0) db.settings[idx] = settings;
    else db.settings.push(settings);
    this.audit(db, "analysis_settings", settings.propertyId, old ? "UPDATE" : "INSERT", changedBy, old, settings);
    this.write(db);
    return settings;
  }

  async listRenovationOverrides(_groupId: string, propertyId: string): Promise<RenovationOverrideRecord[]> {
    return this.read().overrides.filter((o) => o.propertyId === propertyId);
  }

  async upsertRenovationOverride(_groupId: string, input: Omit<RenovationOverrideRecord, "id">, changedBy: string): Promise<RenovationOverrideRecord> {
    const db = this.read();
    const idx = db.overrides.findIndex((o) => o.propertyId === input.propertyId && o.category === input.category);
    const rec: RenovationOverrideRecord = { ...input, id: idx >= 0 ? db.overrides[idx]!.id : randomUUID() };
    if (idx >= 0) db.overrides[idx] = rec;
    else db.overrides.push(rec);
    this.audit(db, "renovation_overrides", rec.id, idx >= 0 ? "UPDATE" : "INSERT", changedBy, null, rec);
    this.write(db);
    return rec;
  }

  async deleteRenovationOverride(_groupId: string, id: string, changedBy: string): Promise<void> {
    const db = this.read();
    const old = db.overrides.find((o) => o.id === id);
    db.overrides = db.overrides.filter((o) => o.id !== id);
    if (old) this.audit(db, "renovation_overrides", id, "DELETE", changedBy, old, null);
    this.write(db);
  }

  async listRisks(_groupId: string, propertyId: string): Promise<RiskRecord[]> {
    return this.read().risks.filter((r) => r.propertyId === propertyId);
  }

  async createRisk(_groupId: string, input: Omit<RiskRecord, "id" | "createdAt">, createdBy: string): Promise<RiskRecord> {
    const db = this.read();
    const rec: RiskRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    db.risks.push(rec);
    this.audit(db, "legal_risks", rec.id, "INSERT", createdBy, null, rec);
    this.write(db);
    return rec;
  }

  async updateRiskStatus(_groupId: string, id: string, status: RiskRecord["status"], changedBy: string): Promise<void> {
    const db = this.read();
    const r = db.risks.find((x) => x.id === id);
    if (!r) return;
    this.audit(db, "legal_risks", id, "UPDATE", changedBy, { status: r.status }, { status });
    r.status = status;
    this.write(db);
  }

  async listDecisions(_groupId: string, propertyId: string): Promise<DecisionRecord[]> {
    return this.read().decisions.filter((d) => d.propertyId === propertyId).sort((a, b) => b.version - a.version);
  }

  async createDecision(_groupId: string, input: { propertyId: string; decision: DecisionRecord["decision"]; conditions: string[]; memoSnapshot: unknown }, user: CurrentUser): Promise<DecisionRecord> {
    const db = this.read();
    const version = db.decisions.filter((d) => d.propertyId === input.propertyId).length + 1;
    const rec: DecisionRecord = { ...input, id: randomUUID(), version, decidedAt: new Date().toISOString(), decidedBy: user.id, decidedByName: user.name };
    db.decisions.push(rec);
    this.audit(db, "investment_decisions", rec.id, "INSERT", user.id, null, { decision: rec.decision, conditions: rec.conditions, version });
    this.write(db);
    return rec;
  }

  async listBidApprovals(_groupId: string, propertyId: string): Promise<BidApprovalRecord[]> {
    return this.read().approvals.filter((a) => a.propertyId === propertyId).sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
  }

  async createBidApproval(_groupId: string, input: { propertyId: string; decisionId: string | null; approvedCap: number; validUntil: string; justification: string | null }, user: CurrentUser): Promise<BidApprovalRecord> {
    const db = this.read();
    const rec: BidApprovalRecord = { ...input, id: randomUUID(), approvedBy: user.id, approvedByName: user.name, approvedAt: new Date().toISOString(), supersededBy: null };
    for (const a of db.approvals) if (a.propertyId === input.propertyId && !a.supersededBy) a.supersededBy = rec.id;
    db.approvals.push(rec);
    this.audit(db, "bid_approvals", rec.id, "INSERT", user.id, null, rec);
    this.write(db);
    return rec;
  }

  async listAuditLogs(_groupId: string, limit = 200): Promise<AuditLogRecord[]> {
    return this.read().audit.slice(0, limit);
  }
}

function flagsFor(p: PropertyInput | PropertyRecord) {
  return detectAtypicalFlags({
    type: p.type,
    ageYears: p.ageYears,
    condition: p.condition,
    woodConstruction: p.woodConstruction,
    irregularConstruction: p.irregularConstruction,
    registryAreaM2: p.registryAreaM2,
    usableAreaM2: p.usableAreaM2,
    buildingStandard: p.buildingStandard,
  });
}
