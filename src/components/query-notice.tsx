"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Exibe ?error= / ?ok= da URL (retorno de server actions) e permite fechar. */
export function QueryNotice() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const error = sp.get("error");
  const ok = sp.get("ok");
  if (!error && !ok) return null;
  const dismiss = () => {
    const next = new URLSearchParams(sp.toString());
    next.delete("error");
    next.delete("ok");
    router.replace(next.size ? `${pathname}?${next}` : pathname);
  };
  return (
    <div role="alert" className={`mb-4 flex items-start justify-between gap-3 rounded border px-3 py-2 text-xs ${error ? "border-bad/50 bg-bad/5 text-bad" : "border-ok/40 bg-ok/5 text-ok"}`}>
      <span>{error ?? ok}</span>
      <button onClick={dismiss} className="font-mono text-fg-faint hover:text-fg" aria-label="fechar">
        ×
      </button>
    </div>
  );
}
