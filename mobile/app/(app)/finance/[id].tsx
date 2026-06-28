import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import { HeaderButton } from "@/components/ui/HeaderButton";
import Input from "@/components/ui/Input";
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
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { data: transaction, isLoading } = useTransaction(id);
  const updateTransaction = useUpdateTransaction(id);
  const deleteTransaction = useDeleteTransaction();
  const { showToast } = useToastStore();

  const { data: accountsData } = useAccounts();
  const { data: categoriesData } = useCategories();

  const [note, setNote] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
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
    setNote(transaction.note ?? "");
    setMerchant(transaction.merchant ?? "");
    setIsEditing(true);
  }, [transaction]);

  const handleSave = useCallback(async () => {
    try {
      await updateTransaction.mutateAsync({ merchant: merchant || null, note: note || null });
      setIsEditing(false);
      showToast("Perubahan tersimpan", "success");
    } catch {
      showToast("Gagal menyimpan perubahan.", "error");
    }
  }, [updateTransaction, merchant, note, showToast]);

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

  const backButton = <HeaderButton icon={ChevronLeft} onPress={handleBack} />;

  if (isLoading) {
    return (
      <Screen>
        <Header title="Detail Transaksi" left={backButton} />
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
        <Header title="Detail Transaksi" left={backButton} />
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
      <Header title="Detail Transaksi" left={backButton} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.amountHero}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isExpense ? "" : "+"}
            {formatRupiah(Math.abs(transaction.amount))}
          </Text>
          <Text style={styles.type}>{isExpense ? "Pengeluaran" : "Pemasukan"}</Text>
        </View>

        <View style={styles.card}>
          {isEditing ? (
            <>
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
            </>
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
        <View style={styles.bottomBar}>
          <Button label="Edit" variant="warning" onPress={handleStartEdit} fullWidth />
          <Button label="Hapus" variant="danger" onPress={handleDelete} fullWidth />
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
});
