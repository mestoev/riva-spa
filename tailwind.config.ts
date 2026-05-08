import type { Config } from "tailwindcss";

// RIVA design tokens — mirror styles.css :root
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          0: "var(--bg-0)",
          1: "var(--bg-1)",
          2: "var(--bg-2)",
        },
        wood: {
          1: "var(--wood-1)",
          2: "var(--wood-2)",
          3: "var(--wood-3)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          mute: "var(--ink-mute)",
        },
        pool: {
          1: "var(--pool-1)",
          2: "var(--pool-2)",
          3: "var(--pool-3)",
          deep: "var(--pool-deep)",
        },
        gold: {
          1: "var(--gold-1)",
          2: "var(--gold-2)",
          3: "var(--gold-3)",
        },
        line: "var(--line)",
        "line-soft": "var(--line-soft)",
      },
      fontFamily: {
        serif: "var(--serif)",
        display: "var(--display)",
        sans: "var(--sans)",
        mono: "var(--mono)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      animation: {
        rise: "rise 0.9s cubic-bezier(.2,.7,.2,1) both",
        shimmer: "shimmer 12s ease-in-out infinite",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
