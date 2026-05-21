import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatRupiah, formatShortDate } from "@/lib/utils";
import type { Transaction } from "@/features/finance/types";

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
}

function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const isExpense = transaction.amount < 0;
  const amountColor = isExpense ? "text-danger" : "text-success";
  const amountPrefix = isExpense ? "" : "+";

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl bg-card px-4 py-3.5 active:opacity-70"
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-semibold text-sm text-ink" numberOfLines={1}>
          {transaction.merchant ?? "Transaksi"}
        </Text>
        <Text className="text-xs text-muted">{formatShortDate(transaction.occurred_at)}</Text>
      </View>
      <Text className={`font-bold text-sm ${amountColor}`}>
        {amountPrefix}
        {formatRupiah(Math.abs(transaction.amount))}
      </Text>
    </Pressable>
  );
}

export default React.memo(TransactionCard);
