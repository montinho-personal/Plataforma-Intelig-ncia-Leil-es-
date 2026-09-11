import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center text-xs text-fg-muted">
        <p>Não encontrado.</p>
        <Link href="/" className="text-accent underline">
          Voltar à visão geral
        </Link>
      </div>
    </main>
  );
}
