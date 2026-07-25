import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  ChartBar,
  ChevronDown,
  ChevronUp,
  Receipt,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, spacing, textStyles } from "@/theme";
import type { QuickChip } from "@/features/ai/utils/quickChips";

const CHIP_ICONS: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  logExpense: TrendingDown,
  scanReceipt: Receipt,
  logIncome: TrendingUp,
  analyze: ChartBar,
};

const CONTAINER_WIDTH = 240;
const ROW_HEIGHT = 38;
const HEADER_HEIGHT = 36;

interface QuickActionsMenuProps {
  chips: QuickChip[];
  visible: boolean;
  onToggle: () => void;
  onSelect: (chip: QuickChip) => void;
  busyChipId?: string;
}

export function QuickActionsMenu({
  chips,
  visible,
  onToggle,
  onSelect,
  busyChipId,
}: QuickActionsMenuProps) {
  const { t } = useTranslation();
  const openProgress = useSharedValue(0);

  useEffect(() => {
    openProgress.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible, openProgress]);

  // Rows are only mounted while open, so the animated height just grows
  // into their already-laid-out content (no manual measuring needed).
  const rowsHeight = chips.length * ROW_HEIGHT + (chips.length - 1);
  const rowsAnimatedStyle = useAnimatedStyle(() => ({
    height: rowsHeight * openProgress.value,
  }));

  return (
    <View style={styles.wrapper}>
      {visible && (
        <Pressable testID="quick-actions-backdrop" style={styles.backdrop} onPress={onToggle} />
      )}

      <View style={styles.container}>
        <Pressable testID="quick-actions-trigger" onPress={onToggle}>
          {({ pressed }) => (
            <View
              style={[styles.header, visible && styles.headerConnected, pressed && styles.pressed]}
            >
              <Zap size={17} color={colors.accent.primary} strokeWidth={1.8} />
              <Text style={styles.headerLabel}>{t("ai.quickActionsMenu.label")}</Text>
              {visible ? (
                <ChevronUp size={17} color={colors.text.muted} strokeWidth={1.8} />
              ) : (
                <ChevronDown size={17} color={colors.text.muted} strokeWidth={1.8} />
              )}
            </View>
          )}
        </Pressable>

        {visible && (
          <Animated.View style={[styles.rowsClip, rowsAnimatedStyle]}>
            {chips.map((chip, index) => {
              const isBusy = chip.id === busyChipId;
              const Icon = CHIP_ICONS[chip.id] ?? ChartBar;
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => !isBusy && onSelect(chip)}
                  style={({ pressed }) => pressed && !isBusy && styles.pressed}
                >
                  <View style={[styles.row, index > 0 && styles.rowBorder]}>
                    {isBusy ? (
                      <ActivityIndicator
                        testID={`quick-action-busy-${chip.id}`}
                        size="small"
                        color={colors.accent.primary}
                      />
                    ) : (
                      <Icon size={17} color={colors.accent.primary} strokeWidth={1.8} />
                    )}
                    <Text style={styles.label}>{t(chip.labelKey)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    alignItems: "flex-end",
  },
  container: {
    width: CONTAINER_WIDTH,
    zIndex: 20,
  },
  rowsClip: {
    overflow: "hidden",
    backgroundColor: colors.bg.surface,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border.default,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    position: "absolute",
    top: -1000,
    left: -500,
    right: -500,
    bottom: -1000,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: HEADER_HEIGHT,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  headerConnected: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  headerLabel: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: ROW_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  label: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
});
