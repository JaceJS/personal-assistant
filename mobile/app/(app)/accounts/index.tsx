import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus, Wallet } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import { HeaderButton } from "@/components/ui/HeaderButton";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import RupiahInput from "@/components/ui/RupiahInput";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SkeletonList } from "@/components/ui/Skeleton";
import AccountCard from "@/features/finance/components/AccountCard";
import { ACCOUNT_TYPE_ORDER, accountTypeLabel } from "@/features/finance/constants";
import { useAccounts, useCreateAccount } from "@/features/finance/hooks/useAccounts";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useToastStore } from "@/stores/toast";
import type { Account } from "@/features/finance/types";
import { colors, radius, spacing, textStyles } from "@/theme";

// Module-scope Zod schemas evaluate error messages at import time (before
// i18n has a language) — factory + useMemo(() => ..., [t]) keeps them reactive.
function makeSchema(t: TFunction) {
  return z.object({
    name: z.string().min(1, t("onboarding.firstAccount.nameRequired")),
    type: z.enum(["cash", "bank", "ewallet", "credit"]),
    initial_balance: z.number().default(0),
  });
}

type FormValues = z.input<ReturnType<typeof makeSchema>>;

export default function AccountsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch } = useAccounts();
  const showSkeleton = useDelayedLoading(isLoading);
  const createAccount = useCreateAccount();
  const { showToast } = useToastStore();
  const [showModal, setShowModal] = useState(false);

  const schema = useMemo(() => makeSchema(t), [t]);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "bank", initial_balance: 0 },
  });

  const accounts = data ?? [];

  const handleBack = useBackNavigation();

  const handleOpenModal = useCallback(() => setShowModal(true), []);
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    reset();
  }, [reset]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        await createAccount.mutateAsync(values);
        handleCloseModal();
        showToast(t("accounts.createdToast"), "success");
      } catch {
        showToast(t("accounts.createError"), "error");
      }
    },
    [createAccount, handleCloseModal, showToast, t]
  );

  const renderItem = useCallback(
    ({ item }: { item: Account }) => (
      <AccountCard account={item} onPress={() => router.push(`/(app)/accounts/${item.id}`)} />
    ),
    [router]
  );

  const addButton = (
    <HeaderButton
      icon={Plus}
      onPress={handleOpenModal}
      accessibilityLabel={t("accounts.addA11y")}
    />
  );

  return (
    <Screen>
      <Header
        title={t("accounts.headerTitle")}
        onBack={handleBack}
        right={addButton}
      />

      {showSkeleton ? (
        <View style={styles.listPad}>
          <SkeletonList count={3} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Wallet}
              title={t("accounts.emptyTitle")}
              subtitle={t("accounts.emptySubtitle")}
              action={{ label: t("accounts.addActionLabel"), onPress: handleOpenModal }}
            />
          }
        />
      )}

      <BottomSheet isVisible={showModal} onDismiss={handleCloseModal}>
        <View style={styles.sheetContent}>
          <Text style={[textStyles.h2, styles.sheetTitle]}>{t("accounts.newAccountTitle")}</Text>

          <View style={styles.modalForm}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label={t("onboarding.firstAccount.nameLabel")}
                    value={value}
                    onChangeText={onChange}
                    placeholder={t("accounts.namePlaceholder")}
                    error={errors.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="initial_balance"
                render={({ field: { onChange, value } }) => (
                  <RupiahInput
                    label={t("accounts.initialBalanceLabel")}
                    placeholder="0"
                    value={value ?? 0}
                    onChange={onChange}
                    error={errors.initial_balance?.message}
                  />
                )}
              />

              <View style={styles.typeSection}>
                <Text style={[textStyles.caption, styles.typeLabel]}>{t("accounts.typeLabel")}</Text>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.typeRow}>
                      {ACCOUNT_TYPE_ORDER.map((type) => (
                        <Pressable
                          key={type}
                          onPress={() => onChange(type)}
                          style={({ pressed }) => pressed && { opacity: 0.8 }}
                        >
                          <View
                            style={[
                              styles.typePill,
                              value === type ? styles.typePillActive : styles.typePillInactive,
                            ]}
                          >
                            <Text
                              style={[
                                textStyles.caption,
                                styles.typePillLabel,
                                value === type
                                  ? styles.typePillLabelActive
                                  : styles.typePillLabelInactive,
                              ]}
                            >
                              {accountTypeLabel(t, type)}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                />
              </View>

              <Button
                label={t("accounts.createCta")}
                onPress={handleSubmit(onSubmit)}
                loading={createAccount.isPending}
                fullWidth
              />
          </View>
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },

  listPad: {
    paddingHorizontal: spacing["2xl"],
  },
  listContent: {
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
    paddingBottom: 160,
  },

  sheetContent: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  sheetTitle: {
    fontSize: 17,
  },
  modalForm: {
    gap: spacing.lg,
  },

  typeSection: {
    gap: spacing.sm,
  },
  typeLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typePill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  typePillActive: {
    backgroundColor: colors.accent.primary,
  },
  typePillInactive: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  typePillLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: "500",
  },
  typePillLabelActive: {
    color: colors.bg.canvas,
  },
  typePillLabelInactive: {
    color: colors.text.primary,
  },
});
