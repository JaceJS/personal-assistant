export const THEME = {
  colors: {
    background: "#0a0f1e",
    surface: "#111827",
    card: "#1e293b",
    border: "#334155",
    accent: "#6366f1",
    accentSecondary: "#8b5cf6",
    success: "#10b981",
    danger: "#f43f5e",
    ink: "#f8fafc",
    muted: "#94a3b8",
    warning: "#f59e0b",
    overlay: "rgba(0,0,0,0.6)",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  fontFamily: {
    regular: "Outfit_400Regular",
    medium: "Outfit_500Medium",
    semibold: "Outfit_600SemiBold",
    bold: "Outfit_700Bold",
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    "2xl": 28,
    "3xl": 36,
  },
} as const;

export type ThemeColor = keyof typeof THEME.colors;
