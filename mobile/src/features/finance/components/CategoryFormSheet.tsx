import React, { useCallback, useEffect, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import type { Category, CategoryType } from "@/features/finance/types";
import { useCreateCategory, useUpdateCategory } from "@/features/finance/hooks/useCategories";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";

const CATEGORY_TYPES: { value: CategoryType; label: string; emoji: string }[] = [
  { value: "expense", label: "Pengeluaran", emoji: "📤" },
  { value: "income", label: "Pemasukan", emoji: "📥" },
];

const PRESET_COLORS = [
  "#E17055",
  "#00CEC9",
  "#6C5CE7",
  "#00B894",
  "#FDCB6E",
  "#A29BFE",
  "#FD79A8",
  "#F0932B",
];

const PRESET_ICONS = ["🍔", "🚗", "🏠", "👗", "💊", "📚", "🎮", "✈️", "💼", "🎁", "⚡", "💰"];
const ICON_COLS = 6;

const schema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi"),
  type: z.enum(["expense", "income"]),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface CategoryFormSheetProps {
  visible: boolean;
  editingCategory: Category | null;
  onDismiss: () => void;
}

function CategoryFormSheet({ visible, editingCategory, onDismiss }: CategoryFormSheetProps) {
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
          showToast("Kategori diperbarui", "success");
        } else {
          await createCategory.mutateAsync(values);
          showToast("Kategori dibuat", "success");
        }
        onDismiss();
      } catch {
        showToast(editingCategory ? "Gagal update kategori" : "Gagal buat kategori", "error");
      }
    },
    [createCategory, updateCategory, editingCategory, onDismiss, showToast]
  );

  const isPending = editingCategory ? updateCategory.isPending : createCategory.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingCategory ? "Edit Kategori" : "Kategori Baru"}
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
                  label="Nama Kategori"
                  value={value}
                  onChangeText={onChange}
                  placeholder="mis. Makan, Transport, Gaji"
                  error={errors.name?.message}
                  autoFocus
                />
              )}
            />

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tipe</Text>
              <Controller
                control={control}
                name="type"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.typeRow}>
                    {CATEGORY_TYPES.map((t) => {
                      const isSelected = value === t.value;
                      return (
                        <Pressable
                          key={t.value}
                          onPress={() => onChange(t.value)}
                          style={[
                            styles.typeBtn,
                            isSelected ? styles.typeBtnActive : styles.typeBtnInactive,
                          ]}
                        >
                          <Text style={styles.typeEmoji}>{t.emoji}</Text>
                          <Text
                            style={[
                              styles.typeBtnLabel,
                              isSelected ? styles.typeBtnLabelActive : styles.typeBtnLabelInactive,
                            ]}
                          >
                            {t.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Ikon</Text>
              <View style={styles.iconGrid}>
                {iconRows.map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.iconRow}>
                    {row.map((icon) => {
                      const isSelected = selectedIcon === icon;
                      return (
                        <Pressable
                          key={icon}
                          onPress={() => setValue("icon", icon)}
                          style={({ pressed }) => [
                            styles.iconCellWrapper,
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
                      );
                    })}
                    {row.length < ICON_COLS &&
                      Array.from({ length: ICON_COLS - row.length }).map((_, j) => (
                        <View key={`pad-${j}`} style={styles.iconCellWrapper} />
                      ))}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Warna</Text>
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
              label={editingCategory ? "Simpan" : "Buat Kategori"}
              onPress={handleSubmit(onSubmit)}
              loading={isPending}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "90%",
    alignSelf: "stretch",
  },
  sheetContent: {
    padding: spacing["2xl"],
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing["2xl"],
  },
  modalTitle: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
  },
  modalForm: { gap: spacing.xl },

  section: { gap: spacing.sm },
  sectionLabel: { fontSize: 13, fontWeight: "500", color: colors.text.muted },

  typeRow: { flexDirection: "row", gap: spacing.sm },
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

  iconGrid: { gap: spacing.sm },
  iconRow: { flexDirection: "row", gap: 6 },
  iconCellWrapper: { flex: 1 },
  iconCell: {
    height: 44,
    flex: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconCellInactive: { backgroundColor: colors.bg.elevated, borderColor: colors.border.default },
  iconEmoji: { fontSize: 20 },

  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.text.primary },
});

export default React.memo(CategoryFormSheet);
