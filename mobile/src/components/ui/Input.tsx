import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors, radius } from '@/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error ? styles.inputError : styles.inputDefault, style]}
        placeholderTextColor={colors.text.muted}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text.muted,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 44,
  },
  inputDefault: { borderColor: colors.border.default },
  inputError: { borderColor: colors.danger.text },
  error: {
    fontSize: 12,
    color: colors.danger.text,
  },
});

export default React.memo(Input);
