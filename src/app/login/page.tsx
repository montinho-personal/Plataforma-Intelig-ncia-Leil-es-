import { redirect } from "next/navigation";
import { dataBackend } from "@/data";
import { loginAction } from "@/server/actions/auth";
import { btnPrimary, Field, Input } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (dataBackend() !== "supabase") redirect("/");
  const { error } = await searchParams;
  async function submit(fd: FormData) {
    "use server";
    const r = await loginAction(fd);
    if (r?.error) redirect(`/login?error=${encodeURIComponent(r.error)}`);
  }
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form action={submit} className="w-full max-w-sm space-y-4 rounded-md border border-line bg-bg-panel p-6">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-fg-faint">Leilão OS</div>
          <h1 className="mt-1 text-lg font-semibold">Acesso privado</h1>
          <p className="mt-1 text-xs text-fg-muted">Somente convidadas. Não há cadastro aberto.</p>
        </div>
        {error && <p className="rounded border border-bad/50 bg-bad/5 px-3 py-2 text-xs text-bad">{error}</p>}
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <button className={btnPrimary} type="submit">
          Entrar
        </button>
      </form>
    </main>
  );
}
