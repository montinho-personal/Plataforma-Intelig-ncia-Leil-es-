"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { seg: "", label: "Resumo" },
  { seg: "imovel", label: "Imóvel" },
  { seg: "comparaveis", label: "Comparáveis" },
  { seg: "valuation", label: "Valuation" },
  { seg: "reforma", label: "Reforma" },
  { seg: "underwriting", label: "Underwriting" },
  { seg: "cenarios", label: "Cenários" },
  { seg: "lance-maximo", label: "Lance máximo" },
  { seg: "riscos", label: "Riscos" },
  { seg: "memorando", label: "Memorando" },
];

export function OpportunityTabs({ id, counts, states }: { id: string; counts: { comparaveis: number; riscos: number }; states: { valuation: string; maxBidBlocked: boolean } }) {
  const pathname = usePathname();
  const base = `/oportunidades/${id}`;
  return (
    <nav className="flex flex-wrap gap-1 border-b border-line">
      {TABS.map((t) => {
        const href = t.seg ? `${base}/${t.seg}` : base;
        const active = t.seg ? pathname.startsWith(href) : pathname === base;
        let mark: string | null = null;
        if (t.seg === "comparaveis") mark = String(counts.comparaveis);
        if (t.seg === "riscos" && counts.riscos > 0) mark = String(counts.riscos);
        if (t.seg === "valuation") mark = states.valuation === "OK" ? "✔" : states.valuation === "ATYPICAL" ? "⚠" : "!";
        if (t.seg === "lance-maximo") mark = states.maxBidBlocked ? "bloq." : "✔";
        return (
          <Link key={t.seg} href={href} className={`-mb-px border-b-2 px-3 py-2 text-xs ${active ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}>
            {t.label}
            {mark && <span className="ml-1.5 font-mono text-xxs text-fg-faint">{mark}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
