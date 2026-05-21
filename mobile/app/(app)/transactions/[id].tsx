import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { Pressable } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useDeleteTransaction, useTransaction, useUpdateTransaction } from "@/features/finance/hooks/useTransactions";
import { useToastStore } from "@/stores/toast";
import { formatDate, formatRupiah } from "@/lib/utils";

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

  // Keep Alert for destructive delete confirmation — intentional guard
  const handleDelete = useCallback(() => {
    Alert.alert("Hapus Transaksi", "Yakin ingin menghapus transaksi ini?", [
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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted">Transaksi tidak ditemukan</Text>
      </SafeAreaView>
    );
  }

  const isExpense = transaction.amount < 0;
  const amountColor = isExpense ? "text-danger" : "text-success";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4">
        <Pressable onPress={() => router.back()} className="active:opacity-60">
          <ArrowLeft size={22} color="#94a3b8" />
        </Pressable>
        <Text className="font-bold text-xl text-ink">Detail Transaksi</Text>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Amount hero */}
        <View className="items-center py-8">
          <Text className={`font-bold text-4xl ${amountColor}`}>
            {isExpense ? "" : "+"}
            {formatRupiah(Math.abs(transaction.amount))}
          </Text>
          <Text className="mt-2 text-sm text-muted">{formatDate(transaction.occurred_at)}</Text>
        </View>

        {/* Details */}
        <View className="gap-4 rounded-2xl bg-card p-5">
          {isEditing ? (
            <>
              <Input
                label="Merchant"
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Nama merchant"
              />
              <Input
                label="Catatan"
                value={note}
                onChangeText={setNote}
                placeholder="Tambah catatan"
                multiline
              />
            </>
          ) : (
            <>
              <DetailRow label="Merchant" value={transaction.merchant ?? "–"} />
              <DetailRow label="Catatan" value={transaction.note ?? "–"} />
              <DetailRow label="Status" value={transaction.status === "confirmed" ? "Dikonfirmasi" : "Draft"} />
              <DetailRow label="Sumber" value={transaction.source} />
            </>
          )}
        </View>

        {/* Actions */}
        <View className="mt-6 gap-3">
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

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="flex-1 text-right text-sm text-ink">{value}</Text>
    </View>
  );
}
