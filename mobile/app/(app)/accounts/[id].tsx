import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Edit2, Trash2 } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { THEME } from "@/constants/theme";
import { useAccount, useArchiveAccount, useUpdateAccount } from "@/features/finance/hooks/useAccounts";
import { useToastStore } from "@/stores/toast";
import { formatRupiah } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-Wallet",
  credit: "Kartu Kredit",
};

const TYPE_EMOJI: Record<string, string> = {
  cash: "💵",
  bank: "🏦",
  ewallet: "📱",
  credit: "💳",
};

export default function AccountDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: account, isLoading } = useAccount(id);
  const updateAccount = useUpdateAccount(id);
  const archiveAccount = useArchiveAccount();
  const { showToast } = useToastStore();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");

  const handleStartEdit = useCallback(() => {
    if (!account) return;
    setName(account.name);
    setIsEditing(true);
  }, [account]);

  const handleSaveEdit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast("Nama akun tidak boleh kosong", "error");
      return;
    }
    try {
      await updateAccount.mutateAsync({ name: trimmed });
      setIsEditing(false);
      showToast("Nama akun diperbarui", "success");
    } catch {
      showToast("Gagal memperbarui akun.", "error");
    }
  }, [updateAccount, name, showToast]);

  const handleArchive = useCallback(() => {
    Alert.alert(
      "Arsipkan Akun",
      `Akun "${account?.name}" akan diarsipkan dan tidak muncul di daftar aktif. Transaksi tetap tersimpan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Arsipkan",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveAccount.mutateAsync(id);
              showToast("Akun diarsipkan", "info");
              router.back();
            } catch {
              showToast("Gagal mengarsipkan akun.", "error");
            }
          },
        },
      ]
    );
  }, [account, archiveAccount, id, router, showToast]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: THEME.colors.card,
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted">Akun tidak ditemukan</Text>
      </SafeAreaView>
    );
  }

  const isCredit = account.type === "credit";
  const balanceColor = isCredit && account.balance < 0 ? "text-danger" : "text-success";

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <ArrowLeft size={22} color={THEME.colors.muted} />
          </Pressable>
          <Text className="font-bold text-xl text-ink">Detail Akun</Text>
        </View>
        {!isEditing && (
          <Pressable onPress={handleStartEdit} className="active:opacity-60">
            <Edit2 size={20} color={THEME.colors.accent} />
          </Pressable>
        )}
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Balance hero card */}
        <View
          style={{
            backgroundColor: THEME.colors.card,
            borderRadius: THEME.radius.xl,
            padding: 24,
            borderWidth: 1,
            borderColor: THEME.colors.border,
            marginBottom: 20,
          }}
        >
          <View className="flex-row items-center gap-3 mb-5">
            <Text style={{ fontSize: 28 }}>
              {TYPE_EMOJI[account.type] ?? "💰"}
            </Text>
            <View className="flex-1">
              {isEditing ? (
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder="Nama akun"
                  autoFocus
                />
              ) : (
                <Text className="font-bold text-xl text-ink">{account.name}</Text>
              )}
              <Text className="text-sm text-muted mt-0.5">
                {TYPE_LABELS[account.type] ?? account.type}
              </Text>
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: THEME.colors.border,
              marginBottom: 20,
            }}
          />

          <Text
            style={{
              fontFamily: THEME.fontFamily.medium,
              fontSize: THEME.fontSize.sm,
              color: THEME.colors.muted,
            }}
          >
            Saldo
          </Text>
          <Text
            className={`font-bold mt-1 ${balanceColor}`}
            style={{ fontSize: 32, fontFamily: THEME.fontFamily.bold }}
          >
            {formatRupiah(account.balance)}
          </Text>
          <Text className="mt-1 text-xs text-muted">{account.currency}</Text>
        </View>

        {/* Actions */}
        <View className="gap-3">
          {isEditing ? (
            <>
              <Button
                label="Simpan Perubahan"
                onPress={handleSaveEdit}
                loading={updateAccount.isPending}
                fullWidth
              />
              <Button
                label="Batal"
                onPress={() => setIsEditing(false)}
                variant="ghost"
                fullWidth
              />
            </>
          ) : (
            <Pressable
              onPress={handleArchive}
              disabled={archiveAccount.isPending}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: `${THEME.colors.danger}18`,
                borderRadius: THEME.radius.lg,
                paddingVertical: 14,
                opacity: pressed || archiveAccount.isPending ? 0.7 : 1,
              })}
            >
              <Trash2 size={18} color={THEME.colors.danger} />
              <Text
                style={{
                  fontFamily: THEME.fontFamily.semibold,
                  fontSize: THEME.fontSize.base,
                  color: THEME.colors.danger,
                }}
              >
                Arsipkan Akun
              </Text>
            </Pressable>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
