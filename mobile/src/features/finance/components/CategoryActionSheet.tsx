import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import type { Category } from '@/features/finance/types';
import { colors, radius, spacing, textStyles } from '@/theme';

interface CategoryActionSheetProps {
  visible: boolean;
  category: Category | null;
  onDismiss: () => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}

function CategoryActionSheet({
  visible,
  category,
  onDismiss,
  onEdit,
  onDelete,
}: CategoryActionSheetProps) {
  const tint = category?.color ? `${category.color}28` : `${colors.accent.primary}28`;

  return (
    <BottomSheet isVisible={visible} onDismiss={onDismiss}>
      <View style={styles.content}>
        <View style={styles.preview}>
          <View style={[styles.iconCircle, { backgroundColor: tint }]}>
            <Text style={styles.emoji}>{category?.icon ?? '🏷️'}</Text>
          </View>
          <View style={styles.previewMeta}>
            <Text style={styles.name} numberOfLines={1}>
              {category?.name ?? ''}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button label="Ubah" variant="secondary" fullWidth onPress={() => category && onEdit(category)} />
          <Button
            label="Hapus"
            variant="danger"
            fullWidth
            onPress={() => category && onDelete(category)}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  previewMeta: { flex: 1, gap: 2 },
  name: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  actions: {
    gap: spacing.sm,
  },
});

export default React.memo(CategoryActionSheet);
