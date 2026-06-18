import { useCallback, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCreateTransaction } from "@/features/finance/hooks/useTransactions";
import { useToastStore } from "@/stores/toast";
import { colors, radius, spacing, textStyles } from "@/theme";

const schema = z.object({
  account_id: z.string().min(1, "Select an account"),
  amount: z
    .string()
    .min(1, "Enter an amount")
    .refine((v) => !isNaN(Number(v)) && Number(v) !== 0, "Invalid amount"),
  merchant: z.string().optional(),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewTransactionScreen() {
  const router = useRouter();
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const createTransaction = useCreateTransaction();
  const { showToast } = useToastStore();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { account_id: "", amount: "", merchant: "", note: "" },
  });

  useEffect(() => {
    const firstId = accountsData?.[0]?.id;
    if (firstId) setValue("account_id", firstId);
  }, [accountsData, setValue]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        await createTransaction.mutateAsync({
          account_id: values.account_id,
          amount: Number(values.amount),
          merchant: values.merchant || null,
          note: values.note || null,
          occurred_at: new Date().toISOString(),
        });
        showToast("Transaction saved", "success");
        router.back();
      } catch {
        showToast("Failed to save transaction. Try again.", "error");
      }
    },
    [createTransaction, router, showToast],
  );

  const noAccounts = !accountsLoading && (accountsData?.length ?? 0) === 0;

  return (
    <Screen>
      <Header
        title="New Transaction"
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
            <Text style={styles.emptyText}>Create an account before adding transactions.</Text>
            <Button
              label="Create Account"
              onPress={() => router.replace("/(app)/accounts/index")}
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
                  label="Amount (+ income, − expense)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. -50000"
                  keyboardType="numeric"
                  error={errors.amount?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="merchant"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Merchant (optional)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Store or merchant name"
                />
              )}
            />

            <Controller
              control={control}
              name="note"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Note (optional)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Add a note"
                  multiline
                />
              )}
            />

            {errors.account_id ? (
              <Text style={styles.fieldError}>{errors.account_id.message}</Text>
            ) : null}

            <View style={styles.submitWrap}>
              <Button
                label="Save Transaction"
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
});
