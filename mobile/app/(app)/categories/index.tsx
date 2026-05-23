import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Plus, Tag, X } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import { THEME } from "@/constants/theme";
import { useCategories, useCreateCategory } from "@/features/finance/hooks/useCategories";
import { useToastStore } from "@/stores/toast";
import type { Category, CategoryType } from "@/features/finance/types";

const CATEGORY_TYPES: { value: CategoryType; label: string; emoji: string }[] = [
  { value: "expense", label: "Pengeluaran", emoji: "📤" },
  { value: "income", label: "Pemasukan", emoji: "📥" },
  { value: "transfer", label: "Transfer", emoji: "🔄" },
];

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#10b981", "#06b6d4",
];

const PRESET_ICONS = ["🍔", "🚗", "🏠", "👗", "💊", "📚", "🎮", "✈️", "💼", "🎁", "⚡", "💰"];

const TYPE_FILTER_OPTIONS: { value: CategoryType | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "expense", label: "Keluar" },
  { value: "income", label: "Masuk" },
  { value: "transfer", label: "Transfer" },
];

const schema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi"),
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

  const categories = data?.items ?? [];
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
        showToast("Kategori berhasil dibuat", "success");
      } catch {
        showToast("Gagal membuat kategori. Coba lagi.", "error");
      }
    },
    [createCategory, handleCloseModal, showToast]
  );

  const renderItem = useCallback(
    ({ item }: { item: Category }) => <CategoryRow category={item} />,
    []
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: THEME.spacing.lg,
          paddingVertical: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} style={{ opacity: 1 }}>
            {({ pressed }) => (
              <ArrowLeft size={22} color={THEME.colors.muted} style={{ opacity: pressed ? 0.5 : 1 }} />
            )}
          </Pressable>
          <Text
            style={{
              fontFamily: THEME.fontFamily.bold,
              fontSize: THEME.fontSize.xl,
              color: THEME.colors.ink,
            }}
          >
            Kategori
          </Text>
        </View>
        <Pressable
          onPress={handleOpenModal}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: THEME.colors.accent,
            borderRadius: THEME.radius.md,
            paddingHorizontal: 12,
            paddingVertical: 8,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Plus size={16} color="#fff" />
          <Text
            style={{
              fontFamily: THEME.fontFamily.semibold,
              fontSize: THEME.fontSize.sm,
              color: "#fff",
            }}
          >
            Tambah
          </Text>
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: THEME.spacing.lg,
          gap: 8,
          marginBottom: 12,
        }}
      >
        {TYPE_FILTER_OPTIONS.map((opt) => {
          const isActive = activeFilter === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setActiveFilter(opt.value)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: THEME.radius.full,
                backgroundColor: isActive ? THEME.colors.accent : THEME.colors.card,
                borderWidth: 1,
                borderColor: isActive ? THEME.colors.accent : THEME.colors.border,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: THEME.fontFamily.medium,
                  fontSize: THEME.fontSize.sm,
                  color: isActive ? "#fff" : THEME.colors.muted,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={{ paddingHorizontal: THEME.spacing.lg, gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={{
                height: 60,
                borderRadius: THEME.radius.lg,
                backgroundColor: THEME.colors.card,
                opacity: 0.5,
              }}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: THEME.spacing.lg,
            gap: 8,
            paddingBottom: 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={THEME.colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Tag}
              title="Belum ada kategori"
              subtitle="Tambah kategori untuk mengorganisir transaksimu"
              action={{ label: "Tambah Kategori", onPress: handleOpenModal }}
            />
          }
        />
      )}

      {/* Create category modal */}
      <Modal visible={showModal} animationType="slide" transparent statusBarTranslucent>
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: THEME.colors.overlay,
          }}
        >
          <View
            style={{
              backgroundColor: THEME.colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: THEME.spacing.lg,
              paddingBottom: 40,
            }}
          >
            {/* Modal header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontFamily: THEME.fontFamily.bold,
                  fontSize: THEME.fontSize.lg,
                  color: THEME.colors.ink,
                }}
              >
                Kategori Baru
              </Text>
              <Pressable onPress={handleCloseModal}>
                <X size={22} color={THEME.colors.muted} />
              </Pressable>
            </View>

            <View style={{ gap: 20 }}>
              {/* Name */}
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Nama Kategori"
                    value={value}
                    onChangeText={onChange}
                    placeholder="contoh: Makan, Transport, Gaji"
                    error={errors.name?.message}
                    autoFocus
                  />
                )}
              />

              {/* Type */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontFamily: THEME.fontFamily.medium,
                    fontSize: THEME.fontSize.sm,
                    color: THEME.colors.muted,
                  }}
                >
                  Tipe
                </Text>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {CATEGORY_TYPES.map((t) => {
                        const isSelected = value === t.value;
                        return (
                          <Pressable
                            key={t.value}
                            onPress={() => onChange(t.value)}
                            style={({ pressed }) => ({
                              flex: 1,
                              alignItems: "center",
                              paddingVertical: 10,
                              borderRadius: THEME.radius.md,
                              backgroundColor: isSelected
                                ? THEME.colors.accent
                                : THEME.colors.card,
                              borderWidth: 1,
                              borderColor: isSelected
                                ? THEME.colors.accent
                                : THEME.colors.border,
                              opacity: pressed ? 0.8 : 1,
                            })}
                          >
                            <Text style={{ fontSize: 16, marginBottom: 2 }}>{t.emoji}</Text>
                            <Text
                              style={{
                                fontFamily: THEME.fontFamily.medium,
                                fontSize: THEME.fontSize.xs,
                                color: isSelected ? "#fff" : THEME.colors.muted,
                              }}
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

              {/* Icon picker */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontFamily: THEME.fontFamily.medium,
                    fontSize: THEME.fontSize.sm,
                    color: THEME.colors.muted,
                  }}
                >
                  Ikon
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {PRESET_ICONS.map((icon) => {
                    const isSelected = selectedIcon === icon;
                    return (
                      <Pressable
                        key={icon}
                        onPress={() => setValue("icon", icon)}
                        style={({ pressed }) => ({
                          width: 44,
                          height: 44,
                          borderRadius: THEME.radius.md,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected
                            ? `${selectedColor ?? THEME.colors.accent}33`
                            : THEME.colors.card,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? (selectedColor ?? THEME.colors.accent)
                            : THEME.colors.border,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text style={{ fontSize: 20 }}>{icon}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Color picker */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontFamily: THEME.fontFamily.medium,
                    fontSize: THEME.fontSize.sm,
                    color: THEME.colors.muted,
                  }}
                >
                  Warna
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {PRESET_COLORS.map((color) => {
                    const isSelected = selectedColor === color;
                    return (
                      <Pressable
                        key={color}
                        onPress={() => setValue("color", color)}
                        style={({ pressed }) => ({
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: color,
                          borderWidth: isSelected ? 3 : 0,
                          borderColor: "#fff",
                          opacity: pressed ? 0.7 : 1,
                          shadowColor: isSelected ? color : "transparent",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.6,
                          shadowRadius: 4,
                          elevation: isSelected ? 4 : 0,
                        })}
                      />
                    );
                  })}
                </View>
              </View>

              {/* Submit */}
              <Button
                label="Buat Kategori"
                onPress={handleSubmit(onSubmit)}
                loading={createCategory.isPending}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const typeLabel: Record<string, string> = {
    expense: "Pengeluaran",
    income: "Pemasukan",
    transfer: "Transfer",
  };

  const isSystemCategory = category.user_id === null;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: THEME.colors.card,
        borderRadius: THEME.radius.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: THEME.colors.border,
      }}
    >
      {/* Icon circle */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: category.color ? `${category.color}22` : `${THEME.colors.accent}22`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: category.icon ? 20 : 16 }}>
          {category.icon ?? "🏷️"}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            style={{
              fontFamily: THEME.fontFamily.semibold,
              fontSize: THEME.fontSize.base,
              color: THEME.colors.ink,
            }}
          >
            {category.name}
          </Text>
          {isSystemCategory && (
            <View
              style={{
                backgroundColor: `${THEME.colors.muted}22`,
                borderRadius: THEME.radius.full,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: THEME.fontFamily.medium,
                  fontSize: 10,
                  color: THEME.colors.muted,
                }}
              >
                sistem
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{
            fontFamily: THEME.fontFamily.regular,
            fontSize: THEME.fontSize.sm,
            color: THEME.colors.muted,
            marginTop: 2,
          }}
        >
          {typeLabel[category.type] ?? category.type}
        </Text>
      </View>

      {/* Color dot */}
      {category.color && (
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: category.color,
          }}
        />
      )}
    </View>
  );
}
