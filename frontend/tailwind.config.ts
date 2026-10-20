import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        border: "#E5E7EB",
        background: "#F7F9FB",
        foreground: "#191C1E",
        "brand-primary": "#0F172A",
        "on-surface": "#191C1E",
        "on-surface-variant": "#45464D",
        "surface-container-low": "#F2F4F6",
        "surface-container": "#ECEEF0",
        "surface-container-lowest": "#FFFFFF",
        "surface-variant": "#E0E3E5",
        "outline-variant": "#C6C6CD",
        "primary-container": "#131B2E",
        "secondary-fixed-dim": "#D2BBFF",
        "error-container": "#FFDAD6",
        primary: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          active: "#020617",
          foreground: "#FFFFFF"
        },
        secondary: {
          DEFAULT: "#712AE2",
          foreground: "#FFFFFF"
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B"
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#0F172A"
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6"
      },
      borderRadius: {
        lg: "12px",
        xl: "16px",
        md: "10px"
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08)",
        hover: "0 4px 12px rgba(0,0,0,0.12)",
        fab: "0 8px 24px rgba(37,99,235,0.35)"
      },
      transitionDuration: {
        DEFAULT: "200ms"
      },
      transitionTimingFunction: {
        DEFAULT: "ease"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" }
        },
        "pulse-ring": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        }
      },
      animation: {
        "fade-in": "fade-in 200ms ease",
        "slide-in-right": "slide-in-right 300ms ease",
        "pulse-ring": "pulse-ring 1.5s ease-in-out infinite"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
