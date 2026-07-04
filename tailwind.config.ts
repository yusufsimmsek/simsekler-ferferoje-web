import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        neutral: {
          50: "#FAFAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          500: "#6B7280",
          700: "#3A3F4B",
          800: "#252832",
          900: "#181A1F",
          950: "#101114"
        },
        blueprint: {
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8"
        },
        canvas: {
          background: "#F8FAFC",
          room: "#FFFFFF",
          selected: "#EFF6FF",
          wall: "#111827",
          interior: "#374151",
          dimension: "#64748B",
          door: "#0F766E",
          window: "#2563EB",
          warning: "#F59E0B",
          critical: "#EF4444"
        },
        snow: {
          canvas: "#f6f8fc",
          shell: "#101936",
          panel: "#fbfcff",
          panel2: "#f1f5fb",
          hover: "#edf3fb",
          line: "rgba(34,50,84,0.11)",
          line2: "rgba(34,50,84,0.18)",
          text: "#101936",
          muted: "rgba(27,39,72,0.58)",
          soft: "rgba(58,96,152,0.08)",
          blue: "#e7f1ff",
          ice: "#edf4f8",
          violet: "#6558ff",
          green: "#cdeedb",
          cyan: "#b8edf6"
        }
      },
      borderRadius: {
        snow: "24px",
        card: "8px"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 17, 20, 0.06)",
        modal: "0 20px 50px rgba(16, 17, 20, 0.18)",
        toolbar: "0 8px 24px rgba(16, 17, 20, 0.12)",
        snow: "0 28px 80px rgba(22, 34, 65, 0.12)",
        "snow-card": "0 18px 54px rgba(22, 34, 65, 0.10)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "Geist Mono",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "monospace"
        ]
      }
    }
  },
  plugins: []
};

export default config;
