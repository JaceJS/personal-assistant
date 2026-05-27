import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Clock, List, Lock, MapPin } from 'lucide-react-native';
import { CartesianChart, Line } from 'victory-native';

import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import TransactionCard from '@/features/finance/components/TransactionCard';
import { useTransactions } from '@/features/finance/hooks/useTransactions';
import { formatRupiah } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { colors, radius } from '@/theme';

type Period = 'W' | 'M';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<Period>('M');
  const { data: txData, isLoading: txLoading } = useTransactions();

  const firstName = user?.email?.split('@')[0] ?? 'there';
  const items = txData?.items ?? [];
  const recentTransactions = items.slice(0, 3);

  const now = new Date();

  const chartData = [0, 1, 2, 3].map((week) => ({
    x: week + 1,
    y: items
      .filter((tx) => {
        if (tx.amount >= 0) return false;
        const day = new Date(tx.occurred_at).getDate();
        return Math.min(Math.floor((day - 1) / 7), 3) === week;
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
  }));

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());

  const periodSpend = items
    .filter((tx) => {
      if (tx.amount >= 0) return false;
      const d = new Date(tx.occurred_at);
      if (period === 'W') return d >= weekStart;
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const hasChartData = chartData.some((d) => d.y > 0);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0]?.toUpperCase() ?? 'U'}</Text>
          </View>
          <Bell size={22} color={colors.text.secondary} strokeWidth={1.5} />
        </View>

        <Text style={styles.greeting}>
          {getGreeting()}, {firstName}.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.insightList}
          style={styles.insightScroll}
        >
          <View style={[styles.insightCard, styles.insightCardAccent]}>
            <Text style={styles.insightTitle}>✦ Optimization</Text>
            <Text style={styles.insightBody}>
              Subscription optimization active: saving {formatRupiah(124500)} this month.
            </Text>
          </View>
          <View style={[styles.insightCard, styles.insightCardDefault]}>
            <Text style={styles.insightTitleDefault}>Savings Goal</Text>
            <Text style={styles.insightBodyDefault}>On track for your monthly savings target.</Text>
          </View>
        </ScrollView>

        <View style={styles.card}>
          <View style={styles.spendHeader}>
            <Text style={styles.sectionLabel}>MONTHLY SPEND</Text>
            <View style={styles.periodToggle}>
              {(['W', 'M'] as Period[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[styles.periodChip, period === p && styles.periodChipActive]}
                >
                  <Text style={[styles.periodChipText, period === p && styles.periodChipTextActive]}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={styles.spendAmount}>{formatRupiah(periodSpend)}</Text>
          <View style={styles.chartWrap}>
            {hasChartData ? (
              <CartesianChart data={chartData} xKey="x" yKeys={['y']}>
                {({ points }) => (
                  <Line
                    points={points.y}
                    color={colors.accent.primary}
                    strokeWidth={2.5}
                    curveType="natural"
                  />
                )}
              </CartesianChart>
            ) : (
              <View style={styles.chartPlaceholder} />
            )}
          </View>
          <View style={styles.chartLabels}>
            {['W1', 'W2', 'W3', 'W4'].map((w) => (
              <Text key={w} style={styles.chartLabel}>
                {w}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>EVENTS</Text>
          <Text style={styles.cardHeading}>Next Up</Text>
          <View style={styles.eventItem}>
            <View style={styles.eventDot} />
            <View style={styles.eventDetails}>
              <Text style={styles.eventTitle}>Product Roadmap</Text>
              <View style={styles.eventMeta}>
                <Clock size={12} color={colors.text.muted} strokeWidth={1.5} />
                <Text style={styles.eventMetaText}>14:00 – 15:30</Text>
              </View>
              <View style={styles.eventMeta}>
                <MapPin size={12} color={colors.text.muted} strokeWidth={1.5} />
                <Text style={styles.eventMetaText}>Conference Room B</Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.outlineBtn}>
            <Text style={styles.outlineBtnText}>View Calendar</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>JOURNALING</Text>
          <Text style={styles.cardHeading}>Reflections</Text>
          <View style={styles.journalItem}>
            <Text style={styles.journalTitle}>Daily Gratitude</Text>
            <Text style={styles.journalQuote}>"Found focus in the morning quiet..."</Text>
            <View style={styles.journalMeta}>
              <Text style={styles.journalDate}>Oct 24, 2023</Text>
              <View style={styles.journalPrivate}>
                <Lock size={11} color={colors.text.muted} strokeWidth={1.5} />
                <Text style={styles.eventMetaText}>Private</Text>
              </View>
            </View>
          </View>
          <Pressable style={styles.outlineBtn} onPress={() => router.push('/(app)/journal')}>
            <Text style={styles.outlineBtnText}>Open Journal</Text>
          </Pressable>
        </View>

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Pressable onPress={() => router.push('/(app)/transactions')}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          {txLoading ? (
            <SkeletonList count={3} />
          ) : recentTransactions.length === 0 ? (
            <EmptyState
              icon={List}
              title="No transactions yet"
              subtitle="Start tracking your spending"
            />
          ) : (
            <View style={styles.txList}>
              {recentTransactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onPress={() => router.push(`/(app)/transactions/${tx.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.subtle,
    borderWidth: 1,
    borderColor: colors.accent.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: colors.accent.text },

  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text.primary,
    paddingHorizontal: 20,
    marginBottom: 20,
    letterSpacing: -0.5,
  },

  insightScroll: { marginBottom: 16 },
  insightList: { paddingHorizontal: 20, gap: 12 },
  insightCard: {
    width: 220,
    padding: 16,
    borderRadius: radius.lg,
    gap: 6,
  },
  insightCardAccent: {
    backgroundColor: colors.accent.subtle,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
  insightCardDefault: {
    backgroundColor: colors.bg.surface,
  },
  insightTitle: { fontSize: 13, fontWeight: '600', color: colors.accent.text },
  insightBody: { fontSize: 12, color: colors.accent.text, lineHeight: 17, opacity: 0.8 },
  insightTitleDefault: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  insightBodyDefault: { fontSize: 12, color: colors.text.muted, lineHeight: 17 },

  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
  },

  spendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  periodToggle: { flexDirection: 'row', gap: 4 },
  periodChip: {
    width: 28,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodChipActive: { backgroundColor: colors.bg.hover },
  periodChipText: { fontSize: 11, fontWeight: '500', color: colors.text.muted },
  periodChipTextActive: { color: colors.text.primary },

  spendAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  chartWrap: { height: 120, marginBottom: 8 },
  chartPlaceholder: { height: 120 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  chartLabel: { fontSize: 11, color: colors.text.muted },

  cardHeading: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 4,
    marginBottom: 12,
  },

  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8A832',
    marginTop: 4,
  },
  eventDetails: { flex: 1, gap: 4 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventMetaText: { fontSize: 12, color: colors.text.muted },

  journalItem: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  journalTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  journalQuote: { fontSize: 13, color: colors.text.secondary, fontStyle: 'italic' },
  journalMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  journalDate: { fontSize: 11, color: colors.text.muted },
  journalPrivate: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  outlineBtn: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '500', color: colors.text.primary },

  recentSection: { paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  seeAll: { fontSize: 13, color: colors.accent.primary },
  txList: { gap: 8 },
});
