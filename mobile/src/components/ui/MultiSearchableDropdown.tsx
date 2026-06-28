import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import Button from "./Button";
import { colors, radius, spacing, textStyles } from "@/theme";

export interface DropdownItem {
  id: string;
  name: string;
  icon?: string;
}

interface MultiSearchableDropdownProps {
  label?: string;
  placeholder?: string;
  items: DropdownItem[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  error?: string;
}

export function MultiSearchableDropdown({
  label,
  placeholder = "Pilih item",
  items,
  selectedIds,
  onSelect,
  error,
}: MultiSearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  const triggerLabel = useMemo(() => {
    if (selectedItems.length === 0) return placeholder;
    if (selectedItems.length === 1) {
      const item = selectedItems[0];
      return `${item.icon ? `${item.icon}  ` : ""}${item.name}`;
    }
    return `${selectedItems.length} Kategori terpilih`;
  }, [selectedItems, placeholder]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const handleToggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((x) => x !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => pressed && { opacity: 0.8 }}
        accessibilityRole="button"
      >
        <View style={[styles.triggerField, !!error && styles.triggerError]}>
          <Text
            style={[
              styles.triggerText,
              selectedItems.length === 0 && styles.triggerTextPlaceholder,
            ]}
            numberOfLines={1}
          >
            {triggerLabel}
          </Text>
          <Text style={styles.chevron}>▼</Text>
        </View>
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <BottomSheet
        isVisible={isOpen}
        onDismiss={() => {
          setIsOpen(false);
          setSearchQuery("");
        }}
      >
        <View style={styles.sheetContent}>
          {label && <Text style={styles.sheetTitle}>Pilih {label}</Text>}

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Cari..."
              placeholderTextColor={colors.text.muted}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {filteredItems.length === 0 ? (
              <Text style={styles.emptyText}>Tidak ada pilihan ditemukan</Text>
            ) : (
              filteredItems.map((item) => {
                const active = selectedIds.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleToggleItem(item.id)}
                    style={({ pressed }) => pressed && { opacity: 0.8 }}
                  >
                    <View style={[styles.itemCard, active && styles.itemCardActive]}>
                      {item.icon && <Text style={styles.itemEmoji}>{item.icon}</Text>}
                      <Text style={[styles.itemName, active && styles.itemNameActive]}>
                        {item.name}
                      </Text>
                      {active && <Text style={styles.checkIcon}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="Selesai"
              onPress={() => {
                setIsOpen(false);
                setSearchQuery("");
              }}
              fullWidth
            />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    color: colors.text.muted,
  },
  triggerField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.lg,
    height: 48,
    marginTop: 4,
  },
  triggerError: {
    borderColor: colors.danger.text,
  },
  triggerText: {
    ...StyleSheet.flatten(textStyles.body),
    fontSize: 15,
    color: colors.text.primary,
    flex: 1,
  },
  triggerTextPlaceholder: {
    color: colors.text.muted,
  },
  chevron: {
    fontSize: 10,
    color: colors.text.muted,
    marginLeft: spacing.sm,
  },
  errorText: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.danger.text,
    marginTop: 2,
  },

  sheetContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.xs,
    gap: spacing.md,
    maxHeight: 400,
  },
  sheetTitle: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  searchContainer: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    height: 44,
    justifyContent: "center",
  },
  searchInput: {
    ...StyleSheet.flatten(textStyles.body),
    fontSize: 14,
    color: colors.text.primary,
  },
  list: {
    marginTop: spacing.sm,
    maxHeight: 220,
  },
  emptyText: {
    ...StyleSheet.flatten(textStyles.caption),
    textAlign: "center",
    color: colors.text.muted,
    paddingVertical: spacing.xl,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  itemCardActive: {
    backgroundColor: colors.accent.subtle,
    borderColor: colors.accent.border,
    borderWidth: 1,
  },
  itemEmoji: {
    fontSize: 18,
  },
  itemName: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
    flex: 1,
  },
  itemNameActive: {
    color: colors.accent.text,
    fontWeight: "600",
  },
  checkIcon: {
    fontSize: 14,
    color: colors.accent.text,
    fontWeight: "bold",
  },
  footer: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
});
