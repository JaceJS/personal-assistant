import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
      showToast("Changes saved", "success");
    } catch {
      showToast("Failed to save changes.", "error");
    }
  }, [updateTransaction, merchant, note, showToast]);

  const handleDelete = useCallback(() => {
    Alert.alert("Delete Transaction", "Are you sure you want to delete this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTransaction.mutateAsync(id);
            showToast("Transaction deleted", "info");
            router.back();
          } catch {
            showToast("Failed to delete transaction.", "error");
          }
        },
      },
    ]);
  }, [deleteTransaction, id, router, showToast]);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent.primary} />
        </View>
      </Screen>
    );
  }

  if (!transaction) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.notFound}>Transaction not found</Text>
        </View>
      </Screen>
    );
  }

  const isExpense = transaction.amount < 0;
  const amountColor = isExpense ? colors.danger.text : colors.success.text;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <ArrowLeft size={22} color={colors.text.muted} />
        </Pressable>
        <Text style={styles.title}>Transaction Detail</Text>
      </View>

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
                placeholder="Merchant name"
              />
              <Input
                label="Note"
                value={note}
                onChangeText={setNote}
                placeholder="Add a note"
                multiline
              />
            </>
          ) : (
            <>
              <DetailRow label="Merchant" value={transaction.merchant ?? "–"} />
              <DetailRow label="Note" value={transaction.note ?? "–"} />
              <DetailRow
                label="Status"
                value={transaction.status === "confirmed" ? "Confirmed" : "Draft"}
              />
              <DetailRow label="Source" value={transaction.source} />
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isEditing ? (
            <>
              <Button
                label="Save"
                onPress={handleSave}
                loading={updateTransaction.isPending}
                fullWidth
              />
              <Button
                label="Cancel"
                onPress={() => setIsEditing(false)}
                variant="ghost"
                fullWidth
              />
            </>
          ) : (
            <>
              <Button label="Edit" onPress={handleStartEdit} variant="secondary" fullWidth />
              <Button
                label="Delete"
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
  },
  title: { ...StyleSheet.flatten(textStyles.h2) },

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
