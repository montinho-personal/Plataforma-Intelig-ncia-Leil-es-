"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/data";
import type { AnalysisSettings } from "@/data/types";
import { RENOVATION_LEVELS } from "@/domain/types";
import { requirePermission } from "@/server/auth";
import { defaultSettings } from "@/server/analysis";
import { enumOf, int, money, str } from "@/server/forms";

async function current(groupId: string, propertyId: string): Promise<AnalysisSettings> {
  const repo = await getRepository();
  return (await repo.getAnalysisSettings(groupId, propertyId)) ?? defaultSettings(propertyId);
}

export async function updateAnalysisSettingsAction(propertyId: string, fd: FormData) {
  const user = await requirePermission("editAnalysis");
  const repo = await getRepository();
  const s = await current(user.groupId, propertyId);
  const level = enumOf(fd, "renovationLevel", RENOVATION_LEVELS);
  const horizon = int(fd, "exitHorizonDays");
  const next: AnalysisSettings = {
    ...s,
    renovationLevel: level ?? s.renovationLevel,
    exitHorizonDays: fd.has("exitHorizonDays") ? (([30, 60, 90, 120, 180] as const).find((h) => h === horizon) ?? null) : s.exitHorizonDays,
    referenceBid: fd.has("referenceBid") ? money(fd, "referenceBid") : s.referenceBid,
    evictionMonths: fd.has("evictionMonths") ? int(fd, "evictionMonths") : s.evictionMonths,
    evictionCost: fd.has("evictionCost") ? money(fd, "evictionCost") : s.evictionCost,
    holdingMonths: fd.has("holdingMonths") ? int(fd, "holdingMonths") : s.holdingMonths,
  };
  await repo.upsertAnalysisSettings(user.groupId, next, user.id);
  revalidatePath(`/oportunidades/${propertyId}`);
}

export async function setMaxBidOverrideAction(propertyId: string, fd: FormData) {
  const user = await requirePermission("approveCap");
  const repo = await getRepository();
  const s = await current(user.groupId, propertyId);
  const justification = str(fd, "justification");
  await repo.upsertAnalysisSettings(user.groupId, { ...s, maxBidOverrideJustification: justification }, user.id);
  revalidatePath(`/oportunidades/${propertyId}`);
}

export async function upsertRenovationOverrideAction(propertyId: string, fd: FormData) {
  const user = await requirePermission("editAnalysis");
  const repo = await getRepository();
  const category = str(fd, "category");
  const likely = money(fd, "likely");
  const source = str(fd, "source");
  if (!category || !likely || !source) throw new Error("Categoria, valor provável e fonte são obrigatórios.");
  const low = money(fd, "low") ?? likely;
  const high = money(fd, "high") ?? likely;
  await repo.upsertRenovationOverride(user.groupId, { propertyId, category: category as never, low, likely, high, basis: enumOf(fd, "basis", ["QUOTE", "MANUAL"] as const) ?? "QUOTE", source }, user.id);
  revalidatePath(`/oportunidades/${propertyId}`);
}

export async function deleteRenovationOverrideAction(propertyId: string, id: string) {
  const user = await requirePermission("editAnalysis");
  const repo = await getRepository();
  await repo.deleteRenovationOverride(user.groupId, id, user.id);
  revalidatePath(`/oportunidades/${propertyId}`);
}
