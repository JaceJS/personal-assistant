import { ActivityIndicator, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { useAccount } from "@/features/finance/hooks/useAccounts";
import { formatRupiah } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  credit: "Kartu Kredit",
};

export default function AccountDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: account, isLoading } = useAccount(id);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted">Akun tidak ditemukan</Text>
      </SafeAreaView>
    );
  }

  const isCredit = account.type === "credit";
  const balanceColor = isCredit && account.balance < 0 ? "text-danger" : "text-success";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4">
        <Pressable onPress={() => router.back()} className="active:opacity-60">
          <ArrowLeft size={22} color="#94a3b8" />
        </Pressable>
        <Text className="font-bold text-xl text-ink">Detail Akun</Text>
      </View>

      <View className="px-6">
        <View className="rounded-2xl bg-card p-6">
          <Text className="font-bold text-2xl text-ink">{account.name}</Text>
          <Text className="mt-1 text-sm text-muted">{TYPE_LABELS[account.type] ?? account.type}</Text>

          <View className="my-6 h-px bg-border" />

          <Text className="text-sm text-muted">Saldo</Text>
          <Text className={`font-bold text-3xl mt-1 ${balanceColor}`}>
            {formatRupiah(account.balance)}
          </Text>
          <Text className="mt-1 text-xs text-muted">{account.currency}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
