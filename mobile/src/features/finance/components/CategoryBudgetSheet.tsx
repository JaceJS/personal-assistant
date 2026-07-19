import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import RupiahInput from '@/components/ui/RupiahInput';
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
  const { t } = useTranslation();
  const [amount, setAmount] = useState(0);
  const [isFixed, setIsFixed] = useState(false);
  const updateCategory = useUpdateCategory();
  const { showToast } = useToastStore();

  useEffect(() => {
    if (isVisible && category) {
      setAmount(category.budget_limit ?? 0);
      setIsFixed(category.is_fixed);
    }
  }, [isVisible, category]);

  const hasValidInput = amount > 0;

  const handleSave = useCallback(() => {
    if (!category) return;
    updateCategory.mutate(
      {
        id: category.id,
        data: {
          budget_limit: amount > 0 ? amount : null,
          is_fixed: isFixed,
        },
      },
      {
        onSuccess: () => {
          onDismiss();
          showToast(t('budget.category.savedToast'), 'success');
        },
        onError: () => showToast(t('budget.category.saveError'), 'error'),
      },
    );
  }, [category, amount, isFixed, updateCategory, onDismiss, showToast, t]);

  const handleClear = useCallback(() => {
    if (!category) return;
    updateCategory.mutate(
      { id: category.id, data: { budget_limit: null, is_fixed: false } },
      {
        onSuccess: () => {
          onDismiss();
          showToast(t('budget.category.deletedToast'), 'success');
        },
        onError: () => showToast(t('budget.category.deleteError'), 'error'),
      },
    );
  }, [category, updateCategory, onDismiss, showToast, t]);

  const inputLabel = isFixed ? t('budget.category.monthlyAmountFixedLabel') : t('budget.category.monthlyLimitLabel');
  const saveDisabled = (isFixed && !hasValidInput) || updateCategory.isPending;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>
                  {category?.budget_limit ? t('budget.category.editTitle') : t('budget.category.setTitle')}
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

            <RupiahInput
              label={inputLabel}
              value={amount}
              onChange={setAmount}
              placeholder={t('budget.category.amountPlaceholder')}
              autoFocus
            />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>{t('budget.category.fixedExpenseLabel')}</Text>
                <Text style={styles.switchDesc}>{t('budget.category.fixedExpenseDesc')}</Text>
              </View>
              <Switch
                value={isFixed}
                onValueChange={setIsFixed}
                trackColor={{ true: colors.accent.primary, false: colors.bg.hover }}
                thumbColor={colors.text.primary}
              />
            </View>

            <Button
              label={updateCategory.isPending ? t('budget.savingEllipsis') : t('budget.category.saveLimitCta')}
              onPress={handleSave}
              variant="primary"
              disabled={saveDisabled}
              fullWidth
            />

            {!isFixed && category?.budget_limit ? (
              <Button
                label={t('budget.category.deleteLimitCta')}
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  switchInfo: { flex: 1, gap: 3 },
  switchLabel: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
  switchDesc: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
});

export default React.memo(CategoryBudgetSheet);
