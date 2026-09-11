"use server";

import { guarded } from "@/server/action-errors";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRepository } from "@/data";
import type { ComparableInputRecord } from "@/data/types";
import { requirePermission } from "@/server/auth";
import { bool, dec, enumOf, int, money, str } from "@/server/forms";

const KINDS = ["LISTING", "SOLD", "GROUP_HISTORY"] as const;
const STANDARDS = ["ECONOMICO", "MEDIO", "ALTO", "LUXO"] as const;
const CONDITIONS = ["RUIM", "REGULAR", "BOM", "REFORMADO", "NOVO"] as const;

function parse(propertyId: string, fd: FormData): ComparableInputRecord {
  const price = money(fd, "price");
  const usableAreaM2 = dec(fd, "usableAreaM2");
  const source = str(fd, "source");
  if (!price || price <= 0 || !usableAreaM2 || usableAreaM2 <= 0 || !source) throw new Error("Fonte, preço e área são obrigatórios.");
  const location = str(fd, "location");
  return {
    propertyId,
    source,
    url: str(fd, "url"),
    capturedAt: str(fd, "capturedAt") ?? new Date().toISOString().slice(0, 10),
    kind: enumOf(fd, "kind", KINDS) ?? "LISTING",
    address: str(fd, "address"),
    distanceM: int(fd, "distanceM"),
    sameCondo: location === "CONDO",
    sameStreet: location === "STREET",
    sameNeighborhood: location === "NEIGHBORHOOD" || location === "CONDO" || location === "STREET",
    usableAreaM2,
    bedrooms: int(fd, "bedrooms"),
    parking: int(fd, "parking"),
    floor: int(fd, "floor"),
    ageYears: int(fd, "ageYears"),
    buildingStandard: enumOf(fd, "buildingStandard", STANDARDS),
    condition: enumOf(fd, "condition", CONDITIONS),
    monthlyCondo: money(fd, "monthlyCondo"),
    price,
    daysOnMarket: int(fd, "daysOnMarket"),
    notes: str(fd, "notes"),
    excluded: false,
    excludedReason: null,
  };
}

export async function createComparableAction(propertyId: string, fd: FormData) {
  return guarded(`/oportunidades/${propertyId}/comparaveis`, async () => {
    const user = await requirePermission("editAnalysis");
    const repo = await getRepository();
    await repo.createComparable(user.groupId, parse(propertyId, fd), user.id);
    revalidatePath(`/oportunidades/${propertyId}`);
  });
}

export async function excludeComparableAction(propertyId: string, id: string, fd: FormData) {
  return guarded(`/oportunidades/${propertyId}/comparaveis`, async () => {
    const user = await requirePermission("editAnalysis");
    const repo = await getRepository();
    const reason = str(fd, "reason");
    if (!reason) throw new Error("Informe o motivo da exclusão.");
    await repo.updateComparable(user.groupId, id, { excluded: true, excludedReason: reason }, user.id);
    revalidatePath(`/oportunidades/${propertyId}`);
  });
}

export async function includeComparableAction(propertyId: string, id: string) {
  const user = await requirePermission("editAnalysis");
  const repo = await getRepository();
  await repo.updateComparable(user.groupId, id, { excluded: false, excludedReason: null }, user.id);
  revalidatePath(`/oportunidades/${propertyId}`);
}

export async function deleteComparableAction(propertyId: string, id: string) {
  const user = await requirePermission("editAnalysis");
  const repo = await getRepository();
  await repo.deleteComparable(user.groupId, id, user.id);
  revalidatePath(`/oportunidades/${propertyId}`);
}

/** Importação CSV: colunas fonte;preco;area;quartos;vagas;andar;idade;padrao;estado;localizacao;dias;url */
export async function importComparablesCsvAction(propertyId: string, fd: FormData) {
  return guarded(`/oportunidades/${propertyId}/comparaveis`, async () => {
    const user = await requirePermission("editAnalysis");
    const repo = await getRepository();
    const text = str(fd, "csv") ?? "";
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const errors: string[] = [];
    let imported = 0;
    for (const [i, line] of lines.entries()) {
      if (i === 0 && /fonte/i.test(line)) continue;
      const cols = line.split(/[;\t]/).map((c) => c.trim());
      const f = new FormData();
      const [source, price, area, bedrooms, parking, floor, age, standard, condition, location, days, url] = cols;
      f.set("source", source ?? "");
      f.set("price", price ?? "");
      f.set("usableAreaM2", area ?? "");
      if (bedrooms) f.set("bedrooms", bedrooms);
      if (parking) f.set("parking", parking);
      if (floor) f.set("floor", floor);
      if (age) f.set("ageYears", age);
      if (standard) f.set("buildingStandard", standard.toUpperCase());
      if (condition) f.set("condition", condition.toUpperCase());
      if (location) f.set("location", location.toUpperCase());
      if (days) f.set("daysOnMarket", days);
      if (url) f.set("url", url);
      try {
        await repo.createComparable(user.groupId, parse(propertyId, f), user.id);
        imported++;
      } catch (e) {
        errors.push(`linha ${i + 1}: ${(e as Error).message}`);
      }
    }
    revalidatePath(`/oportunidades/${propertyId}`);
    const summary = `${imported} comparável(is) importado(s)${errors.length ? `; ${errors.length} linha(s) com erro: ${errors.slice(0, 3).join(" | ")}` : ""}`;
    redirect(`/oportunidades/${propertyId}/comparaveis?${errors.length ? "error" : "ok"}=${encodeURIComponent(summary)}`);
  });
}

export async function setLiquidityAction(propertyId: string, fd: FormData) {
  return guarded(`/oportunidades/${propertyId}/comparaveis`, async () => {
    const user = await requirePermission("editAnalysis");
    const repo = await getRepository();
    const liquidityClass = enumOf(fd, "liquidityClass", ["ALTA", "MEDIA", "BAIXA"] as const);
    await repo.updateProperty(user.groupId, propertyId, { liquidityClass }, user.id);
    revalidatePath(`/oportunidades/${propertyId}`);
    void bool;
  });
}
