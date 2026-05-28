import { StyleSheet, Text, View } from 'react-native';

import { useAccounts } from '@/features/finance/hooks/useAccounts';
import { formatRupiah } from '@/lib/utils';
import { colors } from '@/theme';

export default function AccountBalanceCard() {
  const { data } = useAccounts();
  const accounts = (data?.items ?? []).filter((a) => !a.is_archived);
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>TOTAL BALANCE</Text>
      <Text style={styles.amount}>{formatRupiah(totalBalance)}</Text>
      <Text style={styles.sub}>
        {accounts.length === 0 ? 'No accounts' : `${accounts.length} account${accounts.length > 1 ? 's' : ''}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.muted,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -1,
    marginBottom: 6,
  },
  sub: {
    fontSize: 12,
    color: colors.text.muted,
  },
});
