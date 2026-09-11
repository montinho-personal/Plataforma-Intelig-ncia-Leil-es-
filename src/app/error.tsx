"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg rounded border border-bad/50 bg-bad/5 p-4 text-xs">
        <p className="font-semibold text-bad">Algo deu errado</p>
        <p className="mt-1 text-fg-muted">{error.message}</p>
        <button onClick={reset} className="mt-3 rounded border border-line-strong px-3 py-1.5 text-fg-muted hover:text-fg">
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
