import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        liv: {
          bg: "oklch(var(--liv-bg) / <alpha-value>)",
          surface: "oklch(var(--liv-surface) / <alpha-value>)",
          "surface-2": "oklch(var(--liv-surface-2) / <alpha-value>)",
          line: "oklch(var(--liv-line) / <alpha-value>)",
          ink: "oklch(var(--liv-ink) / <alpha-value>)",
          muted: "oklch(var(--liv-muted) / <alpha-value>)",
          faint: "oklch(var(--liv-faint) / <alpha-value>)",
          sage: "oklch(var(--liv-sage) / <alpha-value>)",
          "sage-deep": "oklch(var(--liv-sage-deep) / <alpha-value>)",
          sand: "oklch(var(--liv-sand) / <alpha-value>)",
          gold: "oklch(var(--liv-gold) / <alpha-value>)",
          danger: "oklch(var(--liv-danger) / <alpha-value>)",
          info: "oklch(var(--liv-info) / <alpha-value>)",
          teal: "oklch(var(--liv-teal) / <alpha-value>)",
          violet: "oklch(var(--liv-violet) / <alpha-value>)",
          orange: "oklch(var(--liv-orange) / <alpha-value>)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
