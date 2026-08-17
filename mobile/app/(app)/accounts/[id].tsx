import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CreditCard, Landmark, Pencil, Smartphone, Trash2, Wallet } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import { HeaderActions, HeaderButton } from "@/components/ui/HeaderButton";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RupiahInput from "@/components/ui/RupiahInput";
import { SkeletonList } from "@/components/ui/Skeleton";
import { accountTypeLabel } from "@/features/finance/constants";
import type { AccountType } from "@/features/finance/types";
import {
  useAccount,
  useArchiveAccount,
  useUpdateAccount,
} from "@/features/finance/hooks/useAccounts";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useToastStore } from "@/stores/toast";
import { formatMoney } from "@/lib/format";
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
  const { t } = useTranslation();
  const handleBack = useBackNavigation("/(app)/accounts");
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: account, isLoading } = useAccount(id);
  const updateAccount = useUpdateAccount(id);
  const archiveAccount = useArchiveAccount();
  const { showToast } = useToastStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState(0);

  const handleStartEdit = useCallback(() => {
    if (!account) return;
    setName(account.name);
    setInitialBalance(account.initial_balance);
    setIsEditing(true);
  }, [account]);

  const handleSaveEdit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast(t("accounts.nameRequiredToast"), "error");
      return;
    }
    try {
      await updateAccount.mutateAsync({ name: trimmed, initial_balance: initialBalance });
      setIsEditing(false);
      showToast(t("accounts.updatedToast"), "success");
    } catch {
      showToast(t("accounts.updateError"), "error");
    }
  }, [updateAccount, name, initialBalance, showToast, t]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t("accounts.deleteAlertTitle"),
      t("accounts.deleteAlertMessage", { name: account?.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await archiveAccount.mutateAsync(id);
              showToast(t("accounts.deletedToast"), "info");
              router.replace("/(app)/accounts");
            } catch {
              showToast(t("accounts.deleteError"), "error");
            }
          },
        },
      ]
    );
  }, [account, archiveAccount, id, router, showToast, t]);

  const headerRight = !isEditing && (
    <HeaderActions>
      <HeaderButton icon={Pencil} onPress={handleStartEdit} variant="warning" />
      <HeaderButton icon={Trash2} onPress={handleDelete} variant="danger" />
    </HeaderActions>
  );

  const showSkeleton = useDelayedLoading(isLoading);
  if (showSkeleton) {
    return (
      <Screen>
        <Header title={t("accounts.detailTitle")} onBack={handleBack} />
        <View style={styles.content}>
          <SkeletonList count={1} />
        </View>
      </Screen>
    );
  }

  if (!account) {
    return (
      <Screen>
        <Header title={t("accounts.detailTitle")} onBack={handleBack} />
        <View style={styles.centered}>
          <Text style={styles.notFound}>{t("accounts.notFound")}</Text>
        </View>
      </Screen>
    );
  }

  const isCredit = account.type === "credit";
  const balanceColor = isCredit && account.balance < 0 ? colors.danger.text : colors.success.text;

  return (
    <Screen>
      <Header title={t("accounts.detailTitle")} onBack={handleBack} right={headerRight} />
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
                {accountTypeLabel(t, account.type)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.balanceLabel}>{t("accounts.balanceHeroLabel")}</Text>
          <Text style={[styles.balance, { color: balanceColor }]}>
            {formatMoney(account.balance)}
          </Text>
          <Text style={styles.currency}>{account.currency}</Text>
        </View>

        {/* Actions / Edit */}
        {isEditing && (
          <View style={styles.editCard}>
            <Input label={t("onboarding.firstAccount.nameLabel")} value={name} onChangeText={setName} autoFocus />
            <RupiahInput
              label={t("accounts.initialBalanceLabel")}
              placeholder="0"
              value={initialBalance}
              onChange={setInitialBalance}
            />
            <Text style={styles.editHint}>
              {t("accounts.editBalanceHint")}
            </Text>
            <Button
              label={t("goals.form.saveChangesCta")}
              onPress={handleSaveEdit}
              loading={updateAccount.isPending}
              fullWidth
            />
            <Button label={t("common.cancel")} onPress={() => setIsEditing(false)} variant="ghost" fullWidth />
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
  editHint: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginTop: -spacing.sm,
  },
  editCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
  },
});
