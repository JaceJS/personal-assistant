import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { useBudget, useUpsertBudget } from '@/features/finance/hooks/useBudget';
import { formatRupiah } from '@/lib/utils';
import { colors, radius, spacing } from '@/theme';

export default function BudgetSettingsScreen() {
  const router = useRouter();
  const { data: budget, isLoading } = useBudget();
  const { mutate: saveBudget, isPending } = useUpsertBudget();

  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (budget?.monthly_limit) {
      setInputValue(String(budget.monthly_limit));
    }
  }, [budget?.monthly_limit]);

  const handleSave = useCallback(() => {
    const amount = Number(inputValue.replace(/\D/g, ''));
    if (!amount) return;
    saveBudget({ monthly_limit: amount }, { onSuccess: () => router.back() });
  }, [inputValue, saveBudget, router]);

  const hasValidInput = Number(inputValue.replace(/\D/g, '')) > 0;

  return (
    <Screen>
      <Header title="Monthly Budget" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {budget?.monthly_limit ? (
          <View style={styles.currentCard}>
            <Text style={styles.currentLabel}>CURRENT BUDGET</Text>
            <Text style={styles.currentAmount}>{formatRupiah(budget.monthly_limit)}</Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No monthly budget set yet.</Text>
            <Text style={styles.emptySubtext}>Set one to track your spending progress.</Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>
            {budget?.monthly_limit ? 'Update Budget' : 'Set Budget'}
          </Text>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            keyboardType="numeric"
            placeholder="e.g. 10000000"
            placeholderTextColor={colors.text.disabled}
            autoFocus={!budget?.monthly_limit}
          />
          <Text style={styles.inputHint}>Amount in Rupiah (IDR)</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            (!hasValidInput || isPending) && styles.saveBtnDisabled,
            pressed && hasValidInput && !isPending && { opacity: 0.85 },
          ]}
          onPress={handleSave}
          disabled={!hasValidInput || isPending}
        >
          <Text style={styles.saveBtnText}>
            {isPending ? 'Saving…' : 'Save Budget'}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },

  currentCard: {
    backgroundColor: colors.accent.subtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.border,
    padding: 20,
    gap: 6,
  },
  currentLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.accent.text,
    letterSpacing: 1.1,
  },
  currentAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },

  emptyCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 20,
    gap: 4,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.text.muted,
  },

  formSection: { gap: 8 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  inputHint: {
    fontSize: 11,
    color: colors.text.muted,
    marginLeft: 4,
  },

  saveBtn: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.bg.canvas,
  },
});
