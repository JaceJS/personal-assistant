import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RupiahInput from "@/components/ui/RupiahInput";
import DatePicker from "@/components/ui/DatePicker";
import { SearchableDropdown } from "@/components/ui/SearchableDropdown";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { useDeleteTransaction, useTransaction, useUpdateTransaction } from "@/features/finance/hooks/useTransactions";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { useToastStore } from "@/stores/toast";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { colors, radius, spacing, textStyles } from "@/theme";

// Literal key paths (see src/i18n/types.ts) so t() stays type-checked.
function sourceLabel(t: TFunction, source: string): string {
  switch (source) {
    case "voice":
      return t("ai.chatBubble.typeVoice");
    case "receipt":
      return t("ai.chatBubble.typeReceipt");
    case "manual":
      return t("transaction.source.manual");
    case "import":
      return t("transaction.source.import");
    default:
      return source;
  }
}

export default function TransactionDetailScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transaction, isLoading } = useTransaction(id);
  const updateTransaction = useUpdateTransaction(id);
  const deleteTransaction = useDeleteTransaction();
  const { showToast } = useToastStore();

  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategories();

  const [note, setNote] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState<Date>(new Date());
  const [isEditing, setIsEditing] = useState(false);

  const accountName = useMemo(
    () => accountsData?.find(a => a.id === transaction?.account_id)?.name ?? '-',
    [accountsData, transaction]
  );
  const categoryName = useMemo(
    () => categoriesData?.find(c => c.id === transaction?.category_id)?.name,
    [categoriesData, transaction]
  );

  const handleBack = useBackNavigation();

  const handleStartEdit = useCallback(() => {
    if (!transaction) return;
    setTxType(transaction.amount < 0 ? "expense" : "income");
    setAmount(Math.abs(transaction.amount));
    setCategoryId(transaction.category_id);
    setAccountId(transaction.account_id);
    setOccurredAt(new Date(transaction.occurred_at));
    setNote(transaction.note ?? "");
    setMerchant(transaction.merchant ?? "");
    setIsEditing(true);
  }, [transaction]);

  const handleToggleTxType = useCallback((type: "expense" | "income") => {
    setTxType(type);
    setCategoryId(null);
  }, []);

  const availableCategories = useMemo(
    () => categoriesData?.filter((c) => c.type === txType && !c.is_archived) ?? [],
    [categoriesData, txType]
  );

  const handleSave = useCallback(async () => {
    try {
      const finalAmount = txType === "expense" ? -amount : amount;
      await updateTransaction.mutateAsync({
        amount: finalAmount,
        category_id: categoryId,
        account_id: accountId,
        merchant: merchant || null,
        note: note || null,
        occurred_at: occurredAt.toISOString(),
      });
      setIsEditing(false);
      showToast(t("transaction.saveChangesSuccess"), "success");
    } catch {
      showToast(t("transaction.saveChangesError"), "error");
    }
  }, [updateTransaction, txType, amount, categoryId, accountId, merchant, note, occurredAt, showToast, t]);

  const handleDelete = useCallback(() => {
    Alert.alert(t("transaction.deleteAlertTitle"), t("transaction.deleteAlertMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction.mutateAsync(id);
            showToast(t("transaction.deletedToast"), "info");
            handleBack();
          } catch {
            showToast(t("transaction.deleteError"), "error");
          }
        },
      },
    ]);
  }, [deleteTransaction, id, handleBack, showToast, t]);

  if (isLoading) {
    return (
      <Screen>
        <Header title={t("transaction.detailTitle")} onBack={handleBack} />
        <View style={styles.skeletonWrap}>
          <SkeletonCard height={180} />
          <SkeletonCard height={120} />
        </View>
      </Screen>
    );
  }

  if (!transaction) {
    return (
      <Screen>
        <Header title={t("transaction.detailTitle")} onBack={handleBack} />
        <View style={styles.centered}>
          <Text style={styles.notFound}>{t("transaction.notFound")}</Text>
        </View>
      </Screen>
    );
  }

  const isExpense = transaction.amount < 0;
  const amountColor = isExpense ? colors.danger.text : colors.success.text;
  const timeStr = formatTime(transaction.occurred_at);

  return (
    <Screen>
      <Header title={t("transaction.detailTitle")} onBack={handleBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isEditing ? insets.bottom + 160 : 32 },
        ]}
      >
        <View style={styles.amountHero}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isExpense ? "" : "+"}
            {formatMoney(Math.abs(transaction.amount))}
          </Text>
          <Text style={styles.type}>{isExpense ? t("transaction.expense") : t("transaction.income")}</Text>
        </View>

        <View style={styles.card}>
          {isEditing ? (
            <View style={styles.formGap}>
              {/* Transaction Type Segmented Toggle */}
              <View style={styles.toggleContainer}>
                <Pressable
                  onPress={() => handleToggleTxType("expense")}
                  style={styles.togglePressable}
                >
                  <View style={txType === "expense" ? [styles.toggleBtn, styles.toggleBtnActive] : styles.toggleBtn}>
                    <Text style={txType === "expense" ? [styles.toggleText, styles.toggleTextActive] : styles.toggleText}>
                      {t("transaction.expense")}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => handleToggleTxType("income")}
                  style={styles.togglePressable}
                >
                  <View style={txType === "income" ? [styles.toggleBtn, styles.toggleBtnActive] : styles.toggleBtn}>
                    <Text style={txType === "income" ? [styles.toggleText, styles.toggleTextActive] : styles.toggleText}>
                      {t("transaction.income")}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Amount input using RupiahInput */}
              {/* Date Picker */}
              <DatePicker
                label={t("transaction.dateLabel")}
                value={occurredAt}
                onChange={setOccurredAt}
              />

              <RupiahInput
                label={t("transaction.amountLabel")}
                placeholder="0"
                value={amount}
                onChange={setAmount}
              />

              {/* Category selection using SearchableDropdown */}
              <SearchableDropdown
                label={t("transaction.categoryLabel")}
                placeholder={t("transaction.categoryPlaceholder")}
                items={availableCategories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  icon: c.icon ?? undefined,
                }))}
                selectedId={categoryId}
                onSelect={setCategoryId}
              />

              {/* Account Selector */}
              {accountsData && accountsData.length > 1 && (
                <View style={styles.accountSection}>
                  <Text style={styles.accountLabel}>{t("transaction.accountLabelMulti")}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.accountRow}
                  >
                    {accountsData.map((acc) => {
                      const active = accountId === acc.id;
                      return (
                        <Pressable
                          key={acc.id}
                          onPress={() => setAccountId(acc.id)}
                          style={({ pressed }) => pressed && { opacity: 0.8 }}
                        >
                          <View style={active ? [styles.accountPill, styles.accountPillActive] : styles.accountPill}>
                            <Text
                              style={active ? [styles.accountPillText, styles.accountPillTextActive] : styles.accountPillText}
                            >
                              {acc.name}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <Input
                label={t("ai.confirmCard.merchantLabel")}
                value={merchant}
                onChangeText={setMerchant}
                placeholder={t("transaction.merchantEditPlaceholder")}
              />
              <Input
                label={t("ai.confirmCard.noteLabel")}
                value={note}
                onChangeText={setNote}
                placeholder={t("transaction.notePlaceholder")}
                multiline
              />
            </View>
          ) : (
            <>
              <DetailRow label={t("transaction.dateFieldLabel")} value={formatDate(transaction.occurred_at)} />
              <DetailRow label={t("transaction.timeFieldLabel")} value={timeStr} />
              <DetailRow label={t("transaction.accountLabelSingle")} value={accountName} />
              <DetailRow label={t("ai.confirmCard.categoryLabel")} value={categoryName ?? '-'} />
              {transaction.merchant ? (
                <DetailRow label={t("ai.confirmCard.merchantLabel")} value={transaction.merchant} />
              ) : null}
              {transaction.note ? (
                <DetailRow label={t("ai.confirmCard.noteLabel")} value={transaction.note} />
              ) : null}
              <DetailRow
                label={t("transaction.statusFieldLabel")}
                value={transaction.status === 'confirmed' ? t("transaction.statusConfirmed") : t("transaction.statusDraft")}
              />
              <DetailRow
                label={t("transaction.sourceFieldLabel")}
                value={sourceLabel(t, transaction.source)}
              />
            </>
          )}
        </View>
        {isEditing && (
          <View style={styles.editActionsRow}>
            <View style={styles.buttonWrapper}>
              <Button
                label={t("common.cancel")}
                onPress={() => setIsEditing(false)}
                variant="ghost"
                fullWidth
              />
            </View>
            <View style={styles.buttonWrapper}>
              <Button
                label={t("common.save")}
                onPress={handleSave}
                loading={updateTransaction.isPending}
                fullWidth
              />
            </View>
          </View>
        )}
      </ScrollView>

      {!isEditing && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 140 }]}>
          <View style={styles.buttonWrapper}>
            <Button label={t("transaction.editCta")} variant="warning" onPress={handleStartEdit} fullWidth />
          </View>
          <View style={styles.buttonWrapper}>
            <Button label={t("common.delete")} variant="danger" onPress={handleDelete} fullWidth />
          </View>
        </View>
      )}
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { ...StyleSheet.flatten(textStyles.body), color: colors.text.muted },
  skeletonWrap: { padding: spacing['2xl'], gap: spacing.lg },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing['2xl'], paddingBottom: 32, gap: spacing.lg },

  amountHero: { alignItems: 'center', paddingVertical: spacing['3xl'] },
  amount: { ...StyleSheet.flatten(textStyles.display), fontSize: 36, fontWeight: '700', letterSpacing: -0.5 },
  type: { ...StyleSheet.flatten(textStyles.caption), fontSize: 13, marginTop: spacing.sm, color: colors.text.secondary },

  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },

  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg },
  rowLabel: { ...StyleSheet.flatten(textStyles.caption), fontSize: 13 },
  rowValue: { ...StyleSheet.flatten(textStyles.caption), fontSize: 13, color: colors.text.primary, flex: 1, textAlign: 'right' },

  actions: { gap: spacing.md },
  editActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },

  bottomBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.bg.canvas,
  },
  buttonWrapper: {
    flex: 1,
  },
  formGap: {
    gap: spacing.lg,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.bg.canvas,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.xs,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  togglePressable: {
    flex: 1,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  toggleBtn: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.accent.primary,
  },
  toggleText: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.muted,
  },
  toggleTextActive: {
    color: colors.bg.canvas,
    fontWeight: "600",
  },
  accountSection: { gap: spacing.sm },
  accountLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    color: colors.text.muted,
  },
  accountRow: { gap: spacing.sm, paddingVertical: 2 },
  accountPill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  accountPillActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  accountPillText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: "500",
    color: colors.text.primary,
  },
  accountPillTextActive: {
    color: colors.bg.canvas,
  },
});
