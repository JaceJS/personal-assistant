import { Copy, Trash2 } from "lucide-react-native";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, spacing, textStyles } from "@/theme";

const MENU_WIDTH = 180;
const MENU_HEIGHT = 96;
const SCREEN_MARGIN = 8;

interface MessageActionMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onCopy: () => void;
  onDelete: () => void;
  onDismiss: () => void;
}

export function MessageActionMenu({
  visible,
  x,
  y,
  onCopy,
  onDelete,
  onDismiss,
}: MessageActionMenuProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();

  if (!visible) return null;

  const left = Math.min(Math.max(x - MENU_WIDTH / 2, SCREEN_MARGIN), width - MENU_WIDTH - SCREEN_MARGIN);
  const top = Math.min(y + 12, height - MENU_HEIGHT - SCREEN_MARGIN);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        testID="message-action-menu-backdrop"
        style={StyleSheet.absoluteFillObject}
        onPress={onDismiss}
      />
      <View style={[styles.card, { left, top }]}>
        <Pressable onPress={onCopy} style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.row}>
            <Copy size={17} color={colors.text.primary} strokeWidth={1.8} />
            <Text style={styles.label}>{t("ai.messageActions.copy")}</Text>
          </View>
        </Pressable>
        <Pressable onPress={onDelete} style={({ pressed }) => pressed && styles.pressed}>
          <View style={[styles.row, styles.rowBorder]}>
            <Trash2 size={17} color={colors.danger.text} strokeWidth={1.8} />
            <Text style={[styles.label, styles.labelDestructive]}>
              {t("ai.messageActions.delete")}
            </Text>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: MENU_WIDTH,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
  labelDestructive: {
    color: colors.danger.text,
  },
});
