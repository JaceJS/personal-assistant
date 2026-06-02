import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import type { ExtractedTransaction } from "@/features/finance/api/voice";
import { useCategories } from "@/features/finance/hooks/useCategories";
import type { Account, Category } from "@/features/finance/types";
import { colors, radius, spacing, textStyles } from "@/theme";

export interface ConfirmPayload {
  amount: number;
  accountId: string | null;
  categoryId: string | null;
  merchant: string | null;
  note: string | null;
}

interface Props {
  data: ExtractedTransaction | null;
  accounts: Account[];
  defaultAccountId: string | null;
  isVisible: boolean;
  isSaving: boolean;
  onSave: (payload: ConfirmPayload) => void;
  onDismiss: () => void;
}

function findMatchingCategory(categories: Category[], name: string | null): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  return categories.find((c) => c.name.toLowerCase() === lower)?.id ?? null;
}

export const ConfirmCard = React.memo(function ConfirmCard({
  data,
  accounts,
  defaultAccountId,
  isVisible,
  isSaving,
  onSave,
  onDismiss,
}: Props) {
  const { data: categories = [] } = useCategories();

  const [amountText, setAmountText] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setAmountText(String(data.amount));
    setMerchant(data.merchant ?? "");
    setNote(data.note ?? "");
    setCategoryId(findMatchingCategory(categories, data.category_name));
    setAccountId(defaultAccountId);
  }, [data, categories, defaultAccountId]);

  if (!data) return null;

  const isExpense = data.amount < 0;

  const handleSave = () => {
    const parsed = parseInt(amountText, 10);
    onSave({
      amount: isNaN(parsed) ? data.amount : parsed,
      accountId,
      categoryId,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
    });
  };

  return (
    <BottomSheet isVisible={isVisible} onDismiss={onDismiss}>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Amount (Rp)</Text>
        <TextInput
          style={[styles.amountInput, isExpense ? styles.amountExpense : styles.amountIncome]}
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="numeric"
          selectTextOnFocus
        />

        {accounts.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.sectionLabel}>Account</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {accounts.map((acc) => (
                <Pressable
                  key={acc.id}
                  onPress={() => setAccountId(acc.id)}
                  style={[styles.chip, acc.id === accountId && styles.chipSelected]}
                >
                  <Text
                    style={[styles.chipLabel, acc.id === accountId && styles.chipLabelSelected]}
                  >
                    {acc.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.sectionLabel}>Merchant</Text>
          <TextInput
            style={styles.textInput}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="e.g. Indomaret"
            placeholderTextColor={colors.text.muted}
          />
        </View>

        {categories.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.sectionLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
              {categories.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                  style={[styles.chip, cat.id === categoryId && styles.chipSelected]}
                >
                  <Text
                    style={[styles.chipLabel, cat.id === categoryId && styles.chipLabelSelected]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.sectionLabel}>Note</Text>
          <TextInput
            style={[styles.textInput, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Optional note"
            placeholderTextColor={colors.text.muted}
          />
        </View>

        <View style={styles.actions}>
          <Button label="Save Transaction" onPress={handleSave} loading={isSaving} fullWidth />
          <Button label="Cancel" onPress={onDismiss} variant="secondary" fullWidth />
        </View>
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing["2xl"] },
  sectionLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.primary,
    marginBottom: 4,
  },
  amountInput: {
    ...StyleSheet.flatten(textStyles.display),
    marginBottom: spacing["2xl"],
    paddingVertical: 4,
  },
  amountExpense: { color: colors.danger.text },
  amountIncome: { color: colors.success.text },
  field: { marginBottom: spacing.lg },
  textInput: {
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
  noteInput: { minHeight: 72 },
  chips: { flexDirection: "row" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: colors.accent.subtle,
    borderColor: colors.accent.primary,
  },
  chipLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.primary,
  },
  chipLabelSelected: { color: colors.accent.primary },
  actions: { gap: 10, paddingBottom: spacing.lg },
});
