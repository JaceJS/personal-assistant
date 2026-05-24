import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { ExtractedTransaction } from '@/features/finance/api/voice';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing } from '@/theme';

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
          <Pressable
            onPress={() => onSave(data)}
            disabled={isSaving}
            style={({ pressed }) => [styles.btnSave, pressed && { opacity: 0.8 }]}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.bg.canvas} />
            ) : (
              <Text style={styles.btnSaveLabel}>Save Transaction</Text>
            )}
          </Pressable>

          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.btnCancel, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.btnCancelLabel}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing['2xl'] },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text.muted,
    marginBottom: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: -0.5,
    marginBottom: spacing['2xl'],
  },
  amountExpense: { color: colors.danger.text },
  amountIncome: { color: colors.success.text },
  field: { marginBottom: spacing.lg },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  noteInput: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
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
    fontSize: 12,
    color: colors.text.muted,
  },
  actions: { gap: 10, paddingBottom: spacing.lg },
  btnSave: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 44,
  },
  btnSaveLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.bg.canvas,
  },
  btnCancel: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 44,
  },
  btnCancelLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.muted,
  },
});
