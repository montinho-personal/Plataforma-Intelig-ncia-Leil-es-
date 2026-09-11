"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

/**
 * Casca da aplicação. Em telas largas (lg+) o menu é fixo à esquerda.
 * No celular ele vira uma gaveta que abre por cima do conteúdo, para não dividir a tela.
 */
export function AppShell({ sidebar, groupName, children }: { sidebar: ReactNode; groupName: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex min-h-screen">
      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <div
        className={cx(
          "fixed inset-y-0 left-0 z-50 w-56 shrink-0 transform transition-transform duration-200 ease-out",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-none",
          open ? "translate-x-0 shadow-2xl shadow-black/50" : "-translate-x-full",
        )}
        // Fecha a gaveta ao tocar em qualquer link (inclusive os que só mudam a query string).
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        {sidebar}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-bg-raised px-4 py-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded border border-line-strong text-fg-muted hover:text-fg"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="font-mono text-xs font-semibold uppercase tracking-widest">Leilão OS</div>
            <div className="truncate text-xxs text-fg-faint">{groupName}</div>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
