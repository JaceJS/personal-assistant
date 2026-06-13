import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import Button from '@/components/ui/Button';
import type { Category } from '@/features/finance/types';
import { colors, radius, spacing, textStyles } from '@/theme';

interface CategoryActionSheetProps {
  visible: boolean;
  category: Category | null;
  onDismiss: () => void;
  onEdit: (c: Category) => void;
  onArchive: (c: Category) => void;
}

function CategoryActionSheet({
  visible,
  category,
  onDismiss,
  onEdit,
  onArchive,
}: CategoryActionSheetProps) {
  if (!category) return null;

  const isSystem = category.user_id === null;
  const tint = category.color ? `${category.color}28` : `${colors.accent.primary}28`;

  return (
    <BottomSheet isVisible={visible} onDismiss={onDismiss}>
      <View style={styles.content}>
        <View style={styles.preview}>
          <View style={[styles.iconCircle, { backgroundColor: tint }]}>
            <Text style={styles.emoji}>{category.icon ?? '🏷️'}</Text>
          </View>
          <View style={styles.previewMeta}>
            <Text style={styles.name} numberOfLines={1}>
              {category.name}
            </Text>
            {isSystem && <Text style={styles.systemTag}>System</Text>}
          </View>
          {isSystem && <Lock size={14} color={colors.text.muted} />}
        </View>

        {isSystem ? (
          <Text style={styles.readOnlyNote}>System categories cannot be modified.</Text>
        ) : (
          <View style={styles.actions}>
            <Button label="Edit" variant="secondary" fullWidth onPress={() => onEdit(category)} />
            <Button
              label="Archive"
              variant="danger"
              fullWidth
              onPress={() => onArchive(category)}
            />
          </View>
        )}
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
  systemTag: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.muted,
  },
  readOnlyNote: {
    fontSize: 13,
    color: colors.text.muted,
    textAlign: 'center',
    paddingBottom: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});

export default React.memo(CategoryActionSheet);
