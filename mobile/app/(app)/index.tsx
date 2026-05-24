import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Mic, TrendingDown, List } from 'lucide-react-native';

import { ConfirmCard } from '@/components/voice/ConfirmCard';
import { MicButton } from '@/components/voice/MicButton';
import { RecordingIndicator } from '@/components/voice/RecordingIndicator';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonBalanceCard, SkeletonList } from '@/components/ui/Skeleton';
import TransactionCard from '@/features/finance/components/TransactionCard';
import type { ExtractedTransaction } from '@/features/finance/api/voice';
import { uploadAudio } from '@/features/finance/api/voice';
import { useAccounts } from '@/features/finance/hooks/useAccounts';
import { useCreateTransaction, useTransactions } from '@/features/finance/hooks/useTransactions';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { formatRupiah } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useRecordingStore } from '@/stores/recording';
import { useToastStore } from '@/stores/toast';
import { colors, radius, spacing } from '@/theme';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { phase, isRecording, isProcessing, startRecording, stopRecording, reset } =
    useVoiceRecorder();
  const { setPhase, setError } = useRecordingStore();
  const { showToast } = useToastStore();

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: txData, isLoading: txLoading } = useTransactions();
  const createTransaction = useCreateTransaction();

  const [extracted, setExtracted] = useState<ExtractedTransaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const totalBalance =
    accountsData?.items.reduce((sum, acc) => sum + acc.balance, 0) ?? null;
  const recentTransactions = txData?.items.slice(0, 3) ?? [];
  const todayExpense =
    txData?.items
      .filter((t) => {
        const today = new Date();
        const d = new Date(t.occurred_at);
        return (
          t.amount < 0 &&
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        );
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0) ?? 0;

  const handlePressIn = useCallback(() => {
    if (phase !== 'idle') return;
    void startRecording();
  }, [phase, startRecording]);

  const handlePressOut = useCallback(async () => {
    if (!isRecording) return;
    const uri = await stopRecording();
    if (!uri) return;

    const firstAccountId = accountsData?.items[0]?.id ?? 'default-account-id';
    try {
      await uploadAudio(uri, firstAccountId);
      setExtracted({
        amount: -50000,
        currency: 'IDR',
        merchant: 'Warung Makan',
        category_name: 'Food & Drink',
        note: 'makan siang',
        confidence: 0.92,
      });
      setPhase('idle');
    } catch {
      setError('Failed to upload recording. Try again.');
    }
  }, [isRecording, stopRecording, setPhase, setError, accountsData]);

  const handleSave = useCallback(
    async (data: ExtractedTransaction) => {
      const accountId = accountsData?.items[0]?.id;
      if (!accountId) {
        Alert.alert('Error', 'No account found. Create an account first.');
        return;
      }
      setIsSaving(true);
      try {
        await createTransaction.mutateAsync({
          account_id: accountId,
          amount: data.amount,
          currency: data.currency,
          merchant: data.merchant ?? null,
          note: data.note ?? null,
          occurred_at: new Date().toISOString(),
        });
        setExtracted(null);
        reset();
        showToast('Transaction saved', 'success');
      } catch {
        showToast('Failed to save transaction. Try again.', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [accountsData, createTransaction, reset, showToast],
  );

  const handleDismiss = useCallback(() => {
    setExtracted(null);
    reset();
  }, [reset]);

  const firstName = user?.email?.split('@')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!isRecording}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {firstName}
          </Text>
          <Text style={styles.date}>{formatDate(new Date())}</Text>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statLabel}>Today's spend</Text>
            {txLoading ? (
              <View style={styles.statSkeleton} />
            ) : (
              <Text style={styles.statValue}>{formatRupiah(todayExpense)}</Text>
            )}
          </View>
          <View style={[styles.statCard, { flex: 1 }]}>
            <Text style={styles.statLabel}>Transactions</Text>
            {txLoading ? (
              <View style={styles.statSkeleton} />
            ) : (
              <Text style={styles.statValue}>{txData?.items.length ?? 0}</Text>
            )}
          </View>
        </View>

        {/* Voice recorder section */}
        <View style={styles.voiceSection}>
          <RecordingIndicator isRecording={isRecording} />
          <MicButton
            isRecording={isRecording}
            isProcessing={isProcessing}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          />
          {phase === 'error' ? (
            <Text style={styles.errorText}>{useRecordingStore.getState().errorMessage}</Text>
          ) : null}
        </View>

        {/* Recent transactions */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <Pressable
              onPress={() => router.push('/(app)/transactions/index')}
              style={styles.seeAll}
            >
              <Text style={styles.seeAllLabel}>See all</Text>
              <ArrowRight size={14} color={colors.accent.primary} />
            </Pressable>
          </View>

          {txLoading ? (
            <SkeletonList count={3} />
          ) : recentTransactions.length === 0 ? (
            <EmptyState
              icon={List}
              title="No transactions yet"
              subtitle='Try saying: "Add expense 50k for lunch"'
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

      <ConfirmCard
        data={extracted}
        isVisible={extracted !== null}
        isSaving={isSaving}
        onSave={handleSave}
        onDismiss={handleDismiss}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },

  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  greeting: { fontSize: 12, fontWeight: '400', color: colors.text.muted, marginBottom: 2 },
  name: { fontSize: 24, fontWeight: '600', letterSpacing: -0.3, color: colors.text.primary },
  date: { fontSize: 12, fontWeight: '400', color: colors.text.muted, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginTop: 16 },
  statCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: 6,
  },
  statLabel: { fontSize: 11, fontWeight: '500', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  statSkeleton: { height: 18, width: 80, borderRadius: radius.sm, backgroundColor: colors.bg.elevated },

  voiceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger.text,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  recentSection: { paddingHorizontal: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '500', color: colors.text.primary },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllLabel: { fontSize: 13, color: colors.accent.primary },
  txList: { gap: 8 },
});
