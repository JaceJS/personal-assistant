import { useCallback, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus, Wallet, X } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import { SkeletonList } from "@/components/ui/Skeleton";
import AccountCard from "@/features/finance/components/AccountCard";
import { ACCOUNT_TYPES } from "@/features/finance/constants";
import { useAccounts, useCreateAccount } from "@/features/finance/hooks/useAccounts";
import { useToastStore } from "@/stores/toast";
import type { Account } from "@/features/finance/types";
import { formatRupiah } from "@/lib/utils";
import { colors, radius, spacing, textStyles } from "@/theme";

const schema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["cash", "bank", "ewallet", "credit"]),
});

type FormValues = z.infer<typeof schema>;

function TotalBalanceCard({ accounts }: { accounts: Account[] }) {
  const total = accounts
    .filter((a) => a.type !== "credit")
    .reduce((sum, a) => sum + a.balance, 0);
  const count = accounts.length;

  return (
    <View style={styles.totalCard}>
      <View style={styles.totalAccent} />
      <View style={styles.totalContent}>
        <Text style={styles.totalLabel}>TOTAL BALANCE</Text>
        <Text style={styles.totalAmount}>{formatRupiah(total)}</Text>
        <Text style={styles.totalSub}>{count} account{count !== 1 ? "s" : ""}</Text>
      </View>
    </View>
  );
}

export default function AccountsScreen() {
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useAccounts();
  const createAccount = useCreateAccount();
  const { showToast } = useToastStore();
  const [showModal, setShowModal] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "bank" },
  });

  const accounts = data?.items ?? [];

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
        showToast("Account created", "success");
      } catch {
        showToast("Failed to create account. Try again.", "error");
      }
    },
    [createAccount, handleCloseModal, showToast],
  );

  const renderItem = useCallback(
    ({ item }: { item: Account }) => (
      <AccountCard
        account={item}
        onPress={() => router.push(`/(app)/accounts/${item.id}`)}
      />
    ),
    [router],
  );

  const ListHeader =
    accounts.length > 0 ? <TotalBalanceCard accounts={accounts} /> : null;

  return (
    <Screen>
      <Header
        title="Accounts & Wallets"
        right={
          <Pressable
            onPress={handleOpenModal}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
          >
            <Plus size={16} color={colors.bg.canvas} />
            <Text style={styles.addBtnLabel}>Add</Text>
          </Pressable>
        }
      />

      {isLoading ? (
        <View style={styles.listPad}>
          <SkeletonList count={3} />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
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
              title="No accounts yet"
              subtitle="Add an account to start tracking expenses"
              action={{ label: "Add Account", onPress: handleOpenModal }}
            />
          }
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Account</Text>
              <Pressable
                onPress={handleCloseModal}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <X size={22} color={colors.text.muted} />
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Account Name"
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g. BCA, GoPay, Wallet"
                    error={errors.name?.message}
                  />
                )}
              />

              <View style={styles.typeSection}>
                <Text style={styles.typeLabel}>Account Type</Text>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.typeRow}>
                      {ACCOUNT_TYPES.map((t) => (
                        <Pressable
                          key={t.value}
                          onPress={() => onChange(t.value)}
                          style={[
                            styles.typePill,
                            value === t.value ? styles.typePillActive : styles.typePillInactive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.typePillLabel,
                              value === t.value
                                ? styles.typePillLabelActive
                                : styles.typePillLabelInactive,
                            ]}
                          >
                            {t.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                />
              </View>

              <Button
                label="Create Account"
                onPress={handleSubmit(onSubmit)}
                loading={createAccount.isPending}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnLabel: { ...StyleSheet.flatten(textStyles.h3), fontSize: 13, color: colors.bg.canvas },

  listPad: { paddingHorizontal: spacing["2xl"] },
  listContent: { paddingHorizontal: spacing["2xl"], gap: 12, paddingBottom: 160 },

  totalCard: {
    flexDirection: "row",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: "hidden",
    marginBottom: 4,
  },
  totalAccent: {
    width: 3,
    backgroundColor: colors.accent.primary,
  },
  totalContent: {
    flex: 1,
    padding: spacing.xl,
    gap: 4,
  },
  totalLabel: {
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 10,
    letterSpacing: 1,
  },
  totalAmount: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 26,
  },
  totalSub: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.secondary,
  },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing["2xl"],
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  modalTitle: { ...StyleSheet.flatten(textStyles.h2), fontSize: 17 },
  modalForm: { gap: spacing.lg },

  typeSection: { gap: spacing.sm },
  typeLabel: { ...StyleSheet.flatten(textStyles.h3), fontSize: 13, color: colors.text.muted },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typePill: { borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  typePillActive: { backgroundColor: colors.accent.primary },
  typePillInactive: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  typePillLabel: { ...StyleSheet.flatten(textStyles.h3), fontSize: 13 },
  typePillLabelActive: { color: colors.bg.canvas },
  typePillLabelInactive: { color: colors.text.primary },
});
