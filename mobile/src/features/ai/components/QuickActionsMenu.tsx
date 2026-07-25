import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ChartBar, Plus, Receipt, TrendingDown, TrendingUp } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, spacing, textStyles } from "@/theme";
import type { QuickChip } from "@/features/ai/utils/quickChips";

const CHIP_ICONS: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  logExpense: TrendingDown,
  scanReceipt: Receipt,
  logIncome: TrendingUp,
  analyze: ChartBar,
};

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

  return (
    <View style={styles.wrapper}>
      {visible && (
        <>
          <Pressable testID="quick-actions-backdrop" style={styles.backdrop} onPress={onToggle} />
          <View style={styles.card}>
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
          </View>
        </>
      )}

      <Pressable testID="quick-actions-trigger" onPress={onToggle} hitSlop={8}>
        {({ pressed }) => (
          <View style={[styles.trigger, pressed && styles.pressed]}>
            <Plus size={22} color={colors.accent.primary} strokeWidth={1.8} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  trigger: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  backdrop: {
    position: "absolute",
    top: -1000,
    left: -500,
    right: -500,
    bottom: 44,
    zIndex: 10,
  },
  card: {
    position: "absolute",
    bottom: 52,
    left: 0,
    minWidth: 220,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
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
  label: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
});
