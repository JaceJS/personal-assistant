import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CreditCard, Landmark, RefreshCw, Smartphone, Wallet } from "lucide-react-native";
import { formatRelativeTime, formatRupiah } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS } from "@/features/finance/constants";
import type { Account, AccountType } from "@/features/finance/types";
import { colors, radius, spacing, textStyles } from "@/theme";

const ICON_SIZE = 24;
const ICON_COLOR = colors.accent.text;

function TypeIcon({ type }: { type: AccountType }) {
  switch (type) {
    case "bank":    return <Landmark size={ICON_SIZE} color={ICON_COLOR} />;
    case "cash":    return <Wallet size={ICON_SIZE} color={ICON_COLOR} />;
    case "ewallet": return <Smartphone size={ICON_SIZE} color={ICON_COLOR} />;
    case "credit":  return <CreditCard size={ICON_SIZE} color={ICON_COLOR} />;
  }
}

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
}

function AccountCard({ account, onPress }: AccountCardProps) {
  const balanceColor =
    account.type === "credit" && account.balance < 0
      ? colors.danger.text
      : colors.text.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.75 }}
    >
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{account.name.toUpperCase()}</Text>
            <Text style={[textStyles.caption, styles.typeLabel]}>
              {ACCOUNT_TYPE_LABELS[account.type]}
            </Text>
          </View>
          <TypeIcon type={account.type} />
        </View>

        <Text style={[textStyles.display, styles.balance, { color: balanceColor }]}>
          {formatRupiah(account.balance)}
        </Text>

        <View style={styles.footer}>
          <RefreshCw size={12} color={colors.text.muted} />
          <Text style={[textStyles.caption, styles.syncText]}>
            Synced {formatRelativeTime(account.updated_at)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing["2xl"],
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  nameBlock: {
    flex: 1,
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  name: {
    ...StyleSheet.flatten(textStyles.h3),
    fontSize: 13,
    letterSpacing: 1.2,
  },
  balance: {
    fontSize: 36,
    letterSpacing: -0.8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  syncText: {
    fontSize: 11,
  },
  typeLabel: {
    color: colors.accent.text,
  },
});

export default React.memo(AccountCard);
