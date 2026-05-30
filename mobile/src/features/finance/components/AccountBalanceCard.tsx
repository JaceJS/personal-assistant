import { StyleSheet, Text, View } from 'react-native';

import { useAccounts } from '@/features/finance/hooks/useAccounts';
import { formatRupiah } from '@/lib/utils';
import { colors, textStyles } from '@/theme';

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
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    color: colors.text.muted,
    marginBottom: 8,
  },
  amount: {
    ...StyleSheet.flatten(textStyles.display),
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.text.primary,
    marginBottom: 6,
  },
  sub: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
});
