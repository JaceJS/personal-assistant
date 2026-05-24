import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatRupiah } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS } from "@/features/finance/constants";
import type { Account } from "@/features/finance/types";
import { colors, radius, spacing } from "@/theme";

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
}

function AccountCard({ account, onPress }: AccountCardProps) {
  const isCredit = account.type === "credit";
  const balanceColor = isCredit && account.balance < 0 ? colors.danger.text : colors.text.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.row}>
        <Text style={styles.name}>{account.name}</Text>
        <Text style={styles.typeBadge}>{ACCOUNT_TYPE_LABELS[account.type]}</Text>
      </View>
      <Text style={[styles.balance, { color: balanceColor }]}>
        {formatRupiah(account.balance)}
      </Text>
      <Text style={styles.currency}>{account.currency}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  typeBadge: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 12,
    color: colors.text.muted,
  },
  balance: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  currency: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
});

export default React.memo(AccountCard);
