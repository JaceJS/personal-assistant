import React, { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "@/components/ui/BottomSheet";
import type { Category } from "@/features/finance/types";
import CategoryCard from "@/features/finance/components/CategoryCard";
import { colors, radius, spacing, textStyles } from "@/theme";

interface AddSpendingLimitSheetProps {
  categories: Category[];
  isVisible: boolean;
  onDismiss: () => void;
  onSelect: (category: Category) => void;
}

function AddSpendingLimitSheet({
  categories,
  isVisible,
  onDismiss,
  onSelect,
}: AddSpendingLimitSheetProps) {
  const { t } = useTranslation();
  const renderItem = useCallback(
    ({ item }: { item: Category }) => <CategoryCard category={item} onPress={onSelect} />,
    [onSelect]
  );

  const keyExtractor = useCallback((item: Category) => item.id, []);

  return (
    <BottomSheet isVisible={isVisible} onDismiss={onDismiss} maxHeightPercent={75}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t("budget.addLimit.title")}</Text>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
          onPress={onDismiss}
        >
          <X size={16} color={colors.text.secondary} strokeWidth={1.5} />
        </Pressable>
      </View>
      <Text style={styles.subtitle}>{t("budget.addLimit.subtitle")}</Text>

      {categories.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t("budget.addLimit.allSetText")}</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.md,
    marginBottom: 4,
  },
  title: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bg.hover,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    paddingHorizontal: spacing["2xl"],
    marginBottom: spacing.md,
  },
  list: { flexShrink: 1 },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 8,
  },
  columnWrapper: { gap: 8 },
  empty: {
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing["2xl"],
  },
  emptyText: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.muted,
    textAlign: "center",
  },
});

export default React.memo(AddSpendingLimitSheet);
