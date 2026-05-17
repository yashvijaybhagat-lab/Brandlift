import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        skeleton: "var(--skeleton)",
        "brand-bg": "#0A0A0B",
        "brand-surface": "#111113",
        "brand-surface-elevated": "#18181C",
        "brand-border": "rgba(255,255,255,0.06)",
        "brand-border-strong": "rgba(255,255,255,0.12)",
        "brand-primary": "#6366f1",
        "brand-primary-hover": "#4f46e5",
        "brand-primary-muted": "rgba(99,102,241,0.12)",
        "brand-accent": "#8b5cf6",
        "brand-text": "#FAFAFA",
        "brand-text-secondary": "#A1A1AA",
        "brand-text-muted": "#71717A",
        "brand-success": "#4ADE80",
        "brand-warning": "#FBBF24",
        "brand-error": "#F87171",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        "12": ["12px", { lineHeight: "1.6" }],
        "14": ["14px", { lineHeight: "1.6" }],
        "16": ["16px", { lineHeight: "1.6" }],
        "20": ["20px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "24": ["24px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "32": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "48": ["48px", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "64": ["64px", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        interactive: "8px",
        card: "12px",
        container: "16px",
        pill: "24px",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "stagger-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "15%": { transform: "translateX(-4px)" },
          "30%": { transform: "translateX(4px)" },
          "45%": { transform: "translateX(-3px)" },
          "60%": { transform: "translateX(3px)" },
          "75%": { transform: "translateX(-2px)" },
          "90%": { transform: "translateX(2px)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(6px)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "completion-bounce": {
          "0%": { transform: "scaleX(1)" },
          "50%": { transform: "scaleX(1.02)" },
          "100%": { transform: "scaleX(1)" },
        },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "40%": { transform: "translateY(-4px)", opacity: "1" },
        },
        ripple: {
          "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
          "50%": { transform: "translate(-50%, -50%) scale(0.9)" },
        },
        orbit: {
          "0%": { transform: "rotate(0deg) translateY(calc(var(--radius) * 1px)) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateY(calc(var(--radius) * 1px)) rotate(-360deg)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fadeIn 280ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        "stagger-in": "stagger-in 280ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        shake: "shake 400ms cubic-bezier(0.23, 1, 0.32, 1)",
        "slide-up": "slide-up 280ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        "slide-down": "slide-down 200ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        "scale-in": "scale-in 250ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        "completion-bounce": "completion-bounce 300ms cubic-bezier(0.23, 1, 0.32, 1)",
        "dot-bounce": "dot-bounce 1.2s ease-in-out infinite",
        ripple: "ripple 2s ease calc(var(--i, 0) * 0.2s) infinite",
        orbit: "orbit calc(var(--duration) * 1s) linear infinite",
      },
      transitionTimingFunction: {
        "brand-enter": "cubic-bezier(0.23, 1, 0.32, 1)",
        "brand-exit": "cubic-bezier(0.23, 1, 0.32, 1)",
        "brand-move": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      transitionDuration: {
        "130": "130ms",
        "160": "160ms",
        "220": "220ms",
        "280": "280ms",
        "320": "320ms",
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #0A0A0B 0%, #111113 50%, #18181C 100%)",
        "primary-gradient": "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
      },
      boxShadow: {
        "focus-indigo":
          "0 0 0 3px rgba(99,102,241,0.25), inset 0 0 0 1px rgba(99,102,241,0.5)",
        "focus-error":
          "0 0 0 3px rgba(248,113,113,0.2), inset 0 0 0 1px rgba(248,113,113,0.5)",
        "card-glow": "0 0 0 1px rgba(255,255,255,0.06), 0 2px 8px rgba(0,0,0,0.4)",
        "card-hover": "0 0 0 1px rgba(255,255,255,0.1), 0 4px 16px rgba(0,0,0,0.5)",
        "indigo-glow": "0 0 20px rgba(99,102,241,0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
