import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RupiahInput from "@/components/ui/RupiahInput";
import { SearchableDropdown } from "@/components/ui/SearchableDropdown";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { useCreateTransaction } from "@/features/finance/hooks/useTransactions";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";

const schema = z.object({
  account_id: z.string().min(1, "Pilih akun"),
  category_id: z.string().nullable().optional(),
  amount: z
    .number({ invalid_type_error: "Masukkan jumlah" })
    .min(1, "Masukkan jumlah"),
  merchant: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewTransactionScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: categoriesData } = useCategories();
  const createTransaction = useCreateTransaction();
  const { showToast } = useToastStore();

  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [showMore, setShowMore] = useState(false);

  const handleBack = useCallback(() => {
    if (from === "home") {
      router.replace("/(app)/(home)");
    } else if (from === "finance") {
      router.replace("/(app)/finance");
    } else if (from === "history") {
      router.replace("/(app)/finance/history");
    } else if (from === "activity") {
      router.replace("/(app)/history");
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(home)");
    }
  }, [from, router]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { account_id: "", category_id: null, amount: 0, merchant: "", note: "" },
  });

  const selectedAccountId = useWatch({ control, name: "account_id" });

  const availableCategories = useMemo(
    () => categoriesData?.filter((c) => c.type === txType && !c.is_archived) ?? [],
    [categoriesData, txType],
  );

  useEffect(() => {
    const firstId = accountsData?.[0]?.id;
    if (firstId && !selectedAccountId) setValue("account_id", firstId);
  }, [accountsData, selectedAccountId, setValue]);

  // Reset category when switching between income/expense
  useEffect(() => {
    setValue("category_id", null);
  }, [txType, setValue]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const finalAmount = txType === "expense" ? -values.amount : values.amount;
        await createTransaction.mutateAsync({
          account_id: values.account_id,
          category_id: values.category_id ?? null,
          amount: finalAmount,
          merchant: values.merchant || null,
          note: values.note || null,
          occurred_at: new Date().toISOString(),
        });
        showToast("Transaksi tersimpan", "success");
        handleBack();
      } catch {
        showToast("Gagal menyimpan transaksi. Coba lagi.", "error");
      }
    },
    [createTransaction, handleBack, showToast, txType],
  );

  const noAccounts = !accountsLoading && (accountsData?.length ?? 0) === 0;

  return (
    <Screen>
      <Header title="Transaksi Baru" onBack={handleBack} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {noAccounts ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Buat akun dulu sebelum mencatat transaksi.</Text>
            <Button
              label="Buat Akun"
              onPress={() => router.replace("/(app)/accounts")}
              variant="secondary"
            />
          </View>
        ) : (
          <View style={styles.form}>
            {/* Transaction Type Segmented Toggle */}
            <View style={styles.toggleContainer}>
              <Pressable
                onPress={() => setTxType("expense")}
                style={styles.togglePressable}
              >
                <View style={txType === "expense" ? [styles.toggleBtn, styles.toggleBtnActive] : styles.toggleBtn}>
                  <Text style={txType === "expense" ? [styles.toggleText, styles.toggleTextActive] : styles.toggleText}>
                    Pengeluaran
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setTxType("income")}
                style={styles.togglePressable}
              >
                <View style={txType === "income" ? [styles.toggleBtn, styles.toggleBtnActive] : styles.toggleBtn}>
                  <Text style={txType === "income" ? [styles.toggleText, styles.toggleTextActive] : styles.toggleText}>
                    Pemasukan
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Amount input using RupiahInput */}
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, value } }) => (
                <RupiahInput
                  label="Jumlah"
                  placeholder="0"
                  value={value}
                  onChange={onChange}
                  error={errors.amount?.message}
                  autoFocus
                />
              )}
            />

            {/* Category selection using SearchableDropdown */}
            <Controller
              control={control}
              name="category_id"
              render={({ field: { onChange, value } }) => (
                <SearchableDropdown
                  label="Kategori (opsional)"
                  placeholder="Pilih Kategori"
                  items={availableCategories.map((c) => ({
                    id: c.id,
                    name: c.name,
                    icon: c.icon ?? undefined,
                  }))}
                  selectedId={value}
                  onSelect={onChange}
                  error={errors.category_id?.message}
                />
              )}
            />

            {/* Account Selector */}
            {accountsData && accountsData.length === 1 && (
              <View style={styles.accountSection}>
                <Text style={styles.accountLabel}>Akun</Text>
                <View style={styles.singleAccountRow}>
                  <Text style={styles.singleAccountName}>{accountsData[0].name}</Text>
                </View>
              </View>
            )}
            {accountsData && accountsData.length > 1 && (
              <View style={styles.accountSection}>
                <Text style={styles.accountLabel}>Pilih Dompet / Akun</Text>
                <Controller
                  control={control}
                  name="account_id"
                  render={({ field: { onChange } }) => (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.accountRow}
                    >
                      {accountsData.map((acc) => {
                        const active = selectedAccountId === acc.id;
                        return (
                          <Pressable
                            key={acc.id}
                            onPress={() => onChange(acc.id)}
                            style={({ pressed }) => pressed && { opacity: 0.8 }}
                          >
                            <View style={active ? [styles.accountPill, styles.accountPillActive] : styles.accountPill}>
                              <Text
                                style={active ? [styles.accountPillText, styles.accountPillTextActive] : styles.accountPillText}
                              >
                                {acc.name}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}
                />
              </View>
            )}

            {/* Collapsible toggle for merchant & notes */}
            <Pressable
              onPress={() => setShowMore((prev) => !prev)}
              style={styles.moreTogglePressable}
            >
              <View style={styles.moreToggleBtn}>
                <Text style={styles.moreToggleText}>
                  {showMore ? "− Sembunyikan detail tambahan" : "+ Tambah detail (Merchant, Catatan)"}
                </Text>
              </View>
            </Pressable>

            {showMore && (
              <View style={styles.moreFields}>
                <Controller
                  control={control}
                  name="merchant"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Merchant / Toko (opsional)"
                      value={value}
                      onChangeText={onChange}
                      placeholder="Nama toko atau merchant"
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="note"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Catatan (opsional)"
                      value={value}
                      onChangeText={onChange}
                      placeholder="Tambahkan catatan"
                      multiline
                    />
                  )}
                />
              </View>
            )}

            {errors.account_id ? (
              <Text style={styles.fieldError}>{errors.account_id.message}</Text>
            ) : null}

            <View style={styles.submitWrap}>
              <Button
                label="Simpan Transaksi"
                onPress={handleSubmit(onSubmit)}
                loading={createTransaction.isPending}
                disabled={accountsLoading}
                fullWidth
              />
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing['2xl'], paddingBottom: 32 },
  emptyWrap: { marginTop: 64, alignItems: 'center', gap: spacing.md },
  emptyText: { ...StyleSheet.flatten(textStyles.body), color: colors.text.muted, textAlign: 'center' },
  form: { gap: spacing.lg, paddingTop: spacing.sm },
  fieldError: { ...StyleSheet.flatten(textStyles.caption), color: colors.danger.text },
  submitWrap: { marginTop: spacing.lg },

  toggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.xs,
    overflow: "hidden",
  },
  togglePressable: {
    flex: 1,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  toggleBtn: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.accent.primary,
  },
  toggleText: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.muted,
  },
  toggleTextActive: {
    color: colors.bg.canvas,
    fontWeight: "600",
  },

  moreTogglePressable: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  moreToggleBtn: {
    paddingVertical: spacing.sm,
  },
  moreToggleText: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.accent.text,
    fontWeight: "600",
    fontSize: 14,
  },
  moreFields: {
    gap: spacing.lg,
    marginTop: spacing.sm,
  },

  accountSection: { gap: spacing.sm },
  accountLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    color: colors.text.muted,
  },
  singleAccountRow: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  singleAccountName: {
    ...StyleSheet.flatten(textStyles.body),
    fontSize: 14,
    color: colors.text.secondary,
  },
  accountRow: { gap: spacing.sm, paddingVertical: 2 },
  accountPill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  accountPillActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  accountPillText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: "500",
    color: colors.text.primary,
  },
  accountPillTextActive: {
    color: colors.bg.canvas,
  },
});
