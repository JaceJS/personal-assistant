import { useCallback, useEffect } from "react";
import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAccounts } from "@/features/finance/hooks/useAccounts";
import { useCreateTransaction } from "@/features/finance/hooks/useTransactions";
import { useToastStore } from "@/stores/toast";

const schema = z.object({
  account_id: z.string().min(1, "Pilih akun"),
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
  const createTransaction = useCreateTransaction();
  const { showToast } = useToastStore();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      account_id: "",
      amount: "",
      merchant: "",
      note: "",
    },
  });

  useEffect(() => {
    const firstId = accountsData?.items[0]?.id;
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
        showToast("Transaksi tersimpan", "success");
        router.back();
      } catch {
        showToast("Gagal menyimpan transaksi. Coba lagi.", "error");
      }
    },
    [createTransaction, router, showToast]
  );

  const noAccounts = !accountsLoading && (accountsData?.items.length ?? 0) === 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-6 py-4">
        <Pressable onPress={() => router.back()} className="active:opacity-60">
          <ArrowLeft size={22} color="#94a3b8" />
        </Pressable>
        <Text className="font-bold text-xl text-ink">Transaksi Baru</Text>
      </View>

      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        {noAccounts ? (
          <View className="mt-16 items-center gap-3">
            <Text className="text-center text-sm text-muted">
              Buat akun terlebih dahulu sebelum menambah transaksi.
            </Text>
            <Button
              label="Buat Akun"
              onPress={() => router.replace("/(app)/accounts/index")}
              variant="secondary"
            />
          </View>
        ) : (
          <View className="gap-4 pt-2">
            <Controller
              control={control}
              name="amount"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Jumlah (+ pemasukan, − pengeluaran)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="contoh: -50000"
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
                  label="Merchant (opsional)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Nama toko / merchant"
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
                  placeholder="Tambah catatan"
                  multiline
                />
              )}
            />

            {errors.account_id ? (
              <Text className="text-xs text-danger">{errors.account_id.message}</Text>
            ) : null}

            <View className="mt-4">
              <Button
                label="Simpan Transaksi"
                onPress={handleSubmit(onSubmit)}
                loading={createTransaction.isPending}
                disabled={accountsLoading}
                fullWidth
              />
            </View>

            <View className="h-8" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
