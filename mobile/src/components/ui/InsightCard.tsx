import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

export type InsightVariant = 'accent' | 'success' | 'warning' | 'info' | 'default';

export interface InsightCardProps {
  label: string;
  body: string;
  variant?: InsightVariant;
  badge?: string;
  highlight?: string;
}

const VARIANT_TOKENS: Record<InsightVariant, { glow: string; bg: string; border: string; text: string }> = {
  accent:  { glow: colors.accent.primary, bg: '#13112A', border: `${colors.accent.primary}4D`, text: colors.accent.text },
  success: { glow: colors.success.text,   bg: '#0A1A10', border: `${colors.success.text}4D`,   text: colors.success.text },
  warning: { glow: colors.warning.text,   bg: '#1C1408', border: `${colors.warning.text}4D`,   text: colors.warning.text },
  info:    { glow: colors.info.text,      bg: '#0A1420', border: `${colors.info.text}4D`,       text: colors.info.text },
  default: { glow: colors.border.strong,  bg: colors.bg.surface, border: colors.border.default, text: colors.text.secondary },
};

export default function InsightCard({ label, body, variant = 'default', badge, highlight }: InsightCardProps) {
  const tokens = VARIANT_TOKENS[variant];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: tokens.bg,
          borderColor: tokens.border,
          shadowColor: tokens.glow,
        },
      ]}
    >
      <View style={[styles.glowLarge, { backgroundColor: tokens.glow }]} />
      <View style={[styles.glowSmall, { backgroundColor: tokens.glow }]} />

      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: tokens.glow }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>

        {highlight && (
          <Text style={[styles.highlight, { color: tokens.text }]}>{highlight}</Text>
        )}

        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 224,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  glowLarge: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    top: -30,
    right: -20,
    opacity: 0.18,
  },
  glowSmall: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    bottom: -15,
    left: -10,
    opacity: 0.10,
  },
  inner: {
    padding: 16,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.secondary,
    letterSpacing: 1.1,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  highlight: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  body: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 17,
  },
});
