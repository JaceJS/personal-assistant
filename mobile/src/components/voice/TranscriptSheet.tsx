import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import { colors, radius, spacing, textStyles } from '@/theme';

interface Props {
  transcript: string | null;
  isVisible: boolean;
  onProcess: (transcript: string) => void;
  onDismiss: () => void;
}

export function TranscriptSheet({ transcript, isVisible, onProcess, onDismiss }: Props) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (transcript) setText(transcript);
  }, [transcript]);

  const handleProcess = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onProcess(trimmed);
  };

  return (
    <BottomSheet isVisible={isVisible} onDismiss={onDismiss}>
      <View style={styles.container}>
        <Text style={styles.label}>What did you say?</Text>
        <Text style={styles.hint}>Edit if anything was misheard, then tap Process.</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          placeholder="Transcription appears here…"
          placeholderTextColor={colors.text.muted}
        />
        <View style={styles.actions}>
          <Button label="Process Transaction" onPress={handleProcess} fullWidth />
          <Button label="Cancel" onPress={onDismiss} variant="secondary" fullWidth />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing['2xl'], paddingBottom: spacing.lg },
  label: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  hint: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
    minHeight: 120,
    marginBottom: spacing.lg,
  },
  actions: { gap: 10 },
});
