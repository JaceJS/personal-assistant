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
import CategoryCard from '@/features/finance/components/CategoryCard';
import { colors, radius, spacing, textStyles } from '@/theme';

interface AddSpendingLimitSheetProps {
  categories: Category[];
  isVisible: boolean;
  onDismiss: () => void;
  onSelect: (category: Category) => void;
}

function AddSpendingLimitSheet({ categories, isVisible, onDismiss, onSelect }: AddSpendingLimitSheetProps) {
  const renderItem = useCallback(({ item }: { item: Category }) => (
    <CategoryCard category={item} onPress={onSelect} />
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
            <Text style={styles.title}>Tambah Batas Pengeluaran</Text>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
              onPress={onDismiss}
            >
              <X size={16} color={colors.text.secondary} strokeWidth={1.5} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Pilih kategori buat atur batas bulanan</Text>

          {categories.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Semua kategori pengeluaran sudah punya batas.</Text>
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
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 8,
  },
  columnWrapper: { gap: 8 },
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
