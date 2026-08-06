import React, { useCallback, useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { BottomSheet } from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { PRESET_COLORS, PRESET_ICONS } from "@/features/finance/constants";
import type { Category, CategoryType } from "@/features/finance/types";
import { useCreateCategory, useUpdateCategory } from "@/features/finance/hooks/useCategories";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";

// Literal key paths (see src/i18n/types.ts) so t() stays type-checked.
const CATEGORY_TYPES: {
  value: CategoryType;
  labelKey: "transaction.expense" | "transaction.income";
  emoji: string;
}[] = [
  { value: "expense", labelKey: "transaction.expense", emoji: "📤" },
  { value: "income", labelKey: "transaction.income", emoji: "📥" },
];

const ICON_COLS = 6;

// Module-scope Zod schemas evaluate error messages at import time (before
// i18n has a language) — factory + useMemo(() => ..., [t]) keeps them reactive.
function makeSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t("categories.form.nameRequired")),
    type: z.enum(["expense", "income"]),
    icon: z.string().nullable(),
    color: z.string().nullable(),
  });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

interface CategoryFormSheetProps {
  visible: boolean;
  editingCategory: Category | null;
  onDismiss: () => void;
}

function CategoryFormSheet({ visible, editingCategory, onDismiss }: CategoryFormSheetProps) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeSchema(t), [t]);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { showToast } = useToastStore();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "expense", icon: "🏷️", color: PRESET_COLORS[0] },
  });

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");

  const iconRows = useMemo(
    () =>
      PRESET_ICONS.reduce<string[][]>((acc, icon, i) => {
        if (i % ICON_COLS === 0) acc.push([]);
        acc[acc.length - 1].push(icon);
        return acc;
      }, []),
    []
  );

  useEffect(() => {
    if (visible) {
      reset(
        editingCategory
          ? {
              name: editingCategory.name,
              type: editingCategory.type,
              icon: editingCategory.icon ?? "🏷️",
              color: editingCategory.color ?? PRESET_COLORS[0],
            }
          : { name: "", type: "expense", icon: "🏷️", color: PRESET_COLORS[0] }
      );
    }
  }, [visible, editingCategory, reset]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        if (editingCategory) {
          await updateCategory.mutateAsync({ id: editingCategory.id, data: values });
          showToast(t("categories.form.updatedToast"), "success");
        } else {
          await createCategory.mutateAsync(values);
          showToast(t("categories.form.createdToast"), "success");
        }
        onDismiss();
      } catch {
        showToast(
          editingCategory ? t("categories.form.updateError") : t("categories.form.createError"),
          "error"
        );
      }
    },
    [createCategory, updateCategory, editingCategory, onDismiss, showToast, t]
  );

  const isPending = editingCategory ? updateCategory.isPending : createCategory.isPending;

  return (
    <BottomSheet isVisible={visible} onDismiss={onDismiss} maxHeightPercent={90}>
      <ScrollView
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {editingCategory ? t("categories.form.editTitle") : t("categories.form.newTitle")}
          </Text>
          <Pressable onPress={onDismiss} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <X size={22} color={colors.text.muted} />
          </Pressable>
        </View>

        <View style={styles.modalForm}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label={t("categories.form.nameLabel")}
                value={value}
                onChangeText={onChange}
                placeholder={t("categories.form.namePlaceholder")}
                error={errors.name?.message}
                autoFocus
              />
            )}
          />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("categories.form.typeLabel")}</Text>
            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <View style={styles.typeRow}>
                  {CATEGORY_TYPES.map((opt) => {
                    const isSelected = value === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => onChange(opt.value)}
                        style={[
                          styles.typeBtn,
                          isSelected ? styles.typeBtnActive : styles.typeBtnInactive,
                        ]}
                      >
                        <Text style={styles.typeEmoji}>{opt.emoji}</Text>
                        <Text
                          style={[
                            styles.typeBtnLabel,
                            isSelected ? styles.typeBtnLabelActive : styles.typeBtnLabelInactive,
                          ]}
                        >
                          {t(opt.labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("goals.form.iconLabel")}</Text>
            <View style={styles.iconGrid}>
              {iconRows.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.iconRow}>
                  {row.map((icon) => {
                    const isSelected = selectedIcon === icon;
                    return (
                      <View key={icon} style={styles.iconCellWrapper}>
                        <Pressable
                          onPress={() => setValue("icon", icon)}
                          style={({ pressed }) => [
                            styles.iconCellPressable,
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <View
                            style={[
                              styles.iconCell,
                              isSelected
                                ? {
                                    backgroundColor: `${selectedColor ?? colors.accent.primary}33`,
                                    borderColor: selectedColor ?? colors.accent.primary,
                                  }
                                : styles.iconCellInactive,
                            ]}
                          >
                            <Text style={styles.iconEmoji}>{icon}</Text>
                          </View>
                        </Pressable>
                      </View>
                    );
                  })}
                  {row.length < ICON_COLS &&
                    Array.from({ length: ICON_COLS - row.length }).map((_, j) => (
                      <View key={`pad-${j}`} style={styles.iconCellPlaceholder} />
                    ))}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("categories.form.colorLabel")}</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setValue("color", color)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      isSelected && styles.colorDotSelected,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <Button
            label={editingCategory ? t("common.save") : t("categories.form.createCta")}
            onPress={handleSubmit(onSubmit)}
            loading={isPending}
            fullWidth
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetContent: {
    padding: spacing["2xl"],
    paddingBottom: 40,
    alignItems: "stretch",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing["2xl"],
    alignSelf: "stretch",
  },
  modalTitle: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
  },
  modalForm: { gap: spacing.xl, alignSelf: "stretch" },

  section: { gap: spacing.sm, alignSelf: "stretch" },
  sectionLabel: { fontSize: 13, fontWeight: "500", color: colors.text.muted },

  typeRow: { flexDirection: "row", gap: spacing.sm, alignSelf: "stretch" },
  typeBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  typeBtnActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  typeBtnInactive: { backgroundColor: colors.bg.elevated, borderColor: colors.border.default },
  typeEmoji: { fontSize: 16, marginBottom: 2 },
  typeBtnLabel: { fontSize: 11, fontWeight: "500" },
  typeBtnLabelActive: { color: colors.bg.canvas },
  typeBtnLabelInactive: { color: colors.text.muted },

  iconGrid: { gap: spacing.sm, alignSelf: "stretch" },
  iconRow: { flexDirection: "row", gap: 6, width: "100%", alignSelf: "stretch" },
  iconCellWrapper: { flex: 1 },
  iconCellPressable: { width: "100%", alignItems: "center" },
  iconCell: {
    width: "100%",
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCellInactive: { backgroundColor: colors.bg.elevated, borderColor: colors.border.default },
  iconCellPlaceholder: { flex: 1, height: 44 },
  iconEmoji: {
    fontSize: 20,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap", alignSelf: "stretch" },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.text.primary },
});

export default React.memo(CategoryFormSheet);
