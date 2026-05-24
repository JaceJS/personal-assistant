import { Platform, StyleSheet } from 'react-native';
import { colors } from './colors';

export const textStyles = StyleSheet.create({
  display: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.8,
    color: colors.text.primary,
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.4,
    color: colors.text.primary,
  },
  h2: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: -0.2,
    color: colors.text.primary,
  },
  h3: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0,
    color: colors.text.primary,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 24,
    color: colors.text.primary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 16.8,
    color: colors.text.muted,
  },
  overline: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,
    color: colors.text.muted,
  },
  mono: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.text.primary,
  },
});
