import { StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import { colors, spacing, textStyles } from "@/theme";

interface NotificationPermissionSheetProps {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function NotificationPermissionSheet({
  isVisible,
  onAccept,
  onDecline,
}: NotificationPermissionSheetProps) {
  return (
    <BottomSheet isVisible={isVisible} onDismiss={onDecline}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>Mau diingetin catat transaksi tiap hari?</Text>
        <Text style={styles.body}>
          Kami bisa kirim notifikasi harian biar kamu gak lupa catat pengeluaran.
        </Text>
        <View style={styles.actions}>
          <Button label="Ya, ingetin aku" onPress={onAccept} fullWidth />
          <Button label="Nanti aja" onPress={onDecline} variant="ghost" fullWidth />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  emoji: { fontSize: 32 },
  title: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
    textAlign: "center",
  },
  body: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  actions: {
    width: "100%",
    gap: spacing.sm,
  },
});
