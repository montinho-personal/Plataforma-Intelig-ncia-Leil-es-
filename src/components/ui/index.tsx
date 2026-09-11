import type { ReactNode } from "react";
import { formatBRL, formatPct } from "@/domain/money";
import type { EpistemicStatus } from "@/domain/types";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Valor monetário em fonte mono, alinhado à direita quando em tabela. */
export function Money({ cents, className, signed = false, compact = false }: { cents: number | null | undefined; className?: string; signed?: boolean; compact?: boolean }) {
  if (cents === null || cents === undefined) return <span className={cx("font-mono text-fg-faint", className)}>—</span>;
  const text = formatBRL(cents);
  const neg = cents < 0;
  return (
    <span className={cx("font-mono tabular-nums", neg ? "text-bad" : signed && cents > 0 ? "text-ok" : "", className)}>
      {signed && cents > 0 ? "+" : ""}
      {compact ? text.replace("R$ ", "") : text}
    </span>
  );
}

export function Pct({ value, digits = 1, className, signed = false }: { value: number | null | undefined; digits?: number; className?: string; signed?: boolean }) {
  if (value === null || value === undefined) return <span className={cx("font-mono text-fg-faint", className)}>—</span>;
  return (
    <span className={cx("font-mono tabular-nums", value < 0 ? "text-bad" : "", className)}>
      {signed && value > 0 ? "+" : ""}
      {formatPct(value, digits)}
    </span>
  );
}

const EPISTEMIC: Record<EpistemicStatus, { label: string; cls: string; symbol: string }> = {
  FACT: { label: "Fato", cls: "text-ok border-ok/40", symbol: "■" },
  ESTIMATE: { label: "Estimativa", cls: "text-accent border-accent/40", symbol: "≈" },
  HYPOTHESIS: { label: "Hipótese", cls: "text-warn border-warn/40", symbol: "?" },
  MISSING: { label: "Ausente", cls: "text-fg-faint border-line-strong border-dashed", symbol: "—" },
};

/** Distinção visual obrigatória: fato ≠ estimativa ≠ hipótese ≠ ausente. */
export function Epistemic({ status, title }: { status: EpistemicStatus; title?: string }) {
  const e = EPISTEMIC[status];
  return (
    <span title={title ? `${e.label}: ${title}` : e.label} className={cx("inline-flex h-4 min-w-4 items-center justify-center rounded-sm border px-1 font-mono text-xxs leading-none", e.cls)}>
      {e.symbol}
    </span>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "hot" | "bad" | "accent"; className?: string }) {
  const tones = {
    neutral: "border-line-strong text-fg-muted",
    ok: "border-ok/50 text-ok",
    warn: "border-warn/50 text-warn",
    hot: "border-hot/50 text-hot",
    bad: "border-bad/50 text-bad",
    accent: "border-accent/50 text-accent",
  };
  return <span className={cx("inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-xxs uppercase tracking-wide", tones[tone], className)}>{children}</span>;
}

export function Card({ title, children, className, actions, subtitle }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cx("rounded-md border border-line bg-bg-panel", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-2.5">
          <div>
            {title && <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-fg-faint">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

/** Número grande da camada "decisão". */
export function Stat({ label, children, hint, tone }: { label: ReactNode; children: ReactNode; hint?: ReactNode; tone?: "ok" | "warn" | "hot" | "bad" | "accent" }) {
  const toneCls = tone ? { ok: "text-ok", warn: "text-warn", hot: "text-hot", bad: "text-bad", accent: "text-accent" }[tone] : "";
  return (
    <div className="min-w-0">
      <div className="text-xxs uppercase tracking-wider text-fg-faint">{label}</div>
      <div className={cx("mt-0.5 font-mono text-xl tabular-nums leading-tight", toneCls)}>{children}</div>
      {hint && <div className="mt-0.5 text-xxs text-fg-muted">{hint}</div>}
    </div>
  );
}

export function ConfidenceBar({ value }: { value: number }) {
  const tone = value >= 75 ? "bg-ok" : value >= 55 ? "bg-warn" : "bg-bad";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded bg-line">
        <div className={cx("h-full", tone)} style={{ width: `${Math.max(2, value)}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums">{value}%</span>
    </div>
  );
}

export function RangeText({ low, likely, high }: { low: number; likely: number; high: number }) {
  return (
    <span className="font-mono tabular-nums">
      <span className="text-fg-muted">{formatBRL(low).replace("R$ ", "")}</span> <span className="text-fg-faint">–</span> <span>{formatBRL(likely)}</span> <span className="text-fg-faint">–</span>{" "}
      <span className="text-fg-muted">{formatBRL(high).replace("R$ ", "")}</span>
    </span>
  );
}

export function Notice({ tone = "warn", children }: { tone?: "warn" | "bad" | "ok" | "accent"; children: ReactNode }) {
  const cls = { warn: "border-warn/40 bg-warn/5 text-warn", bad: "border-bad/50 bg-bad/5 text-bad", ok: "border-ok/40 bg-ok/5 text-ok", accent: "border-accent/40 bg-accent/5 text-accent" }[tone];
  return <div className={cx("rounded border px-3 py-2 text-xs", cls)}>{children}</div>;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-xs [&_td]:px-2 [&_td]:py-1.5 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-xxs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-fg-faint [&_tr]:border-b [&_tr]:border-line">{children}</table>
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 block text-xxs uppercase tracking-wider text-fg-faint">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xxs text-fg-faint">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full rounded border border-line-strong bg-bg-raised px-2 py-1.5 font-mono text-xs text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none";
export const selectCls = inputCls;
export const btnPrimary = "inline-flex items-center gap-1.5 rounded border border-accent/60 bg-accent-dim px-3 py-1.5 text-xs font-medium text-fg hover:bg-accent/30 disabled:opacity-50";
export const btnGhost = "inline-flex items-center gap-1.5 rounded border border-line-strong px-3 py-1.5 text-xs text-fg-muted hover:border-fg-faint hover:text-fg";
export const btnDanger = "inline-flex items-center gap-1.5 rounded border border-bad/50 px-3 py-1.5 text-xs text-bad hover:bg-bad/10";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(selectCls, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, "font-sans", props.className)} />;
}

/** Progressive disclosure: camada "por quê" / "evidências". */
export function Disclosure({ summary, children, open = false }: { summary: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded border border-line">
      <summary className="cursor-pointer select-none break-words px-3 py-2 text-xs font-medium text-fg-muted hover:text-fg">
        <span className="mr-2 inline-block text-fg-faint transition-transform group-open:rotate-90">▸</span>
        {summary}
      </summary>
      <div className="border-t border-line px-3 py-2">{children}</div>
    </details>
  );
}

export function money(cents: number | null | undefined) {
  return formatBRL(cents);
}
