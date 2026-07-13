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
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import RupiahInput from '@/components/ui/RupiahInput';
import { colors, radius, spacing, textStyles } from '@/theme';

interface BudgetEditSheetProps {
  isVisible: boolean;
  onDismiss: () => void;
  onSave: (amount: number) => void;
  initialValue?: number;
  isPending?: boolean;
  isUpdate?: boolean;
}

function BudgetEditSheet({
  isVisible,
  onDismiss,
  onSave,
  initialValue,
  isPending,
  isUpdate,
}: BudgetEditSheetProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setAmount(initialValue ?? 0);
    }
  }, [isVisible, initialValue]);

  const hasValidInput = amount > 0;

  const handleSave = useCallback(() => {
    if (amount > 0) onSave(amount);
  }, [amount, onSave]);

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
              <Text style={styles.title}>
                {isUpdate ? t('budget.editTitle') : t('budget.setMonthlyTitle')}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
                onPress={onDismiss}
              >
                <X size={16} color={colors.text.secondary} strokeWidth={1.5} />
              </Pressable>
            </View>

            <RupiahInput
              label={t('transaction.amountLabel')}
              value={amount}
              onChange={setAmount}
              placeholder={t('budget.amountPlaceholder')}
              autoFocus
            />

            <Button
              label={isPending ? t('budget.savingEllipsis') : t('budget.saveCta')}
              onPress={handleSave}
              variant="primary"
              disabled={!hasValidInput || isPending}
              fullWidth
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
});

export default React.memo(BudgetEditSheet);
