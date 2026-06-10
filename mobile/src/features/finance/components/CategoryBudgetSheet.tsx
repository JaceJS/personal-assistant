import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { Category } from '@/features/finance/types';
import { useUpdateCategory } from '@/features/finance/hooks/useCategories';
import { useToastStore } from '@/stores/toast';
import { colors, radius, spacing, textStyles } from '@/theme';

interface CategoryBudgetSheetProps {
  category: Category | null;
  isVisible: boolean;
  onDismiss: () => void;
}

function CategoryBudgetSheet({ category, isVisible, onDismiss }: CategoryBudgetSheetProps) {
  const [inputValue, setInputValue] = useState('');
  const updateCategory = useUpdateCategory();
  const { showToast } = useToastStore();

  useEffect(() => {
    if (isVisible && category) {
      setInputValue(category.budget_limit ? String(category.budget_limit) : '');
    }
  }, [isVisible, category]);

  const hasValidInput = Number(inputValue.replace(/\D/g, '')) > 0;

  const handleSave = useCallback(() => {
    if (!category) return;
    const amount = Number(inputValue.replace(/\D/g, ''));
    updateCategory.mutate(
      { id: category.id, data: { budget_limit: amount > 0 ? amount : null } },
      {
        onSuccess: () => {
          onDismiss();
          showToast('Budget limit saved', 'success');
        },
        onError: () => showToast('Failed to save budget limit', 'error'),
      },
    );
  }, [category, inputValue, updateCategory, onDismiss, showToast]);

  const handleClear = useCallback(() => {
    if (!category) return;
    updateCategory.mutate(
      { id: category.id, data: { budget_limit: null } },
      {
        onSuccess: () => {
          onDismiss();
          showToast('Budget limit removed', 'success');
        },
        onError: () => showToast('Failed to remove budget limit', 'error'),
      },
    );
  }, [category, updateCategory, onDismiss, showToast]);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>
                  {category?.budget_limit ? 'Edit Limit' : 'Set Limit'}
                </Text>
                <Text style={styles.subtitle}>{category?.name}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
                onPress={onDismiss}
              >
                <X size={16} color={colors.text.secondary} strokeWidth={1.5} />
              </Pressable>
            </View>

            <Input
              label="Monthly Limit (IDR)"
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="e.g. 3000000"
              autoFocus
            />

            <Button
              label={updateCategory.isPending ? 'Saving…' : 'Save Limit'}
              onPress={handleSave}
              variant="primary"
              disabled={!hasValidInput || updateCategory.isPending}
              fullWidth
            />

            {category?.budget_limit ? (
              <Button
                label="Remove Limit"
                onPress={handleClear}
                variant="ghost"
                disabled={updateCategory.isPending}
                fullWidth
              />
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
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
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  title: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
  },
  subtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bg.hover,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(CategoryBudgetSheet);
