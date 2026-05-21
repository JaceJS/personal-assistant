import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { List } from "lucide-react-native";

import { ConfirmCard } from "@/components/voice/ConfirmCard";
import { MicButton } from "@/components/voice/MicButton";
import { RecordingIndicator } from "@/components/voice/RecordingIndicator";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonBalanceCard, SkeletonList } from "@/components/ui/Skeleton";
import TransactionCard from "@/features/finance/components/TransactionCard";
import type { ExtractedTransaction } from "@/features/finance/api/voice";
import { uploadAudio } from "@/features/finance/api/voice";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCreateTransaction, useTransactions } from "@/features/finance/hooks/useTransactions";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { formatRupiah } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useRecordingStore } from "@/stores/recording";
import { useToastStore } from "@/stores/toast";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { phase, isRecording, isProcessing, startRecording, stopRecording, reset } =
    useVoiceRecorder();
  const { setPhase, setError } = useRecordingStore();
  const { showToast } = useToastStore();

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: txData, isLoading: txLoading } = useTransactions();
  const createTransaction = useCreateTransaction();

  const [extracted, setExtracted] = useState<ExtractedTransaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalBalance =
    accountsData?.items.reduce((sum, acc) => sum + acc.balance, 0) ?? null;

  const recentTransactions = txData?.items.slice(0, 5) ?? [];

  const handlePressIn = useCallback(() => {
    if (phase !== "idle") return;
    void startRecording();
  }, [phase, startRecording]);

  const handlePressOut = useCallback(async () => {
    if (!isRecording) return;
    const uri = await stopRecording();
    if (!uri) return;

    const firstAccountId = accountsData?.items[0]?.id ?? "default-account-id";

    try {
      await uploadAudio(uri, firstAccountId);
      // TODO: poll voice status and call setExtracted(result.transaction)
      setExtracted({
        amount: -50000,
        currency: "IDR",
        merchant: "Warung Makan",
        category_name: "Food & Drink",
        note: "makan siang",
        confidence: 0.92,
      });
      setPhase("idle");
    } catch {
      setError("Gagal mengunggah rekaman. Coba lagi.");
    }
  }, [isRecording, stopRecording, setPhase, setError, accountsData]);

  const handleSave = useCallback(
    async (data: ExtractedTransaction) => {
      const accountId = accountsData?.items[0]?.id;
      if (!accountId) {
        Alert.alert("Error", "Tidak ada akun. Buat akun terlebih dahulu.");
        return;
      }

      setIsSaving(true);
      try {
        await createTransaction.mutateAsync({
          account_id: accountId,
          amount: data.amount,
          currency: data.currency,
          merchant: data.merchant ?? null,
          note: data.note ?? null,
          occurred_at: new Date().toISOString(),
        });
        setExtracted(null);
        reset();
        showToast("Transaksi tersimpan", "success");
      } catch {
        showToast("Gagal menyimpan transaksi. Coba lagi.", "error");
      } finally {
        setIsSaving(false);
      }
    },
    [accountsData, createTransaction, reset, showToast]
  );

  const handleDismiss = useCallback(() => {
    setExtracted(null);
    reset();
  }, [reset]);

  const firstName = user?.email?.split("@")[0] ?? "Kamu";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={!isRecording}
      >
        {/* Header */}
        <View className="px-6 pt-4">
          <Text className="font-sans text-sm text-muted">Selamat datang,</Text>
          <Text className="font-bold text-2xl text-ink capitalize">{firstName}</Text>
        </View>

        {/* Balance card */}
        {accountsLoading ? (
          <SkeletonBalanceCard />
        ) : (
          <View className="mx-6 mt-5 rounded-2xl bg-card p-5">
            <Text className="font-medium text-sm text-muted">Total Saldo</Text>
            <Text className="font-bold text-3xl text-ink mt-1">
              {totalBalance !== null ? formatRupiah(totalBalance) : "Rp –"}
            </Text>
            <Text className="font-sans text-xs text-muted mt-0.5">semua akun</Text>
          </View>
        )}

        {/* Voice recording area */}
        <View className="flex-1 items-center justify-center gap-6 py-10">
          <RecordingIndicator isRecording={isRecording} />

          <MicButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />

          {phase === "error" ? (
            <Text className="px-8 text-center text-sm text-danger">
              {useRecordingStore.getState().errorMessage}
            </Text>
          ) : null}
        </View>

        {/* Recent transactions */}
        <View className="px-6 pb-6">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="font-semibold text-base text-ink">Transaksi Terakhir</Text>
            <Pressable onPress={() => router.push("/(app)/transactions/index")}>
              <Text className="text-sm text-accent">Lihat semua</Text>
            </Pressable>
          </View>

          {txLoading ? (
            <SkeletonList count={3} />
          ) : recentTransactions.length === 0 ? (
            <EmptyState
              icon={List}
              title="Belum ada transaksi"
              subtitle="Tahan tombol mic untuk merekam"
            />
          ) : (
            <View className="gap-2">
              {recentTransactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onPress={() => router.push(`/(app)/transactions/${tx.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Confirm card overlay */}
      <ConfirmCard
        data={extracted}
        isVisible={extracted !== null}
        isSaving={isSaving}
        onSave={handleSave}
        onDismiss={handleDismiss}
      />
    </SafeAreaView>
  );
}
