import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <BottomSheet isVisible={isVisible} onDismiss={onDecline}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>{t("notifications.permissionSheet.title")}</Text>
        <Text style={styles.body}>{t("notifications.permissionSheet.body")}</Text>
        <View style={styles.actions}>
          <Button label={t("notifications.permissionSheet.accept")} onPress={onAccept} fullWidth />
          <Button
            label={t("notifications.permissionSheet.decline")}
            onPress={onDecline}
            variant="ghost"
            fullWidth
          />
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
