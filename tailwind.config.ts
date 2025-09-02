import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Typografi skala (ensartet overskriftssystem)
      fontSize: {
        display: ["2.25rem", { lineHeight: "2.75rem", fontWeight: "700" }], // ~36px
        h1: ["1.875rem", { lineHeight: "2.25rem", fontWeight: "700" }], // ~30px
        h2: ["1.5rem", { lineHeight: "2rem", fontWeight: "600" }], // ~24px
        h3: ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }], // ~20px
      },
      // Radius og skygger: moderne, bløde kanter
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "0.875rem",
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 2px 10px rgba(0,0,0,0.06)",
        hover: "0 6px 16px rgba(0,0,0,0.10)",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
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
          light: "hsl(var(--accent-light))",
          dark: "hsl(var(--accent-dark))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // CRM-specific colors
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          bg: "hsl(var(--sidebar-bg))",
          foreground: "hsl(var(--sidebar-foreground))",
          active: "hsl(var(--sidebar-active))",
          hover: "hsl(var(--sidebar-hover))",
        },
        // Status (semantic) - bruges i badges, tags, grafer
        status: {
          draft: "hsl(var(--status-draft))",
          active: "hsl(var(--status-active))",
          closed: "hsl(var(--status-closed))",
          overdue: "hsl(var(--status-overdue))",
        },
        // Brand colors
        brand: {
          primary: "hsl(var(--brand-primary))",
          muted: "hsl(var(--brand-muted))",
          accent: "hsl(var(--brand-accent))",
        },
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))",
      },
      // Animation tempo og easing (ensartet følelse)
      transitionTimingFunction: {
        "ease-out-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    // Stage theme colors for dynamic classes
    "bg-success/10", "text-success", "ring-success/30",
    "bg-warning/10", "text-warning", "ring-warning/30",
    "bg-danger/10", "text-danger", "ring-danger/30",
    "bg-accent/10", "text-accent", "ring-accent/30",
    "bg-secondary/10", "text-secondary-foreground", "ring-secondary/30",
    "bg-muted/10", "text-muted", "ring-muted/30",
    "bg-primary/10", "text-primary", "ring-primary/30",
    // KPI card gradients
    "from-primary/5", "from-accent/5", "from-success/5", "from-warning/5", "from-danger/5",
    // Industry theme colors for dynamic classes
    "bg-accent/10", "text-accent", "ring-accent/30",
    "bg-warning/10", "text-warning", "ring-warning/30",
    "bg-success/10", "text-success", "ring-success/30",
    "bg-destructive/10", "text-destructive", "ring-destructive/30",
    "bg-secondary/10", "text-secondary-foreground", "ring-secondary/30",
    "bg-muted/10", "text-muted-foreground", "ring-muted/30",
    "bg-primary/10", "text-primary", "ring-primary/30",
    // Role theme colors for dynamic classes
    "bg-info/10", "text-info", "ring-info/30"
  ],
} satisfies Config;
