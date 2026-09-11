"use server";

import { guarded } from "@/server/action-errors";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/data";
import type { RiskRecord } from "@/data/types";
import { formatBRL } from "@/domain/money";
import { requirePermission } from "@/server/auth";
import { loadOpportunity } from "@/server/analysis";
import { buildMemo } from "@/server/memo";
import { bool, enumOf, int, money, str } from "@/server/forms";

const DECISIONS = ["APROVAR", "APROVAR_COM_CONDICOES", "REVISAR", "REPROVAR"] as const;
const CATEGORIES = ["JURIDICO", "FINANCEIRO", "MERCADO", "OCUPACAO", "REFORMA", "LIQUIDEZ", "DOCUMENTAL"] as const;

export async function registerDecisionAction(propertyId: string, fd: FormData) {
  return guarded(`/oportunidades/${propertyId}/memorando`, async () => {
    const user = await requirePermission("registerDecision");
    const repo = await getRepository();
    const ctx = await loadOpportunity(user, propertyId);
    if (!ctx) throw new Error("Imóvel não encontrado");
    const decision = enumOf(fd, "decision", DECISIONS);
    if (!decision) throw new Error("Decisão inválida");
    const conditions = (str(fd, "conditions") ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (decision === "APROVAR_COM_CONDICOES" && conditions.length === 0) throw new Error("Aprovação com condições exige ao menos uma condição.");
    if (ctx.analysis.valuation.status !== "OK" && (decision === "APROVAR" || decision === "APROVAR_COM_CONDICOES")) {
      throw new Error("Não é possível aprovar com valuation em DADOS INSUFICIENTES ou CASO ATÍPICO. Registre REVISAR ou resolva o valuation.");
    }
    const memo = buildMemo(ctx);
    await repo.createDecision(user.groupId, { propertyId, decision, conditions, memoSnapshot: memo }, user);
    const status = decision === "REPROVAR" ? "REPROVADO" : decision === "REVISAR" ? "EM_ANALISE" : "APROVADO";
    await repo.updateProperty(user.groupId, propertyId, { status }, user.id);
    revalidatePath(`/oportunidades/${propertyId}`);
    revalidatePath("/");
  });
}

export async function approveCapAction(propertyId: string, fd: FormData) {
  return guarded(`/oportunidades/${propertyId}/memorando`, async () => {
    const user = await requirePermission("approveCap");
    const repo = await getRepository();
    const ctx = await loadOpportunity(user, propertyId);
    if (!ctx) throw new Error("Imóvel não encontrado");
    const cap = money(fd, "approvedCap");
    if (!cap || cap <= 0) throw new Error("Informe o teto aprovado.");
    const validUntil = str(fd, "validUntil");
    if (!validUntil) throw new Error("Informe a validade do teto.");
    const justification = str(fd, "justification");
    const max = ctx.analysis.maxBid;
    if (!max || max.blocked) throw new Error("Lance máximo bloqueado: resolva o valuation (dados insuficientes/atípico) ou registre override justificado antes de aprovar.");
    const absolute = max.byKey.ABSOLUTE_MAX.bid;
    if (cap > absolute && !justification) throw new Error(`Teto acima do máximo absoluto (${formatBRL(absolute)}). Exige justificativa explícita.`);
    const criticalOpen = ctx.risks.filter((r) => r.isCritical && r.status === "ABERTO");
    if (criticalOpen.length > 0 && !bool(fd, "acknowledgeCritical")) throw new Error(`Há ${criticalOpen.length} risco(s) crítico(s) em aberto. Reconheça-os explicitamente para aprovar o teto.`);
    const latestDecision = ctx.decisions[0] ?? null;
    await repo.createBidApproval(user.groupId, { propertyId, decisionId: latestDecision?.id ?? null, approvedCap: cap, validUntil, justification }, user);
    revalidatePath(`/oportunidades/${propertyId}`);
  });
}

export async function createRiskAction(propertyId: string, fd: FormData) {
  return guarded(`/oportunidades/${propertyId}/riscos`, async () => {
    const user = await requirePermission("editRisks");
    const repo = await getRepository();
    const category = enumOf(fd, "category", CATEGORIES);
    const fact = str(fd, "fact");
    const risk = str(fd, "risk");
    const probability = int(fd, "probability") ?? 3;
    const impactScore = int(fd, "impactScore") ?? 3;
    if (!category || !fact || !risk) throw new Error("Categoria, fato e risco são obrigatórios.");
    const input: Omit<RiskRecord, "id" | "createdAt"> = {
      propertyId,
      category,
      fact,
      risk,
      impact: str(fd, "impact"),
      recommendedAction: str(fd, "recommendedAction"),
      probability: Math.min(5, Math.max(1, probability)),
      impactScore: Math.min(5, Math.max(1, impactScore)),
      isCritical: bool(fd, "isCritical") || probability * impactScore >= 15,
      status: "ABERTO",
    };
    await repo.createRisk(user.groupId, input, user.id);
    revalidatePath(`/oportunidades/${propertyId}`);
  });
}

export async function updateRiskStatusAction(propertyId: string, id: string, fd: FormData) {
  const user = await requirePermission("editRisks");
  const repo = await getRepository();
  const status = enumOf(fd, "status", ["ABERTO", "MITIGADO", "ACEITO", "ENCERRADO"] as const);
  if (!status) throw new Error("Status inválido");
  await repo.updateRiskStatus(user.groupId, id, status, user.id);
  revalidatePath(`/oportunidades/${propertyId}`);
}
