import { colors, spacing, radius } from '@/theme';

export const THEME = {
  colors: {
    background: colors.bg.canvas,
    surface: colors.bg.surface,
    card: colors.bg.elevated,
    border: colors.border.default,
    accent: colors.accent.primary,
    accentSecondary: colors.accent.border,
    success: colors.success.text,
    danger: colors.danger.text,
    ink: colors.text.primary,
    muted: colors.text.muted,
    warning: colors.warning.text,
    overlay: 'rgba(0,0,0,0.6)',
  },
  radius: {
    sm: radius.sm,
    md: radius.md,
    lg: radius.lg,
    xl: radius.xl,
    full: radius.full,
  },
  spacing: {
    xs: spacing.xs,
    sm: spacing.sm,
    md: spacing.lg,
    lg: spacing['2xl'],
    xl: spacing['3xl'],
    xxl: spacing['4xl'],
  },
  fontFamily: {
    regular: undefined,
    medium: undefined,
    semibold: undefined,
    bold: undefined,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 22,
    '2xl': 28,
    '3xl': 36,
  },
} as const;

export type ThemeColor = keyof typeof THEME.colors;
