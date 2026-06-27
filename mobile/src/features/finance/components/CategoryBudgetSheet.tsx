import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
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
  const [isFixed, setIsFixed] = useState(false);
  const updateCategory = useUpdateCategory();
  const { showToast } = useToastStore();

  useEffect(() => {
    if (isVisible && category) {
      setInputValue(category.budget_limit ? String(category.budget_limit) : '');
      setIsFixed(category.is_fixed);
    }
  }, [isVisible, category]);

  const hasValidInput = Number(inputValue.replace(/\D/g, '')) > 0;

  const handleSave = useCallback(() => {
    if (!category) return;
    const amount = Number(inputValue.replace(/\D/g, ''));
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
          showToast('Batas pengeluaran disimpan', 'success');
        },
        onError: () => showToast('Gagal simpan batas pengeluaran', 'error'),
      },
    );
  }, [category, inputValue, isFixed, updateCategory, onDismiss, showToast]);

  const handleClear = useCallback(() => {
    if (!category) return;
    updateCategory.mutate(
      { id: category.id, data: { budget_limit: null, is_fixed: false } },
      {
        onSuccess: () => {
          onDismiss();
          showToast('Batas pengeluaran dihapus', 'success');
        },
        onError: () => showToast('Gagal hapus batas pengeluaran', 'error'),
      },
    );
  }, [category, updateCategory, onDismiss, showToast]);

  const inputLabel = isFixed ? 'Jumlah Bulanan (IDR)' : 'Batas Bulanan (IDR)';
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onDismiss} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>
                  {category?.budget_limit ? 'Ubah Batas' : 'Atur Batas'}
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
              label={inputLabel}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="mis. 3.000.000"
              autoFocus
            />

            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Pengeluaran tetap</Text>
                <Text style={styles.switchDesc}>Biaya tetap — sewa, langganan, tagihan rutin</Text>
              </View>
              <Switch
                value={isFixed}
                onValueChange={setIsFixed}
                trackColor={{ true: colors.accent.primary, false: colors.bg.hover }}
                thumbColor={colors.text.primary}
              />
            </View>

            <Button
              label={updateCategory.isPending ? 'Simpan…' : 'Simpan Batas'}
              onPress={handleSave}
              variant="primary"
              disabled={saveDisabled}
              fullWidth
            />

            {!isFixed && category?.budget_limit ? (
              <Button
                label="Hapus Batas"
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
