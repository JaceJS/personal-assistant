import { StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useBudget, useUpsertBudget } from '@/features/finance/hooks/useBudget';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatRupiah } from '@/lib/utils';
import { colors, radius } from '@/theme';
import { useState } from 'react';

const RING_RADIUS = 36;
const RING_STROKE_W = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_SIZE = (RING_RADIUS + RING_STROKE_W) * 2;
const RING_CENTER = RING_SIZE / 2;

interface MonthlyBudgetCardProps {
  totalExpense: number;
  isEditing: boolean;
  onEditingChange: (v: boolean) => void;
}

function getBudgetRingColor(pct: number): string {
  if (pct >= 1) return colors.danger.text;
  if (pct >= 0.8) return colors.warning.text;
  return colors.accent.primary;
}

export default function MonthlyBudgetCard({ totalExpense, isEditing, onEditingChange }: MonthlyBudgetCardProps) {
  const { data: budget, isLoading } = useBudget();
  const { mutate: saveBudget, isPending } = useUpsertBudget();
  const [inputValue, setInputValue] = useState('');

  function handleSave() {
    const amount = Number(inputValue.replace(/\D/g, ''));
    if (!amount) return;
    saveBudget({ monthly_limit: amount }, { onSuccess: () => onEditingChange(false) });
  }

  if (isLoading) {
    return <View style={styles.card}><SkeletonCard height={80} /></View>;
  }

  if (isEditing) {
    return (
      <View style={styles.card}>
        <Text style={styles.editLabel}>Set Monthly Budget</Text>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          keyboardType="numeric"
          placeholder="e.g. 10000000"
          placeholderTextColor={colors.text.disabled}
          autoFocus
        />
        <View style={styles.editActions}>
          <Pressable style={styles.cancelBtn} onPress={() => onEditingChange(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, isPending && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isPending}
          >
            <Text style={styles.saveText}>{isPending ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!budget) {
    return (
      <View style={styles.card}>
        <Pressable style={styles.promptRow} onPress={() => onEditingChange(true)}>
          <Text style={styles.promptText}>Set a monthly budget</Text>
          <Text style={styles.promptArrow}>→</Text>
        </Pressable>
      </View>
    );
  }

  const monthlyLimit = budget.monthly_limit;
  const pct = Math.min(totalExpense / monthlyLimit, 1);
  const remaining = Math.max(monthlyLimit - totalExpense, 0);
  const dashOffset = RING_CIRCUMFERENCE * (1 - pct);
  const ringCol = getBudgetRingColor(pct);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.budgetLabel}>TOTAL MONTHLY BUDGET</Text>
          <Text style={styles.budgetAmount}>{formatRupiah(monthlyLimit)}</Text>
        </View>
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS}
              stroke={colors.bg.elevated}
              strokeWidth={RING_STROKE_W}
              fill="none"
            />
            <Circle
              cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS}
              stroke={ringCol}
              strokeWidth={RING_STROKE_W}
              fill="none"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_CENTER}, ${RING_CENTER}`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringPct, { color: ringCol }]}>{Math.round(pct * 100)}%</Text>
          </View>
        </View>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as `${number}%`, backgroundColor: ringCol }]} />
      </View>

      <View style={styles.spentRow}>
        <View>
          <Text style={styles.rowLabel}>Spent</Text>
          <Text style={styles.rowAmount}>{formatRupiah(totalExpense)}</Text>
        </View>
        <View style={styles.remainingCol}>
          <Text style={styles.rowLabel}>Remaining</Text>
          <Text style={[styles.rowAmount, { color: colors.accent.text }]}>{formatRupiah(remaining)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
  },

  promptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  promptText: { fontSize: 14, color: colors.text.secondary },
  promptArrow: { fontSize: 16, color: colors.accent.primary },

  editLabel: { fontSize: 13, color: colors.text.muted, marginBottom: 12 },
  input: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 12,
  },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.bg.elevated, alignItems: 'center' },
  cancelText: { fontSize: 14, color: colors.text.secondary, fontWeight: '500' },
  saveBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.accent.primary, alignItems: 'center' },
  saveText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  topLeft: { flex: 1, gap: 4 },
  budgetLabel: { fontSize: 10, fontWeight: '600', color: colors.text.muted, letterSpacing: 1.1 },
  budgetAmount: { fontSize: 22, fontWeight: '800', color: colors.text.primary, letterSpacing: -0.5 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringPct: { fontSize: 13, fontWeight: '700' },

  barTrack: { height: 6, borderRadius: radius.full, backgroundColor: colors.bg.elevated, marginBottom: 12, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },

  spentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  remainingCol: { alignItems: 'flex-end' },
  rowLabel: { fontSize: 11, color: colors.text.muted, marginBottom: 2 },
  rowAmount: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
});
