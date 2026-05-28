import { useCallback, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus, Tag, X } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import { useCategories, useCreateCategory } from "@/features/finance/hooks/useCategories";
import { useToastStore } from "@/stores/toast";
import type { Category, CategoryType } from "@/features/finance/types";
import { colors, radius, spacing } from "@/theme";

const CATEGORY_TYPES: { value: CategoryType; label: string; emoji: string }[] = [
  { value: "expense", label: "Expense", emoji: "📤" },
  { value: "income", label: "Income", emoji: "📥" },
  { value: "transfer", label: "Transfer", emoji: "🔄" },
];

const PRESET_COLORS = [
  "#D4A853", "#7DB87A", "#C97060", "#7A9EC4",
  "#B87AB8", "#A87060", "#60A8A8", "#A8A060",
];

const PRESET_ICONS = ["🍔", "🚗", "🏠", "👗", "💊", "📚", "🎮", "✈️", "💼", "🎁", "⚡", "💰"];

const TYPE_FILTER_OPTIONS: { value: CategoryType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

const schema = z.object({
  name: z.string().min(1, "Category name is required"),
  type: z.enum(["expense", "income", "transfer"]),
  icon: z.string().nullable(),
  color: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

export default function CategoriesScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useCategories();
  const createCategory = useCreateCategory();
  const { showToast } = useToastStore();

  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CategoryType | "all">("all");

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

  const categories = data ?? [];
  const filtered =
    activeFilter === "all" ? categories : categories.filter((c) => c.type === activeFilter);

  const handleOpenModal = useCallback(() => setShowModal(true), []);
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    reset();
  }, [reset]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        await createCategory.mutateAsync(values);
        handleCloseModal();
        showToast("Category created", "success");
      } catch {
        showToast("Failed to create category. Try again.", "error");
      }
    },
    [createCategory, handleCloseModal, showToast],
  );

  const renderItem = useCallback(
    ({ item }: { item: Category }) => <CategoryRow category={item} />,
    [],
  );

  return (
    <Screen>
      <Header
        title="Categories"
        right={
          <Pressable
            onPress={handleOpenModal}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
          >
            <Plus size={16} color={colors.bg.canvas} />
            <Text style={styles.addBtnLabel}>Add</Text>
          </Pressable>
        }
      />

      {/* Filter tabs */}
      <View style={styles.filters}>
        {TYPE_FILTER_OPTIONS.map((opt) => {
          const isActive = activeFilter === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setActiveFilter(opt.value)}
              style={[styles.pill, isActive && styles.pillActive]}
            >
              <Text style={[styles.pillLabel, isActive && styles.pillLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.listPad}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Tag}
              title="No categories yet"
              subtitle="Add categories to organize your transactions"
              action={{ label: "Add Category", onPress: handleOpenModal }}
            />
          }
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Category</Text>
              <Pressable onPress={handleCloseModal} style={({ pressed }) => pressed && { opacity: 0.6 }}>
                <X size={22} color={colors.text.muted} />
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Category Name"
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g. Food, Transport, Salary"
                    error={errors.name?.message}
                    autoFocus
                  />
                )}
              />

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Type</Text>
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
                <Text style={styles.sectionLabel}>Icon</Text>
                <View style={styles.iconGrid}>
                  {PRESET_ICONS.map((icon) => {
                    const isSelected = selectedIcon === icon;
                    return (
                      <Pressable
                        key={icon}
                        onPress={() => setValue("icon", icon)}
                        style={[
                          styles.iconCell,
                          isSelected
                            ? { backgroundColor: `${selectedColor ?? colors.accent.primary}33`, borderColor: selectedColor ?? colors.accent.primary }
                            : styles.iconCellInactive,
                        ]}
                      >
                        <Text style={styles.iconEmoji}>{icon}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Color</Text>
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
                label="Create Category"
                onPress={handleSubmit(onSubmit)}
                loading={createCategory.isPending}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const typeLabel: Record<string, string> = {
    expense: "Expense",
    income: "Income",
    transfer: "Transfer",
  };

  const isSystemCategory = category.user_id === null;

  return (
    <View style={styles.categoryRow}>
      <View
        style={[
          styles.categoryIcon,
          { backgroundColor: category.color ? `${category.color}22` : `${colors.accent.primary}22` },
        ]}
      >
        <Text style={styles.categoryEmoji}>{category.icon ?? "🏷️"}</Text>
      </View>

      <View style={styles.categoryInfo}>
        <View style={styles.categoryNameRow}>
          <Text style={styles.categoryName}>{category.name}</Text>
          {isSystemCategory && (
            <View style={styles.systemBadge}>
              <Text style={styles.systemBadgeLabel}>system</Text>
            </View>
          )}
        </View>
        <Text style={styles.categoryType}>{typeLabel[category.type] ?? category.type}</Text>
      </View>

      {category.color && (
        <View style={[styles.colorIndicator, { backgroundColor: category.color }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnLabel: { fontSize: 13, fontWeight: '600', color: colors.bg.canvas },

  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing['2xl'],
    gap: 8,
    marginBottom: spacing.md,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pillActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  pillLabel: { fontSize: 13, fontWeight: '500', color: colors.text.muted },
  pillLabelActive: { color: colors.bg.canvas, fontWeight: '600' },

  listPad: { paddingHorizontal: spacing['2xl'], gap: 10 },
  skeleton: {
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.elevated,
    opacity: 0.5,
    marginBottom: 10,
  },
  listContent: { paddingHorizontal: spacing['2xl'], gap: 8, paddingBottom: 32 },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing['2xl'],
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2xl'],
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: colors.text.primary },
  modalForm: { gap: spacing.xl },

  section: { gap: spacing.sm },
  sectionLabel: { fontSize: 13, fontWeight: '500', color: colors.text.muted },

  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1 },
  typeBtnActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  typeBtnInactive: { backgroundColor: colors.bg.elevated, borderColor: colors.border.default },
  typeEmoji: { fontSize: 16, marginBottom: 2 },
  typeBtnLabel: { fontSize: 11, fontWeight: '500' },
  typeBtnLabelActive: { color: colors.bg.canvas },
  typeBtnLabelInactive: { color: colors.text.muted },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconCellInactive: { backgroundColor: colors.bg.elevated, borderColor: colors.border.default },
  iconEmoji: { fontSize: 20 },

  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: colors.text.primary },

  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  categoryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  categoryEmoji: { fontSize: 20 },
  categoryInfo: { flex: 1 },
  categoryNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryName: { fontSize: 15, fontWeight: '500', color: colors.text.primary },
  systemBadge: {
    backgroundColor: `${colors.text.muted}22`,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  systemBadgeLabel: { fontSize: 10, fontWeight: '500', color: colors.text.muted },
  categoryType: { fontSize: 13, color: colors.text.muted, marginTop: 2 },
  colorIndicator: { width: 10, height: 10, borderRadius: 5 },
});
