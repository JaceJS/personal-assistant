import { useCallback, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft, Plus, Wallet, X } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Screen } from "@/components/layout/Screen";
import { Header } from "@/components/layout/Header";
import { HeaderButton } from "@/components/ui/HeaderButton";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import RupiahInput from "@/components/ui/RupiahInput";
import { SkeletonList } from "@/components/ui/Skeleton";
import AccountCard from "@/features/finance/components/AccountCard";
import { ACCOUNT_TYPES } from "@/features/finance/constants";
import { useAccounts, useCreateAccount } from "@/features/finance/hooks/useAccounts";
import { useToastStore } from "@/stores/toast";
import type { Account } from "@/features/finance/types";
import { colors, radius, spacing, textStyles } from "@/theme";

const schema = z.object({
  name: z.string().min(1, "Nama akun wajib diisi"),
  type: z.enum(["cash", "bank", "ewallet", "credit"]),
  initial_balance: z.number().optional().default(0),
});

type FormValues = z.infer<typeof schema>;

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
    defaultValues: { name: "", type: "bank", initial_balance: 0 },
  });

  const accounts = data ?? [];

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
        showToast("Akun berhasil dibuat", "success");
      } catch {
        showToast("Gagal membuat akun. Coba lagi.", "error");
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

  const backButton = (
    <HeaderButton
      icon={ChevronLeft}
      onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/settings"))}
      color={colors.text.muted}
      iconSize={22}
    />
  );

  const addButton = (
    <HeaderButton
      icon={Plus}
      onPress={handleOpenModal}
      accessibilityLabel="Add account"
    />
  );

  return (
    <Screen>
      <Header title="Akun" left={backButton} right={addButton} />

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
              title="Belum ada akun"
              subtitle="Tambah akun untuk mulai mencatat pengeluaran"
              action={{ label: "Tambah Akun", onPress: handleOpenModal }}
            />
          }
        />
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={[textStyles.h2, styles.modalTitle]}>Akun Baru</Text>
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
                    label="Nama Akun"
                    value={value}
                    onChangeText={onChange}
                    placeholder="contoh: BCA, GoPay, Dompet"
                    error={errors.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="initial_balance"
                render={({ field: { onChange, value } }) => (
                  <RupiahInput
                    label="Saldo Awal"
                    placeholder="0"
                    value={value}
                    onChange={onChange}
                    error={errors.initial_balance?.message}
                  />
                )}
              />

              <View style={styles.typeSection}>
                <Text style={[textStyles.caption, styles.typeLabel]}>Jenis Akun</Text>
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
                label="Buat Akun"
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

  listPad: {
    paddingHorizontal: spacing["2xl"],
  },
  listContent: {
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
    paddingBottom: 160,
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
