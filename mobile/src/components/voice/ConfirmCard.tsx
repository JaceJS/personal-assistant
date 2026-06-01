import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import type { ExtractedTransaction } from '@/features/finance/api/voice';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing, textStyles } from '@/theme';

interface Props {
  data: ExtractedTransaction | null;
  isVisible: boolean;
  isSaving: boolean;
  onSave: (data: ExtractedTransaction) => void;
  onDismiss: () => void;
}

export const ConfirmCard = React.memo(function ConfirmCard({
  data,
  isVisible,
  isSaving,
  onSave,
  onDismiss,
}: Props) {
  if (!data) return null;

  const isExpense = data.amount < 0;
  const confidenceHigh = data.confidence >= 0.8;

  return (
    <BottomSheet isVisible={isVisible} onDismiss={onDismiss}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Amount</Text>
        <Text style={[styles.amount, isExpense ? styles.amountExpense : styles.amountIncome]}>
          {isExpense ? '−' : '+'} {formatRupiah(Math.abs(data.amount))}
        </Text>

        {data.merchant !== null && (
          <View style={styles.field}>
            <Text style={styles.sectionLabel}>Merchant</Text>
            <Text style={styles.fieldValue}>{data.merchant}</Text>
          </View>
        )}

        {data.category_name !== null && (
          <View style={styles.field}>
            <Text style={styles.sectionLabel}>Category</Text>
            <Text style={styles.fieldValue}>{data.category_name}</Text>
          </View>
        )}

        {data.note !== null && (
          <View style={styles.field}>
            <Text style={styles.sectionLabel}>Note</Text>
            <TextInput
              style={styles.noteInput}
              defaultValue={data.note}
              multiline
              placeholderTextColor={colors.text.muted}
            />
          </View>
        )}

        <View style={styles.confidenceRow}>
          <View
            style={[
              styles.confidenceDot,
              { backgroundColor: confidenceHigh ? colors.success.text : colors.warning.text },
            ]}
          />
          <Text style={styles.confidenceLabel}>
            AI confidence: {Math.round(data.confidence * 100)}%
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            label="Save Transaction"
            onPress={() => onSave(data)}
            loading={isSaving}
            fullWidth
          />
          <Button label="Cancel" onPress={onDismiss} variant="secondary" fullWidth />
        </View>
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing['2xl'] },
  sectionLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginBottom: 4,
  },
  amount: {
    ...StyleSheet.flatten(textStyles.display),
    marginBottom: spacing['2xl'],
  },
  amountExpense: { color: colors.danger.text },
  amountIncome: { color: colors.success.text },
  field: { marginBottom: spacing.lg },
  fieldValue: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  noteInput: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
    minHeight: 44,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.lg,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  confidenceLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  actions: { gap: 10, paddingBottom: spacing.lg },
});
