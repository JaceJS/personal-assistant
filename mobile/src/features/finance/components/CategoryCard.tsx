import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';

import type { Category } from '@/features/finance/types';
import { colors, radius, spacing } from '@/theme';

interface CategoryCardProps {
  category: Category;
  onEdit: (c: Category) => void;
  onArchive: (c: Category) => void;
}

function CategoryCard({ category, onEdit, onArchive }: CategoryCardProps) {
  const isSystem = category.user_id === null;
  const tint = category.color ? `${category.color}28` : `${colors.accent.primary}28`;

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => !isSystem && onEdit(category)}
        onLongPress={() => !isSystem && onArchive(category)}
        style={({ pressed }) => pressed && !isSystem && { opacity: 0.7 }}
      >
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: tint }]}>
            <Text style={styles.emoji}>{category.icon ?? '🏷️'}</Text>
            {isSystem && (
              <View style={styles.lockOverlay}>
                <Lock size={9} color={colors.text.muted} strokeWidth={2} />
              </View>
            )}
          </View>

          <Text style={styles.cardName} numberOfLines={1}>
            {category.name}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  card: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
  },
  lockOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  cardName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 15,
  },
});

export default React.memo(CategoryCard);
