import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            "code::before": { content: "" },
            "code::after": { content: "" },
          },
        },
      },
      fontFamily: {
        text: ["var(--font-text)"],
        heading: ["var(--font-heading)"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.65rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
        "6xl": ["3.75rem", { lineHeight: "1" }],
        "7xl": ["4.5rem", { lineHeight: "1" }],
        "8xl": ["6rem", { lineHeight: "1" }],
        "9xl": ["8rem", { lineHeight: "1" }],
      },
      colors: {
        background: "hsl(var(--background))",
        background_alt: "hsl(var(--background_alt))",
        foreground: "hsl(var(--foreground))",
        foreground_alt: "hsl(var(--foreground_alt))",
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
        accent: "hsl(var(--accent))",
        background_accent: "hsl(var(--background_accent))",
        highlight: "hsl(var(--highlight))",
        error: "hsl(var(--error))",
        background_error: "hsl(var(--background_error))",
        warning: "hsl(var(--warning))",
        alt_color_a: "hsl(var(--alt_color_a))",
        alt_color_b: "hsl(var(--alt_color_b))",

        // Currently unused

        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
          "6": "hsl(var(--chart-6))",
          "7": "hsl(var(--chart-7))",
          "8": "hsl(var(--chart-8))",
          "9": "hsl(var(--chart-9))",
          "10": "hsl(var(--chart-10))",
          "11": "hsl(var(--chart-11))",
          "12": "hsl(var(--chart-12))",
          "13": "hsl(var(--chart-13))",
          "14": "hsl(var(--chart-14))",
          "15": "hsl(var(--chart-15))",
          "16": "hsl(var(--chart-16))",
          "17": "hsl(var(--chart-17))",
          "18": "hsl(var(--chart-18))",
          "19": "hsl(var(--chart-19))",
          "20": "hsl(var(--chart-20))",
          "21": "hsl(var(--chart-21))",
          "22": "hsl(var(--chart-22))",
          "23": "hsl(var(--chart-23))",
          "24": "hsl(var(--chart-24))",
          "25": "hsl(var(--chart-25))",
          "26": "hsl(var(--chart-26))",
          "27": "hsl(var(--chart-27))",
          "28": "hsl(var(--chart-28))",
          "29": "hsl(var(--chart-29))",
          "30": "hsl(var(--chart-30))",
          "31": "hsl(var(--chart-31))",
          "32": "hsl(var(--chart-32))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--background_alt))",
          foreground: "hsl(var(--foreground))",
          primary: "hsl(var(--primary))",
          "primary-foreground": "hsl(var(--primary-foreground))",
          accent: "hsl(var(--accent))",
          "accent-foreground": "hsl(var(--accent-foreground))",
          border: "hsl(var(--background))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [typography, animate],
};

export default config;
