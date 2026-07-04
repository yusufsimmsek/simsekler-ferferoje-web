export const designTokens = {
  color: {
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
    semantic: {
      success: "#16A34A",
      warning: "#D97706",
      error: "#DC2626",
      info: "#2563EB"
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
    }
  },
  radius: {
    small: "4px",
    medium: "6px",
    large: "8px"
  },
  spacing: {
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px"
  },
  shadow: {
    panel: "0 1px 2px rgba(16, 17, 20, 0.06)",
    modal: "0 20px 50px rgba(16, 17, 20, 0.18)",
    toolbar: "0 8px 24px rgba(16, 17, 20, 0.12)"
  }
} as const;

export type DesignTokens = typeof designTokens;
