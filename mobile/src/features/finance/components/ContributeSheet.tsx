import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import RupiahInput from '@/components/ui/RupiahInput';
import { formatMoney } from '@/lib/format';
import { colors, radius, spacing, textStyles } from '@/theme';

const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000];

interface ContributeSheetProps {
  isVisible: boolean;
  onDismiss: () => void;
  onContribute: (amount: number) => void;
  isPending?: boolean;
  goalName?: string;
}

type Mode = 'add' | 'withdraw';

function ContributeSheet({
  isVisible,
  onDismiss,
  onContribute,
  isPending,
  goalName,
}: ContributeSheetProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('add');
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setMode('add');
      setAmount(0);
    }
  }, [isVisible]);

  const isValid = amount > 0;

  const handleQuick = useCallback((amt: number) => setAmount(amt), []);

  const handleConfirm = useCallback(() => {
    if (!isValid) return;
    onContribute(mode === 'add' ? amount : -amount);
  }, [isValid, mode, amount, onContribute]);

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
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss}>
          <View style={styles.backdrop} />
        </Pressable>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{t('goals.contribute.title')}</Text>
              {goalName && <Text style={styles.subtitle} numberOfLines={1}>{goalName}</Text>}
            </View>
            <Pressable
              style={({ pressed }) => pressed && { opacity: 0.7 }}
              onPress={onDismiss}
            >
              <View style={styles.closeBtn}>
                <X size={16} color={colors.text.secondary} strokeWidth={1.5} />
              </View>
            </Pressable>
          </View>

          <View style={styles.content}>
            <View style={styles.modeRow}>
              <View style={styles.modeBtnWrapper}>
                <Pressable
                  onPress={() => setMode('add')}
                  style={({ pressed }) => [
                    styles.modeBtnPressable,
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <View style={[styles.modeBtn, mode === 'add' && styles.modeBtnActive]}>
                    <Text style={[styles.modeBtnText, mode === 'add' && styles.modeBtnTextActive]}>
                      {t('goals.contribute.addMode')}
                    </Text>
                  </View>
                </Pressable>
              </View>
              <View style={styles.modeBtnWrapper}>
                <Pressable
                  onPress={() => setMode('withdraw')}
                  style={({ pressed }) => [
                    styles.modeBtnPressable,
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <View style={[styles.modeBtn, mode === 'withdraw' && styles.modeBtnWithdrawActive]}>
                    <Text style={[styles.modeBtnText, mode === 'withdraw' && styles.modeBtnTextActive]}>
                      {t('goals.contribute.withdrawMode')}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((amt) => (
                <Pressable
                  key={amt}
                  onPress={() => handleQuick(amt)}
                  style={({ pressed }) => pressed && { opacity: 0.7 }}
                >
                  <View style={[styles.quickChip, amount === amt && styles.quickChipActive]}>
                    <Text
                      style={[
                        styles.quickChipText,
                        amount === amt && styles.quickChipTextActive,
                      ]}
                    >
                      {formatMoney(amt)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <RupiahInput
              label={t('transaction.amountLabel')}
              value={amount}
              onChange={setAmount}
              placeholder={t('goals.contribute.amountPlaceholder')}
            />

            <Button
              label={
                isPending
                  ? t('goals.savingEllipsis')
                  : mode === 'add'
                    ? t('goals.contribute.saveCta')
                    : t('goals.contribute.withdrawCta')
              }
              onPress={handleConfirm}
              variant={mode === 'withdraw' ? 'danger' : 'primary'}
              disabled={!isValid || isPending}
              fullWidth
            />
          </View>
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
    paddingBottom: 32,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  titleBlock: { flex: 1, gap: 2 },
  title: { ...StyleSheet.flatten(textStyles.h2), color: colors.text.primary },
  subtitle: { ...StyleSheet.flatten(textStyles.caption), color: colors.text.muted },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.bg.hover,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  modeBtnWrapper: {
    flex: 1,
  },
  modeBtnPressable: {
    width: '100%',
  },
  modeBtn: {
    width: '100%',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnActive: { backgroundColor: colors.accent.primary },
  modeBtnWithdrawActive: { backgroundColor: colors.danger.text },
  modeBtnText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: '600',
    color: colors.text.muted,
  },
  modeBtnTextActive: { color: '#fff' },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  quickChipActive: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.subtle,
  },
  quickChipText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: '500',
    color: colors.text.primary,
  },
  quickChipTextActive: { color: colors.accent.text },
});

export default React.memo(ContributeSheet);
