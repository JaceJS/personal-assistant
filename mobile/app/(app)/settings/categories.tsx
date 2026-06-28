import { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus, Tag } from "lucide-react-native";
import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import { HeaderButton } from "@/components/ui/HeaderButton";
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
  { value: "all", label: "Semua" },
  { value: "expense", label: "Pengeluaran" },
  { value: "income", label: "Pemasukan" },
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

  const handleDelete = useCallback(
    (category: Category) => {
      Alert.alert(
        "Hapus Kategori",
        `Yakin mau hapus "${category.name}"?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Hapus",
            style: "destructive",
            onPress: async () => {
              try {
                await archiveCategory.mutateAsync(category.id);
                showToast("Kategori dihapus", "info");
              } catch {
                showToast("Gagal hapus kategori", "error");
              }
            },
          },
        ]
      );
    },
    [archiveCategory, showToast]
  );

  const addButton = (
    <HeaderButton
      icon={Plus}
      onPress={handleOpenCreate}
      accessibilityLabel="Add category"
    />
  );

  return (
    <Screen>
      <Header
        title="Kategori"
        onBack={() => router.canGoBack() ? router.back() : router.replace("/(app)/settings")}
        right={addButton}
      />

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
          title="Belum ada kategori"
          subtitle={
            activeFilter === "all"
              ? "Yuk mulai kategoriin transaksimu"
              : `Belum ada kategori ${activeFilter === "expense" ? "pengeluaran" : "pemasukan"}`
          }
          action={
            activeFilter === "all"
              ? { label: "Tambah Kategori", onPress: handleOpenCreate }
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
        onDelete={(c) => { setActionCategory(null); handleDelete(c); }}
      />

      <CategoryFormSheet
        visible={showModal}
        editingCategory={editingCategory}
        onDismiss={handleDismiss}
      />
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
