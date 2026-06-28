import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CreditCard, Landmark, Pencil, Smartphone, Trash2, Wallet } from "lucide-react-native";

import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import { HeaderActions, HeaderButton } from "@/components/ui/HeaderButton";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SkeletonList } from "@/components/ui/Skeleton";
import { ACCOUNT_TYPE_LABELS } from "@/features/finance/constants";
import type { AccountType } from "@/features/finance/types";
import {
  useAccount,
  useArchiveAccount,
  useUpdateAccount,
} from "@/features/finance/hooks/useAccounts";
import { useToastStore } from "@/stores/toast";
import { formatRupiah } from "@/lib/utils";
import { colors, radius, spacing, textStyles } from "@/theme";

function TypeIcon({ type }: { type: AccountType }) {
  const props = { size: 22, color: colors.accent.text };
  switch (type) {
    case "bank":
      return <Landmark {...props} />;
    case "cash":
      return <Wallet {...props} />;
    case "ewallet":
      return <Smartphone {...props} />;
    case "credit":
      return <CreditCard {...props} />;
  }
}

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

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Account",
      `"${account?.name}" will be permanently deleted. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveAccount.mutateAsync(id);
              showToast("Account deleted", "info");
              router.replace("/(app)/accounts");
            } catch {
              showToast("Failed to delete account.", "error");
            }
          },
        },
      ]
    );
  }, [account, archiveAccount, id, router, showToast]);

  const headerRight = !isEditing && (
    <HeaderActions>
      <HeaderButton icon={Pencil} onPress={handleStartEdit} variant="warning" />
      <HeaderButton icon={Trash2} onPress={handleDelete} variant="danger" />
    </HeaderActions>
  );

  if (isLoading) {
    return (
      <Screen>
        <Header title="Detail Akun" onBack={() => router.replace("/(app)/accounts")} />
        <View style={styles.content}>
          <SkeletonList count={1} />
        </View>
      </Screen>
    );
  }

  if (!account) {
    return (
      <Screen>
        <Header title="Detail Akun" onBack={() => router.replace("/(app)/accounts")} />
        <View style={styles.centered}>
          <Text style={styles.notFound}>Akun tidak ditemukan</Text>
        </View>
      </Screen>
    );
  }

  const isCredit = account.type === "credit";
  const balanceColor = isCredit && account.balance < 0 ? colors.danger.text : colors.success.text;

  return (
    <Screen>
      <Header title="Detail Akun" onBack={() => router.replace("/(app)/accounts")} right={headerRight} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.typeIconBox}>
              <TypeIcon type={account.type} />
            </View>
            <View style={styles.accountIdentity}>
              <Text style={styles.accountName}>{account.name.toUpperCase()}</Text>
              <Text style={styles.accountType}>
                {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.balanceLabel}>BALANCE</Text>
          <Text style={[styles.balance, { color: balanceColor }]}>
            {formatRupiah(account.balance)}
          </Text>
          <Text style={styles.currency}>{account.currency}</Text>
        </View>

        {/* Actions / Edit */}
        {isEditing && (
          <View style={styles.editCard}>
            <Input label="Account Name" value={name} onChangeText={setName} autoFocus />
            <Button
              label="Save Changes"
              onPress={handleSaveEdit}
              loading={updateAccount.isPending}
              fullWidth
            />
            <Button label="Cancel" onPress={() => setIsEditing(false)} variant="ghost" fullWidth />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFound: { ...StyleSheet.flatten(textStyles.body), color: colors.text.muted },

  scroll: { flex: 1 },
  content: { padding: spacing["2xl"], gap: spacing.lg, paddingBottom: 60 },

  heroCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.lg,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  typeIconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    borderWidth: 1,
    borderColor: colors.accent.border,
    alignItems: "center",
    justifyContent: "center",
  },
  accountIdentity: { flex: 1 },
  accountName: { ...StyleSheet.flatten(textStyles.h2), letterSpacing: 0.5 },
  accountType: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.accent.text,
    marginTop: 2,
  },

  divider: { height: 1, backgroundColor: colors.border.default },

  balanceLabel: { ...StyleSheet.flatten(textStyles.overline), color: colors.text.muted },
  balance: { ...StyleSheet.flatten(textStyles.display), fontSize: 36, letterSpacing: -0.5 },
  currency: { ...StyleSheet.flatten(textStyles.caption), color: colors.text.muted, marginTop: 2 },

  actionsSection: { gap: spacing.md },
  editCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
  },
});
