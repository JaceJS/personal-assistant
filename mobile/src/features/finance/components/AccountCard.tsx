import React from "react";
import { Pressable, Text, View } from "react-native";
import { formatRupiah } from "@/lib/utils";
import type { Account, AccountType } from "@/features/finance/types";

const TYPE_LABELS: Record<AccountType, string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  credit: "Kartu Kredit",
};

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
}

function AccountCard({ account, onPress }: AccountCardProps) {
  const isCredit = account.type === "credit";
  const balanceColor = isCredit && account.balance < 0 ? "text-danger" : "text-ink";

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl bg-card p-4 active:opacity-70"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-base text-ink">{account.name}</Text>
        <Text className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">
          {TYPE_LABELS[account.type]}
        </Text>
      </View>
      <Text className={`font-bold text-2xl mt-2 ${balanceColor}`}>
        {formatRupiah(account.balance)}
      </Text>
      <Text className="text-xs text-muted mt-1">{account.currency}</Text>
    </Pressable>
  );
}

export default React.memo(AccountCard);
