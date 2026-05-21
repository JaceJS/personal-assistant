import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { List, Plus } from "lucide-react-native";

import EmptyState from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import TransactionCard from "@/features/finance/components/TransactionCard";
import { useTransactions } from "@/features/finance/hooks/useTransactions";
import type { Transaction } from "@/features/finance/types";

export default function TransactionsScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useTransactions();

  const transactions = data?.items ?? [];

  const handleAdd = useCallback(() => router.push("/(app)/transactions/new"), [router]);

  const handlePressItem = useCallback(
    (id: string) => router.push(`/(app)/transactions/${id}`),
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionCard transaction={item} onPress={() => handlePressItem(item.id)} />
    ),
    [handlePressItem]
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="font-bold text-2xl text-ink">Transaksi</Text>
        <Pressable
          onPress={handleAdd}
          className="flex-row items-center gap-1.5 rounded-xl bg-accent px-3 py-2"
        >
          <Plus size={16} color="#fff" />
          <Text className="font-semibold text-sm text-white">Tambah</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="px-6">
          <SkeletonList count={5} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <EmptyState
              icon={List}
              title="Belum ada transaksi"
              subtitle="Rekam suara atau tambah secara manual"
              action={{ label: "Tambah Transaksi", onPress: handleAdd }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
