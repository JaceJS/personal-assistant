import React, { useCallback } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import type { Category } from '@/features/finance/types';
import { categoryIcon } from '@/features/finance/utils/categoryIcon';
import { colors, radius, spacing, textStyles } from '@/theme';

interface AddSpendingLimitSheetProps {
  categories: Category[];
  isVisible: boolean;
  onDismiss: () => void;
  onSelect: (category: Category) => void;
}

function CategoryRow({ category, onPress }: { category: Category; onPress: () => void }) {
  const Icon = categoryIcon(category.name);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.65 }]}
    >
      <View style={styles.iconBox}>
        <Icon size={20} color={colors.text.muted} strokeWidth={1.5} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{category.name}</Text>
    </Pressable>
  );
}

const MemoRow = React.memo(CategoryRow);

function AddSpendingLimitSheet({ categories, isVisible, onDismiss, onSelect }: AddSpendingLimitSheetProps) {
  const renderItem = useCallback(({ item }: { item: Category }) => (
    <MemoRow category={item} onPress={() => onSelect(item)} />
  ), [onSelect]);

  const keyExtractor = useCallback((item: Category) => item.id, []);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Add Spending Limit</Text>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              onPress={onDismiss}
            >
              <X size={16} color={colors.text.secondary} strokeWidth={1.5} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Choose a category to set a monthly limit</Text>

          {categories.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>All expense categories already have limits set.</Text>
            </View>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    marginTop: 12,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    paddingHorizontal: spacing['2xl'],
    marginBottom: spacing.md,
  },
  list: { flexShrink: 1 },
  listContent: { paddingHorizontal: spacing['2xl'], gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
    flex: 1,
  },
  empty: {
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.muted,
    textAlign: 'center',
  },
});

export default React.memo(AddSpendingLimitSheet);
