/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      colors: {
        snow: {
          canvas: "#1c1c1c",
          shell: "#191919",
          panel: "#242424",
          panel2: "#2a2a2a",
          hover: "#333333",
          line: "rgba(255,255,255,0.10)",
          line2: "rgba(255,255,255,0.18)",
          text: "#ffffff",
          muted: "rgba(255,255,255,0.42)",
          soft: "rgba(255,255,255,0.08)",
          blue: "#e3f5ff",
          ice: "#e5ecf6",
          violet: "#c6c7f8",
          green: "#baedbd",
          cyan: "#95d8f4",
        },
      },
      borderRadius: {
        snow: "28px",
        card: "16px",
      },
      boxShadow: {
        snow: "0 24px 80px rgba(0,0,0,0.32)",
      },
    },
  },
  plugins: [],
};
