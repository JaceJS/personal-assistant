import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Edit2, Trash2 } from "lucide-react-native";

import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SkeletonList } from "@/components/ui/Skeleton";
import { ACCOUNT_TYPE_EMOJI, ACCOUNT_TYPE_LABELS } from "@/features/finance/constants";
import { useAccount, useArchiveAccount, useUpdateAccount } from "@/features/finance/hooks/useAccounts";
import { useToastStore } from "@/stores/toast";
import { formatRupiah } from "@/lib/utils";
import { colors, radius, spacing } from "@/theme";

export default function AccountDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: account, isLoading } = useAccount(id);
  const updateAccount = useUpdateAccount(id);
  const archiveAccount = useArchiveAccount();
  const { showToast } = useToastStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");

  const handleStartEdit = useCallback(() => {
    if (!account) return;
    setName(account.name);
    setIsEditing(true);
  }, [account]);

  const handleSaveEdit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast("Account name cannot be empty", "error");
      return;
    }
    try {
      await updateAccount.mutateAsync({ name: trimmed });
      setIsEditing(false);
      showToast("Account name updated", "success");
    } catch {
      showToast("Failed to update account.", "error");
    }
  }, [updateAccount, name, showToast]);

  const handleArchive = useCallback(() => {
    Alert.alert(
      "Archive Account",
      `"${account?.name}" will be archived and hidden from your active list. Transactions will be preserved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveAccount.mutateAsync(id);
              showToast("Account archived", "info");
              router.back();
            } catch {
              showToast("Failed to archive account.", "error");
            }
          },
        },
      ],
    );
  }, [account, archiveAccount, id, router, showToast]);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <ArrowLeft size={22} color={colors.text.muted} />
          </Pressable>
          <Text style={styles.title}>Account Detail</Text>
        </View>
        <View style={styles.listPad}>
          <SkeletonList count={1} />
        </View>
      </Screen>
    );
  }

  if (!account) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.notFound}>Account not found</Text>
        </View>
      </Screen>
    );
  }

  const isCredit = account.type === "credit";
  const balanceColor =
    isCredit && account.balance < 0 ? colors.danger.text : colors.success.text;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <ArrowLeft size={22} color={colors.text.muted} />
        </Pressable>
        <Text style={styles.title}>Account Detail</Text>
        {!isEditing && (
          <Pressable
            onPress={handleStartEdit}
            style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.6 }]}
          >
            <Edit2 size={20} color={colors.accent.primary} />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Balance hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Text style={styles.emoji}>{ACCOUNT_TYPE_EMOJI[account.type] ?? "💰"}</Text>
            <View style={styles.heroInfo}>
              {isEditing ? (
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Account name"
                  autoFocus
                />
              ) : (
                <Text style={styles.accountName}>{account.name}</Text>
              )}
              <Text style={styles.accountType}>
                {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={[styles.balance, { color: balanceColor }]}>
            {formatRupiah(account.balance)}
          </Text>
          <Text style={styles.currency}>{account.currency}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isEditing ? (
            <>
              <Button
                label="Save Changes"
                onPress={handleSaveEdit}
                loading={updateAccount.isPending}
                fullWidth
              />
              <Button
                label="Cancel"
                onPress={() => setIsEditing(false)}
                variant="ghost"
                fullWidth
              />
            </>
          ) : (
            <Pressable
              onPress={handleArchive}
              disabled={archiveAccount.isPending}
              style={({ pressed }) => [
                styles.archiveBtn,
                (pressed || archiveAccount.isPending) && { opacity: 0.7 },
              ]}
            >
              <Trash2 size={18} color={colors.danger.text} />
              <Text style={styles.archiveBtnLabel}>Archive Account</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { fontSize: 15, color: colors.text.muted },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.lg,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: colors.text.primary },
  editBtn: { padding: 4 },
  listPad: { paddingHorizontal: spacing['2xl'] },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing['2xl'], paddingBottom: 32, gap: spacing.lg },

  heroCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  emoji: { fontSize: 28 },
  heroInfo: { flex: 1 },
  accountName: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  accountType: { fontSize: 13, color: colors.text.muted, marginTop: 2 },

  divider: { height: 1, backgroundColor: colors.border.subtle, marginBottom: spacing.xl },

  balanceLabel: { fontSize: 12, fontWeight: '500', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  balance: { fontSize: 32, fontWeight: '700', marginTop: 4 },
  currency: { fontSize: 12, color: colors.text.muted, marginTop: 2 },

  actions: { gap: spacing.md },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger.bg,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  archiveBtnLabel: { fontSize: 15, fontWeight: '500', color: colors.danger.text },
});
