import "server-only";
import { redirect } from "next/navigation";
import { getRepository } from "@/data";
import type { CurrentUser, MemberRole } from "@/data/types";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const repo = await getRepository();
  return repo.getCurrentUser();
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Matriz de permissões (espelha as políticas RLS; defesa em profundidade). */
export const PERMISSIONS = {
  editProperty: ["ADMIN", "ANALISTA"],
  editAnalysis: ["ADMIN", "ANALISTA"],
  editRisks: ["ADMIN", "ANALISTA", "JURIDICO"],
  registerDecision: ["ADMIN", "ANALISTA"],
  approveCap: ["ADMIN"],
  editProfile: ["ADMIN"],
  manageMembers: ["ADMIN"],
  viewAudit: ["ADMIN", "FINANCEIRO"],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(user: CurrentUser | null, permission: Permission): boolean {
  if (!user) return false;
  return (PERMISSIONS[permission] as readonly MemberRole[]).includes(user.role);
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user, permission)) throw new Error(`Sem permissão: ${permission} exige ${PERMISSIONS[permission].join(" ou ")} (seu papel: ${user.role})`);
  return user;
}
