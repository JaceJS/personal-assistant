import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { colors, radius, spacing, textStyles } from "@/theme";

export interface DropdownItem {
  id: string;
  name: string;
  icon?: string;
}

interface SearchableDropdownProps {
  label?: string;
  placeholder?: string;
  items: DropdownItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  error?: string;
}

export function SearchableDropdown({
  label,
  placeholder = "Pilih item",
  items,
  selectedId,
  onSelect,
  error,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedItem = useMemo(() => {
    return items.find((item) => item.id === selectedId) ?? null;
  }, [items, selectedId]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => setIsOpen(true)}
        style={styles.triggerPressable}
        accessibilityRole="button"
      >
        {({ pressed }) => (
          <View style={[styles.triggerField, pressed && styles.pressed, !!error && styles.triggerError]}>
            <Text style={[styles.triggerText, !selectedItem && styles.triggerTextPlaceholder]}>
              {selectedItem
                ? `${selectedItem.icon ? `${selectedItem.icon}  ` : ""}${selectedItem.name}`
                : placeholder}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </View>
        )}
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <BottomSheet isVisible={isOpen} onDismiss={() => {
        setIsOpen(false);
        setSearchQuery("");
      }}>
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
                const active = item.id === selectedId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      onSelect(active ? null : item.id);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    style={styles.itemPressable}
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
  triggerPressable: {
    marginTop: 4,
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
  },
  triggerError: {
    borderColor: colors.danger.text,
  },
  pressed: {
    opacity: 0.8,
  },
  triggerText: {
    ...StyleSheet.flatten(textStyles.body),
    fontSize: 15,
    color: colors.text.primary,
  },
  triggerTextPlaceholder: {
    color: colors.text.muted,
  },
  chevron: {
    fontSize: 10,
    color: colors.text.muted,
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
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...StyleSheet.flatten(textStyles.caption),
    textAlign: "center",
    color: colors.text.muted,
    paddingVertical: spacing.xl,
  },
  itemPressable: {
    marginBottom: spacing.xs,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    gap: spacing.md,
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
});
