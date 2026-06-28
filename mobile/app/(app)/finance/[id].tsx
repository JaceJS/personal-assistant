import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { useToastStore } from "@/stores/toast";
import { formatDate, formatRupiah } from "@/lib/utils";
import { colors, radius, spacing, textStyles } from "@/theme";

const SOURCE_LABELS: Record<string, string> = {
  voice: 'Suara',
  receipt: 'Struk',
  manual: 'Manual',
  import: 'Import',
};

export default function TransactionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
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

  const handleBack = useCallback(() => {
    if (from === 'activity') router.replace('/(app)/history');
    else if (from === 'finance') router.replace('/(app)/finance');
    else if (from === 'finance-history') router.replace('/(app)/finance/history');
    else if (router.canGoBack()) router.back();
    else router.replace('/(app)/(home)');
  }, [from, router]);

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
      showToast("Perubahan tersimpan", "success");
    } catch {
      showToast("Gagal menyimpan perubahan.", "error");
    }
  }, [updateTransaction, txType, amount, categoryId, accountId, merchant, note, occurredAt, showToast]);

  const handleDelete = useCallback(() => {
    Alert.alert("Hapus Transaksi", "Yakin mau hapus transaksi ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction.mutateAsync(id);
            showToast("Transaksi dihapus", "info");
            handleBack();
          } catch {
            showToast("Gagal menghapus transaksi.", "error");
          }
        },
      },
    ]);
  }, [deleteTransaction, id, handleBack, showToast]);

  if (isLoading) {
    return (
      <Screen>
        <Header title="Detail Transaksi" onBack={handleBack} />
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
        <Header title="Detail Transaksi" onBack={handleBack} />
        <View style={styles.centered}>
          <Text style={styles.notFound}>Transaksi tidak ditemukan</Text>
        </View>
      </Screen>
    );
  }

  const isExpense = transaction.amount < 0;
  const amountColor = isExpense ? colors.danger.text : colors.success.text;
  const timeStr = new Date(transaction.occurred_at)
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <Screen>
      <Header title="Detail Transaksi" onBack={handleBack} />

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
            {formatRupiah(Math.abs(transaction.amount))}
          </Text>
          <Text style={styles.type}>{isExpense ? "Pengeluaran" : "Pemasukan"}</Text>
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
                      Pengeluaran
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => handleToggleTxType("income")}
                  style={styles.togglePressable}
                >
                  <View style={txType === "income" ? [styles.toggleBtn, styles.toggleBtnActive] : styles.toggleBtn}>
                    <Text style={txType === "income" ? [styles.toggleText, styles.toggleTextActive] : styles.toggleText}>
                      Pemasukan
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Amount input using RupiahInput */}
              {/* Date Picker */}
              <DatePicker
                label="Tanggal Transaksi"
                value={occurredAt}
                onChange={setOccurredAt}
              />

              <RupiahInput
                label="Jumlah"
                placeholder="0"
                value={amount}
                onChange={setAmount}
              />

              {/* Category selection using SearchableDropdown */}
              <SearchableDropdown
                label="Kategori (opsional)"
                placeholder="Pilih Kategori"
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
                  <Text style={styles.accountLabel}>Pilih Dompet / Akun</Text>
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
                label="Merchant"
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Nama toko"
              />
              <Input
                label="Catatan"
                value={note}
                onChangeText={setNote}
                placeholder="Tambahkan catatan"
                multiline
              />
            </View>
          ) : (
            <>
              <DetailRow label="Tanggal" value={formatDate(transaction.occurred_at)} />
              <DetailRow label="Waktu" value={timeStr} />
              <DetailRow label="Akun" value={accountName} />
              <DetailRow label="Kategori" value={categoryName ?? '-'} />
              {transaction.merchant ? (
                <DetailRow label="Merchant" value={transaction.merchant} />
              ) : null}
              {transaction.note ? (
                <DetailRow label="Catatan" value={transaction.note} />
              ) : null}
              <DetailRow
                label="Status"
                value={transaction.status === 'confirmed' ? 'Terkonfirmasi' : 'Draft'}
              />
              <DetailRow
                label="Sumber"
                value={SOURCE_LABELS[transaction.source] ?? transaction.source}
              />
            </>
          )}
        </View>

        {isEditing && (
          <View style={styles.actions}>
            <Button
              label="Simpan"
              onPress={handleSave}
              loading={updateTransaction.isPending}
              fullWidth
            />
            <Button
              label="Batal"
              onPress={() => setIsEditing(false)}
              variant="ghost"
              fullWidth
            />
          </View>
        )}
      </ScrollView>

      {!isEditing && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 140 }]}>
          <View style={styles.buttonWrapper}>
            <Button label="Edit" variant="warning" onPress={handleStartEdit} fullWidth />
          </View>
          <View style={styles.buttonWrapper}>
            <Button label="Hapus" variant="danger" onPress={handleDelete} fullWidth />
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
