import { fromBRL } from "@/domain/money";

/** Helpers de parsing de FormData (pt-BR): "1.250.000,50" → centavos; "" → null. */
export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function num(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s === null) return null;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Número decimal (áreas, fatores): aceita "98,5" e "98.5". */
export function dec(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s === null) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : null;
}

export function int(fd: FormData, key: string): number | null {
  const n = dec(fd, key);
  return n === null ? null : Math.round(n);
}

export function money(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n === null ? null : fromBRL(n);
}

/** Percentual digitado como "27" ou "27,5" → 0.275 */
export function pct(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n === null ? null : n / 100;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function enumOf<T extends string>(fd: FormData, key: string, allowed: readonly T[]): T | null {
  const s = str(fd, key);
  return s && (allowed as readonly string[]).includes(s) ? (s as T) : null;
}
