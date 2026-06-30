import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { formatRupiah } from "@/lib/utils";
import { colors, radius, spacing, textStyles } from "@/theme";

export default function AccountBalanceCard() {
  const router = useRouter();
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

  if (accounts.length === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.glow} />
        <Pressable onPress={() => router.push("/(app)/accounts")}>
          {({ pressed }) => (
            <View style={[styles.promptRow, pressed && styles.pressed]}>
              <Text style={styles.promptText}>Tambah akun pertama</Text>
              <Text style={styles.promptArrow}>→</Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.glow} />
      <Text style={styles.label}>TOTAL SALDO</Text>
      <Text style={styles.amount}>{formatRupiah(displayBalance)}</Text>
      <Text style={styles.sub}>{accounts.length} akun</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
    padding: 20,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accent.primary,
    top: -40,
    right: -30,
    opacity: 0.12,
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
  promptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  promptText: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.secondary,
  },
  promptArrow: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.accent.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});
