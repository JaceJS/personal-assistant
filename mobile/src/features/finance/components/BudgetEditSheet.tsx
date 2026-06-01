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
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isVisible) {
      setInputValue(initialValue ? String(initialValue) : '');
    }
  }, [isVisible, initialValue]);

  const hasValidInput = Number(inputValue.replace(/\D/g, '')) > 0;

  const handleSave = useCallback(() => {
    const amount = Number(inputValue.replace(/\D/g, ''));
    if (amount > 0) onSave(amount);
  }, [inputValue, onSave]);

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
                {isUpdate ? 'Update Budget' : 'Set Monthly Budget'}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
                onPress={onDismiss}
              >
                <X size={16} color={colors.text.secondary} strokeWidth={1.5} />
              </Pressable>
            </View>

            <Input
              label="Amount in Rupiah (IDR)"
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="e.g. 10000000"
              autoFocus
            />

            <Button
              label={isPending ? 'Saving…' : 'Save Budget'}
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
