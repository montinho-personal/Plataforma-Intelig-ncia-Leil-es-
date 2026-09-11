import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0b0d10", raised: "#111418", panel: "#161a20", hover: "#1c2129" },
        line: { DEFAULT: "#242a33", strong: "#323a45" },
        fg: { DEFAULT: "#e6e9ee", muted: "#9aa4b2", faint: "#6b7482" },
        accent: { DEFAULT: "#7cc4ff", dim: "#2b4c66" },
        ok: "#4cd08a",
        warn: "#f2c14e",
        hot: "#f28b4e",
        bad: "#f05d5d",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: { xxs: ["0.6875rem", "1rem"] },
    },
  },
  plugins: [],
} satisfies Config;
