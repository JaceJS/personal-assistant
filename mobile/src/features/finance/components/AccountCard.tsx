import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { formatRupiah } from "@/lib/utils";
import { ACCOUNT_TYPE_EMOJI, ACCOUNT_TYPE_LABELS } from "@/features/finance/constants";
import type { Account, AccountType } from "@/features/finance/types";
import { colors, radius, spacing, textStyles } from "@/theme";

const TYPE_BG: Record<AccountType, string> = {
  bank: colors.info.bg,
  cash: colors.success.bg,
  ewallet: colors.accent.subtle,
  credit: colors.danger.bg,
};

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
}

function AccountCard({ account, onPress }: AccountCardProps) {
  const balanceColor =
    account.type === "credit" && account.balance < 0 ? colors.danger.text : colors.text.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.top}>
        <View style={[styles.iconBox, { backgroundColor: TYPE_BG[account.type] }]}>
          <Text style={styles.emoji}>{ACCOUNT_TYPE_EMOJI[account.type]}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
          <Text style={styles.typeLabel}>{ACCOUNT_TYPE_LABELS[account.type]}</Text>
        </View>
        <ChevronRight size={16} color={colors.text.muted} />
      </View>

      <View style={styles.balanceRow}>
        <Text style={[styles.balance, { color: balanceColor }]}>
          {formatRupiah(account.balance)}
        </Text>
        <Text style={styles.currency}>{account.currency}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emoji: {
    fontSize: 22,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    ...StyleSheet.flatten(textStyles.h3),
  },
  typeLabel: {
    ...StyleSheet.flatten(textStyles.caption),
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingLeft: 56,
  },
  balance: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 22,
  },
  currency: {
    ...StyleSheet.flatten(textStyles.caption),
  },
});

export default React.memo(AccountCard);
