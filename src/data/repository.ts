import type {
  AnalysisSettings,
  AuditLogRecord,
  BidApprovalRecord,
  ComparableInputRecord,
  ComparableRecord,
  CurrentUser,
  DecisionKind,
  DecisionRecord,
  GroupMember,
  MemberRole,
  ProfileRecord,
  PropertyInput,
  PropertyRecord,
  RenovationOverrideRecord,
  RiskRecord,
} from "./types";

export interface PropertyFilters {
  status?: string | null;
  city?: string | null;
  type?: string | null;
  modality?: string | null;
  favorites?: boolean;
  q?: string | null;
}

/**
 * Contrato de persistência. Duas implementações: LocalJsonRepository (desenvolvimento/demonstração)
 * e SupabaseRepository (produção). Toda a lógica de negócio fica fora daqui.
 */
export interface Repository {
  getCurrentUser(): Promise<CurrentUser | null>;
  listMembers(groupId: string): Promise<GroupMember[]>;
  updateMemberRole(groupId: string, userId: string, role: MemberRole): Promise<void>;

  getDefaultProfile(groupId: string): Promise<ProfileRecord>;
  updateProfile(groupId: string, profile: ProfileRecord, changedBy: string): Promise<ProfileRecord>;

  listProperties(groupId: string, filters?: PropertyFilters): Promise<PropertyRecord[]>;
  getProperty(groupId: string, id: string): Promise<PropertyRecord | null>;
  createProperty(groupId: string, input: PropertyInput, createdBy: string): Promise<PropertyRecord>;
  updateProperty(groupId: string, id: string, patch: Partial<PropertyInput>, changedBy: string): Promise<PropertyRecord>;

  listComparables(groupId: string, propertyId: string): Promise<ComparableRecord[]>;
  createComparable(groupId: string, input: ComparableInputRecord, createdBy: string): Promise<ComparableRecord>;
  updateComparable(groupId: string, id: string, patch: Partial<ComparableInputRecord>, changedBy: string): Promise<ComparableRecord>;
  deleteComparable(groupId: string, id: string, changedBy: string): Promise<void>;

  getAnalysisSettings(groupId: string, propertyId: string): Promise<AnalysisSettings | null>;
  upsertAnalysisSettings(groupId: string, settings: AnalysisSettings, changedBy: string): Promise<AnalysisSettings>;

  listRenovationOverrides(groupId: string, propertyId: string): Promise<RenovationOverrideRecord[]>;
  upsertRenovationOverride(groupId: string, input: Omit<RenovationOverrideRecord, "id">, changedBy: string): Promise<RenovationOverrideRecord>;
  deleteRenovationOverride(groupId: string, id: string, changedBy: string): Promise<void>;

  listRisks(groupId: string, propertyId: string): Promise<RiskRecord[]>;
  createRisk(groupId: string, input: Omit<RiskRecord, "id" | "createdAt">, createdBy: string): Promise<RiskRecord>;
  updateRiskStatus(groupId: string, id: string, status: RiskRecord["status"], changedBy: string): Promise<void>;

  listDecisions(groupId: string, propertyId: string): Promise<DecisionRecord[]>;
  createDecision(groupId: string, input: { propertyId: string; decision: DecisionKind; conditions: string[]; memoSnapshot: unknown }, user: CurrentUser): Promise<DecisionRecord>;
  listBidApprovals(groupId: string, propertyId: string): Promise<BidApprovalRecord[]>;
  createBidApproval(groupId: string, input: { propertyId: string; decisionId: string | null; approvedCap: number; validUntil: string; justification: string | null }, user: CurrentUser): Promise<BidApprovalRecord>;

  listAuditLogs(groupId: string, limit?: number): Promise<AuditLogRecord[]>;
}
