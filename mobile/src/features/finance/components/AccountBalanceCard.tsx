import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { formatRupiah } from "@/lib/utils";
import { colors, spacing, textStyles } from "@/theme";

export default function AccountBalanceCard() {
  const { data } = useAccounts();
  const accounts = (data ?? []).filter((a) => !a.is_archived);
  const totalBalance = accounts.reduce((sum, a: { balance: number }) => sum + a.balance, 0);

  const [displayBalance, setDisplayBalance] = useState(0);
  const animatedBalance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listener = animatedBalance.addListener(({ value }) =>
      setDisplayBalance(Math.round(value))
    );
    Animated.timing(animatedBalance, {
      toValue: totalBalance,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animatedBalance.removeListener(listener);
  }, [totalBalance, animatedBalance]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>TOTAL SALDO</Text>
      <Text style={styles.amount}>{formatRupiah(displayBalance)}</Text>
      <Text style={styles.sub}>
        {accounts.length === 0
          ? "Belum ada akun"
          : `${accounts.length} akun`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
    padding: 20,
  },
  label: {
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    color: colors.text.muted,
    marginBottom: 8,
  },
  amount: {
    ...StyleSheet.flatten(textStyles.display),
    fontWeight: "800",
    letterSpacing: -1,
    color: colors.text.primary,
    marginBottom: 6,
  },
  sub: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
});
