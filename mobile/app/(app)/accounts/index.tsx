import { useCallback, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Wallet, X } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import { SkeletonList } from "@/components/ui/Skeleton";
import AccountCard from "@/features/finance/components/AccountCard";
import { useAccounts, useCreateAccount } from "@/features/finance/hooks/useAccounts";
import { useToastStore } from "@/stores/toast";
import type { Account, AccountType } from "@/features/finance/types";

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Tunai" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "credit", label: "Kartu Kredit" },
];

const schema = z.object({
  name: z.string().min(1, "Nama akun wajib diisi"),
  type: z.enum(["cash", "bank", "ewallet", "credit"]),
});

type FormValues = z.infer<typeof schema>;

export default function AccountsScreen() {
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
        showToast("Akun berhasil dibuat", "success");
      } catch {
        showToast("Gagal membuat akun. Coba lagi.", "error");
      }
    },
    [createAccount, handleCloseModal, showToast]
  );

  const renderItem = useCallback(
    ({ item }: { item: Account }) => <AccountCard account={item} />,
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="font-bold text-2xl text-ink">Akun</Text>
        <Pressable
          onPress={handleOpenModal}
          className="flex-row items-center gap-1.5 rounded-xl bg-accent px-3 py-2"
        >
          <Plus size={16} color="#fff" />
          <Text className="font-semibold text-sm text-white">Tambah</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="px-6">
          <SkeletonList count={3} />
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 12, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6366f1" />
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

      {/* Create account modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="rounded-t-3xl bg-surface p-6">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-bold text-lg text-ink">Buat Akun Baru</Text>
              <Pressable onPress={handleCloseModal} className="active:opacity-60">
                <X size={22} color="#94a3b8" />
              </Pressable>
            </View>

            <View className="gap-4">
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

              <View className="gap-1.5">
                <Text className="text-sm font-medium text-muted">Tipe Akun</Text>
                <Controller
                  control={control}
                  name="type"
                  render={({ field: { onChange, value } }) => (
                    <View className="flex-row flex-wrap gap-2">
                      {ACCOUNT_TYPES.map((t) => (
                        <Pressable
                          key={t.value}
                          onPress={() => onChange(t.value)}
                          className={`rounded-xl px-4 py-2 ${value === t.value ? "bg-accent" : "bg-card border border-border"}`}
                        >
                          <Text
                            className={`text-sm font-medium ${value === t.value ? "text-white" : "text-ink"}`}
                          >
                            {t.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                />
              </View>

              <View className="mt-2">
                <Button
                  label="Buat Akun"
                  onPress={handleSubmit(onSubmit)}
                  loading={createAccount.isPending}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
