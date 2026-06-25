import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useDeleteTransaction, useTransaction, useUpdateTransaction } from "@/features/finance/hooks/useTransactions";
import { useToastStore } from "@/stores/toast";
import { formatDate, formatRupiah } from "@/lib/utils";
import { colors, radius, spacing, textStyles } from "@/theme";

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transaction, isLoading } = useTransaction(id);
  const updateTransaction = useUpdateTransaction(id);
  const deleteTransaction = useDeleteTransaction();
  const { showToast } = useToastStore();

  const [note, setNote] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

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
            router.back();
          } catch {
            showToast("Gagal menghapus transaksi.", "error");
          }
        },
      },
    ]);
  }, [deleteTransaction, id, router, showToast]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const backButton = (
    <Pressable
      onPress={handleBack}
      hitSlop={8}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      <ChevronLeft size={22} color={colors.text.secondary} strokeWidth={2} />
    </Pressable>
  );

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

  return (
    <Screen>
      <Header title="Transaction Detail" left={backButton} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Amount hero */}
        <View style={styles.amountHero}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {isExpense ? "" : "+"}
            {formatRupiah(Math.abs(transaction.amount))}
          </Text>
          <Text style={styles.date}>{formatDate(transaction.occurred_at)}</Text>
        </View>

        {/* Details card */}
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
              <DetailRow label="Merchant" value={transaction.merchant ?? "-"} />
              <DetailRow label="Catatan" value={transaction.note ?? "-"} />
              <DetailRow
                label="Status"
                value={transaction.status === "confirmed" ? "Terkonfirmasi" : "Draft"}
              />
              <DetailRow label="Sumber" value={transaction.source} />
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isEditing ? (
            <>
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
            </>
          ) : (
            <>
              <Button label="Edit" onPress={handleStartEdit} variant="secondary" fullWidth />
              <Button
                label="Hapus"
                onPress={handleDelete}
                variant="danger"
                loading={deleteTransaction.isPending}
                fullWidth
              />
            </>
          )}
        </View>
      </ScrollView>
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
  date: { ...StyleSheet.flatten(textStyles.caption), fontSize: 13, marginTop: spacing.sm },

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
});
