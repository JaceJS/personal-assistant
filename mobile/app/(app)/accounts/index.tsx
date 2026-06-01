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
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import type { Account } from "@/features/finance/types";
import { colors, radius, spacing, textStyles } from "@/theme";

const schema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["cash", "bank", "ewallet", "credit"]),
});

type FormValues = z.infer<typeof schema>;

function AddAccountButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <View style={styles.addAccountBtn}>
        <Plus size={18} color={colors.accent.primary} strokeWidth={2.5} />
        <Text style={[textStyles.h3, styles.addAccountLabel]}>Add Account</Text>
      </View>
    </Pressable>
  );
}

export default function AccountsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const initial = (user?.email?.[0] ?? "U").toUpperCase();
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
    [createAccount, handleCloseModal, showToast]
  );

  const renderItem = useCallback(
    ({ item }: { item: Account }) => (
      <AccountCard account={item} onPress={() => router.push(`/(app)/accounts/${item.id}`)} />
    ),
    [router]
  );

  return (
    <Screen>
      <Header
        title="Accounts & Wallets"
        left={
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        }
      />

      <View style={styles.addBtnContainer}>
        <AddAccountButton onPress={handleOpenModal} />
      </View>

      {isLoading ? (
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
              <Text style={[textStyles.h2, styles.modalTitle]}>New Account</Text>
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
                <Text style={[textStyles.caption, styles.typeLabel]}>Account Type</Text>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.typeRow}>
                      {ACCOUNT_TYPES.map((t) => (
                        <Pressable
                          key={t.value}
                          onPress={() => onChange(t.value)}
                          style={({ pressed }) => pressed && { opacity: 0.8 }}
                        >
                          <View
                            style={[
                              styles.typePill,
                              value === t.value ? styles.typePillActive : styles.typePillInactive,
                            ]}
                          >
                            <Text
                              style={[
                                textStyles.caption,
                                styles.typePillLabel,
                                value === t.value
                                  ? styles.typePillLabelActive
                                  : styles.typePillLabelInactive,
                              ]}
                            >
                              {t.label}
                            </Text>
                          </View>
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
  list: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.subtle,
    borderWidth: 1,
    borderColor: colors.accent.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...StyleSheet.flatten(textStyles.h3),
    fontSize: 14,
    color: colors.accent.text,
  },
  listPad: {
    paddingHorizontal: spacing["2xl"],
  },
  listContent: {
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
    paddingBottom: 160,
  },

  addBtnContainer: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.md,
  },
  addAccountBtn: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.accent.border,
    paddingHorizontal: spacing["2xl"],
    paddingVertical: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addAccountLabel: {
    color: colors.accent.primary,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
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
  modalTitle: {
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
