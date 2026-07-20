import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import { spacing } from "@/theme";

interface MessageActionSheetProps {
  isVisible: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onDismiss: () => void;
}

export function MessageActionSheet({
  isVisible,
  onCopy,
  onDelete,
  onDismiss,
}: MessageActionSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet isVisible={isVisible} onDismiss={onDismiss}>
      <View style={styles.content}>
        <Button label={t("ai.messageActions.copy")} variant="secondary" fullWidth onPress={onCopy} />
        <Button label={t("ai.messageActions.delete")} variant="danger" fullWidth onPress={onDelete} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});
