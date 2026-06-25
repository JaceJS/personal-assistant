import { useCallback, useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCategories } from "@/features/finance/hooks/useCategories";
import { useCreateTransaction } from "@/features/finance/hooks/useTransactions";
import { getTransactionCategories } from "@/features/finance/utils/transactionCategoryUtils";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";

const schema = z.object({
  account_id: z.string().min(1, "Pilih akun"),
  category_id: z.string().nullable().optional(),
  amount: z
    .string()
    .min(1, "Masukkan jumlah")
    .refine((v) => !isNaN(Number(v)) && Number(v) !== 0, "Jumlah tidak valid"),
  merchant: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewTransactionScreen() {
  const router = useRouter();
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: categoriesData } = useCategories();
  const createTransaction = useCreateTransaction();
  const { showToast } = useToastStore();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { account_id: "", category_id: null, amount: "", merchant: "", note: "" },
  });

  const amountValue = useWatch({ control, name: "amount" });
  const selectedCategoryId = useWatch({ control, name: "category_id" });

  const availableCategories = useMemo(
    () => getTransactionCategories(categoriesData ?? [], amountValue),
    [categoriesData, amountValue],
  );

  useEffect(() => {
    const firstId = accountsData?.[0]?.id;
    if (firstId) setValue("account_id", firstId);
  }, [accountsData, setValue]);

  // Reset category when switching between income/expense
  useEffect(() => {
    setValue("category_id", null);
  }, [Number(amountValue) > 0, setValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        await createTransaction.mutateAsync({
          account_id: values.account_id,
          category_id: values.category_id ?? null,
          amount: Number(values.amount),
          merchant: values.merchant || null,
          note: values.note || null,
          occurred_at: new Date().toISOString(),
        });
        showToast("Transaksi tersimpan", "success");
        router.back();
      } catch {
        showToast("Gagal menyimpan transaksi. Coba lagi.", "error");
      }
    },
    [createTransaction, router, showToast],
  );

  const noAccounts = !accountsLoading && (accountsData?.length ?? 0) === 0;

  return (
    <Screen>
      <Header
        title="Transaksi Baru"
        left={
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && { opacity: 0.6 }}
          >
            <ChevronLeft size={22} color={colors.text.secondary} strokeWidth={2} />
          </Pressable>
        }
      />

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
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Jumlah (+ pemasukan, - pengeluaran)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="contoh: -50000"
                  keyboardType="numeric"
                  error={errors.amount?.message}
                />
              )}
            />

            {availableCategories.length > 0 && (
              <View style={styles.categorySection}>
                <Text style={styles.categoryLabel}>Kategori (opsional)</Text>
                <Controller
                  control={control}
                  name="category_id"
                  render={({ field: { onChange } }) => (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryRow}
                    >
                      {availableCategories.map((cat) => {
                        const active = selectedCategoryId === cat.id;
                        return (
                          <Pressable
                            key={cat.id}
                            onPress={() => onChange(active ? null : cat.id)}
                            style={({ pressed }) => pressed && { opacity: 0.8 }}
                          >
                            <View style={[styles.categoryPill, active && styles.categoryPillActive]}>
                              <Text
                                style={[
                                  styles.categoryPillText,
                                  active && styles.categoryPillTextActive,
                                ]}
                              >
                                {cat.name}
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

            <Controller
              control={control}
              name="merchant"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Merchant (opsional)"
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
  emptyText: { ...StyleSheet.flatten(textStyles.caption), fontSize: 14, color: colors.text.muted, textAlign: 'center' },
  form: { gap: spacing.lg, paddingTop: spacing.sm },
  fieldError: { ...StyleSheet.flatten(textStyles.caption), color: colors.danger.text },
  submitWrap: { marginTop: spacing.lg },

  categorySection: { gap: spacing.sm },
  categoryLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    color: colors.text.muted,
  },
  categoryRow: { gap: spacing.sm, paddingVertical: 2 },
  categoryPill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  categoryPillActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  categoryPillText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: "500",
    color: colors.text.primary,
  },
  categoryPillTextActive: {
    color: colors.bg.canvas,
  },
});
