import { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable } from "react-native";
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
  const { data: accountsData } = useAccounts();
  const createTransaction = useCreateTransaction();
  const { showToast } = useToastStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      account_id: accountsData?.items[0]?.id ?? "",
      amount: "",
      merchant: "",
      note: "",
    },
  });

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

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4">
        <Pressable onPress={() => router.back()} className="active:opacity-60">
          <ArrowLeft size={22} color="#94a3b8" />
        </Pressable>
        <Text className="font-bold text-xl text-ink">Transaksi Baru</Text>
      </View>

      <ScrollView className="flex-1 px-6">
        <View className="gap-4 pt-2">
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
        </View>

        <View className="mt-8">
          <Button
            label="Simpan Transaksi"
            onPress={handleSubmit(onSubmit)}
            loading={createTransaction.isPending}
            fullWidth
          />
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
