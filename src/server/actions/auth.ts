"use server";

import { redirect } from "next/navigation";
import { dataBackend } from "@/data";
import { str } from "@/server/forms";

export async function loginAction(fd: FormData): Promise<{ error: string } | void> {
  if (dataBackend() !== "supabase") redirect("/");
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const email = str(fd, "email");
  const password = str(fd, "password");
  if (!email || !password) return { error: "Informe e-mail e senha." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Credenciais inválidas." };
  redirect("/");
}

export async function logoutAction() {
  if (dataBackend() === "supabase") {
    const { createSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
