import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import RupiahInput from '@/components/ui/RupiahInput';
import type { SavingsGoal, SavingsGoalCreate } from '@/features/finance/types';
import { colors, radius, spacing, textStyles } from '@/theme';

const QUICK_ICONS = ['🎯', '🏍', '✈️', '🏠', '💍', '📱', '🛡️', '🎓', '🚗', '💰'];

interface SavingsGoalFormSheetProps {
  isVisible: boolean;
  onDismiss: () => void;
  onSave: (data: SavingsGoalCreate) => void;
  isPending?: boolean;
  initialValues?: Pick<SavingsGoal, 'name' | 'icon' | 'target_amount' | 'target_date'>;
}

function SavingsGoalFormSheet({
  isVisible,
  onDismiss,
  onSave,
  isPending,
  initialValues,
}: SavingsGoalFormSheetProps) {
  const isEdit = !!initialValues;

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    if (isVisible) {
      setName(initialValues?.name ?? '');
      setIcon(initialValues?.icon ?? '🎯');
      setTargetAmount(initialValues?.target_amount ?? 0);
      setTargetDate(initialValues?.target_date ?? '');
    }
  }, [isVisible, initialValues]);

  const isValid = name.trim().length > 0 && targetAmount > 0;

  const handleSave = useCallback(() => {
    if (!isValid) return;
    const dateVal = targetDate.trim().match(/^\d{4}-\d{2}-\d{2}$/) ? targetDate.trim() : null;
    onSave({
      name: name.trim(),
      icon: icon || null,
      target_amount: targetAmount,
      target_date: dateVal,
    });
  }, [isValid, name, icon, targetAmount, targetDate, onSave]);

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
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss}>
          <View style={styles.backdrop} />
        </Pressable>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Text style={styles.title}>{isEdit ? 'Edit Goal' : 'Goal Baru'}</Text>
            <Pressable
              style={({ pressed }) => pressed && { opacity: 0.7 }}
              onPress={onDismiss}
            >
              <View style={styles.closeBtn}>
                <X size={16} color={colors.text.secondary} strokeWidth={1.5} />
              </View>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.fieldLabel}>Ikon</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iconRow}
            >
              {QUICK_ICONS.map((em) => (
                <Pressable
                  key={em}
                  onPress={() => setIcon(em)}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}
                >
                  <View style={[styles.iconBtn, icon === em && styles.iconBtnActive]}>
                    <Text style={styles.iconEmoji}>{em}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Input
              label="Nama Goal"
              value={name}
              onChangeText={setName}
              placeholder="DP motor, Liburan Bali…"
              autoFocus={!isEdit}
            />

            <RupiahInput
              label="Target (Rupiah)"
              value={targetAmount}
              onChange={setTargetAmount}
              placeholder="mis. 15.000.000"
            />

            <Input
              label="Target Tanggal (opsional)"
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />

            <Button
              label={isPending ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Goal'}
              onPress={handleSave}
              variant="primary"
              disabled={!isValid || isPending}
              fullWidth
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    marginTop: 12,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  title: { ...StyleSheet.flatten(textStyles.h2), color: colors.text.primary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bg.hover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flexGrow: 0 },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 32,
    gap: spacing.md,
  },
  fieldLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: -4,
  },
  iconRow: { gap: spacing.sm, paddingVertical: 4 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.subtle,
  },
  iconEmoji: { fontSize: 22 },
});

export default React.memo(SavingsGoalFormSheet);
