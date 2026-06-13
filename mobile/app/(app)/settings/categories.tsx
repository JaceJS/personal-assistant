import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Plus, Tag } from "lucide-react-native";
import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import Fab from "@/components/ui/Fab";
import FilterPill from "@/components/ui/FilterPill";
import EmptyState from "@/components/ui/EmptyState";
import CategoryActionSheet from "@/features/finance/components/CategoryActionSheet";
import CategoryCard from "@/features/finance/components/CategoryCard";
import CategoryFormSheet from "@/features/finance/components/CategoryFormSheet";
import { useArchiveCategory, useCategories } from "@/features/finance/hooks/useCategories";
import { useToastStore } from "@/stores/toast";
import type { Category, CategoryType } from "@/features/finance/types";
import { colors, radius, spacing } from "@/theme";

const GRID_COLS = 4;

const TYPE_FILTER_OPTIONS: { value: CategoryType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

export default function CategoriesScreen() {
  const router = useRouter();

  const { data, isLoading, isRefetching, refetch } = useCategories();
  const archiveCategory = useArchiveCategory();
  const { showToast } = useToastStore();

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeFilter, setActiveFilter] = useState<CategoryType | "all">("all");
  const [actionCategory, setActionCategory] = useState<Category | null>(null);

  const categories = data ?? [];
  const filtered =
    activeFilter === "all" ? categories : categories.filter((c) => c.type === activeFilter);

  const rows = useMemo(
    () =>
      filtered.reduce<Category[][]>((acc, cat, i) => {
        if (i % GRID_COLS === 0) acc.push([]);
        acc[acc.length - 1].push(cat);
        return acc;
      }, []),
    [filtered]
  );

  const handleOpenCreate = useCallback(() => {
    setEditingCategory(null);
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setShowModal(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowModal(false);
    setEditingCategory(null);
  }, []);

  const handleArchive = useCallback(
    (category: Category) => {
      Alert.alert(
        "Archive Category",
        `Archive "${category.name}"? It will no longer appear in transaction lists.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Archive",
            style: "destructive",
            onPress: () =>
              archiveCategory.mutate(category.id, {
                onSuccess: () => showToast("Category archived", "success"),
                onError: () => showToast("Failed to archive category", "error"),
              }),
          },
        ]
      );
    },
    [archiveCategory, showToast]
  );

  const backButton = (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/settings"))}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      <ChevronLeft size={22} color={colors.text.muted} />
    </Pressable>
  );

  return (
    <Screen>
      <Header title="Categories" left={backButton} />

      <View style={styles.filters}>
        {TYPE_FILTER_OPTIONS.map((opt) => (
          <FilterPill
            key={opt.value}
            label={opt.label}
            active={activeFilter === opt.value}
            onPress={() => setActiveFilter(opt.value)}
          />
        ))}
      </View>

      {isLoading ? (
        <View style={styles.gridContent}>
          {Array.from({ length: 3 }).map((_, r) => (
            <View key={r} style={styles.gridRow}>
              {Array.from({ length: GRID_COLS }).map((_, c) => (
                <View key={c} style={styles.skeletonCard} />
              ))}
            </View>
          ))}
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories"
          subtitle={
            activeFilter === "all"
              ? "Add categories to organize your transactions"
              : `No ${activeFilter} categories yet`
          }
          action={
            activeFilter === "all"
              ? { label: "Add Category", onPress: handleOpenCreate }
              : undefined
          }
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent.primary}
            />
          }
        >
          {rows.map((row, i) => (
            <View key={i} style={styles.gridRow}>
              {row.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onPress={setActionCategory}
                />
              ))}
              {row.length < GRID_COLS &&
                Array.from({ length: GRID_COLS - row.length }).map((_, j) => (
                  <View key={`pad-${j}`} style={styles.cardPad} />
                ))}
            </View>
          ))}
        </ScrollView>
      )}

      <CategoryActionSheet
        visible={actionCategory !== null}
        category={actionCategory}
        onDismiss={() => setActionCategory(null)}
        onEdit={(c) => { setActionCategory(null); handleOpenEdit(c); }}
        onArchive={(c) => { setActionCategory(null); handleArchive(c); }}
      />

      <CategoryFormSheet
        visible={showModal}
        editingCategory={editingCategory}
        onDismiss={handleDismiss}
      />

      <Fab onPress={handleOpenCreate} icon={Plus} accessibilityLabel="Add category" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    paddingHorizontal: spacing["2xl"],
    gap: 8,
    marginBottom: spacing.md,
  },

  gridContent: {
    paddingHorizontal: 11,
    paddingTop: 8,
    paddingBottom: 40,
  },
  gridRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  cardPad: { flex: 1, marginHorizontal: 5 },

  skeletonCard: {
    flex: 1,
    marginHorizontal: 5,
    height: 90,
    borderRadius: radius.xl,
    backgroundColor: colors.bg.elevated,
    opacity: 0.5,
  },
});
