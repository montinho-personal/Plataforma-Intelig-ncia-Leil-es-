import "server-only";
import { LocalJsonRepository } from "./local";
import type { Repository } from "./repository";

let local: LocalJsonRepository | null = null;

export function dataBackend(): "local" | "supabase" {
  return (process.env.DATA_BACKEND ?? "local") === "supabase" ? "supabase" : "local";
}

/** Fábrica do repositório conforme o backend configurado. */
export async function getRepository(): Promise<Repository> {
  if (dataBackend() === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const { SupabaseRepository } = await import("./supabase");
    return new SupabaseRepository(await createSupabaseServerClient());
  }
  if (!local) local = new LocalJsonRepository();
  return local;
}
