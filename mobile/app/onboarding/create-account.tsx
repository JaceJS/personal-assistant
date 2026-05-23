import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wallet } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { THEME } from "@/constants/theme";
import { useCreateAccount } from "@/features/finance/hooks/useAccounts";
import { useOnboardingStore } from "@/stores/onboarding";
import { useToastStore } from "@/stores/toast";
import { logger } from "@/lib/logger";
import type { AccountType } from "@/features/finance/types";

const ACCOUNT_TYPES: { value: AccountType; label: string; emoji: string }[] = [
  { value: "bank", label: "Bank", emoji: "🏦" },
  { value: "cash", label: "Tunai", emoji: "💵" },
  { value: "ewallet", label: "E-Wallet", emoji: "📱" },
  { value: "credit", label: "Kartu Kredit", emoji: "💳" },
];

const schema = z.object({
  name: z.string().min(1, "Nama akun wajib diisi"),
  type: z.enum(["cash", "bank", "ewallet", "credit"]),
});

type FormValues = z.infer<typeof schema>;

export default function CreateAccountOnboardingScreen() {
  const router = useRouter();
  const createAccount = useCreateAccount();
  const { complete } = useOnboardingStore();
  const { showToast } = useToastStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", type: "bank" },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        await createAccount.mutateAsync(values);
        await complete();
        router.replace("/(app)");
      } catch (err) {
        logger.error("Failed to create account during onboarding", err);
        showToast("Gagal membuat akun. Coba lagi.", "error");
      }
    },
    [createAccount, complete, router, showToast]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: THEME.spacing.lg, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step indicator */}
        <View style={{ flexDirection: "row", gap: 6, marginTop: 24 }}>
          <View
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              backgroundColor: THEME.colors.accent,
            }}
          />
          <View
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              backgroundColor: THEME.colors.accent,
            }}
          />
        </View>

        {/* Header */}
        <View style={{ marginTop: 32 }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: THEME.radius.md,
              backgroundColor: `${THEME.colors.accent}22`,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Wallet size={24} color={THEME.colors.accent} />
          </View>
          <Text
            style={{
              fontFamily: THEME.fontFamily.bold,
              fontSize: 28,
              color: THEME.colors.ink,
              lineHeight: 36,
            }}
          >
            Buat akun pertamamu
          </Text>
          <Text
            style={{
              fontFamily: THEME.fontFamily.regular,
              fontSize: THEME.fontSize.base,
              color: THEME.colors.muted,
              marginTop: 8,
              lineHeight: 22,
            }}
          >
            Akun digunakan untuk mencatat transaksi. Kamu bisa menambah lebih banyak akun nanti.
          </Text>
        </View>

        {/* Form */}
        <View style={{ marginTop: 36, gap: 20 }}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Nama Akun"
                value={value}
                onChangeText={onChange}
                placeholder="contoh: BCA, GoPay, Dompet"
                autoFocus
                error={errors.name?.message}
              />
            )}
          />

          {/* Type picker */}
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: THEME.fontFamily.medium,
                fontSize: THEME.fontSize.sm,
                color: THEME.colors.muted,
              }}
            >
              Tipe Akun
            </Text>
            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {ACCOUNT_TYPES.map((t) => {
                    const isSelected = value === t.value;
                    return (
                      <Pressable
                        key={t.value}
                        onPress={() => onChange(t.value)}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: THEME.radius.md,
                          backgroundColor: isSelected
                            ? THEME.colors.accent
                            : THEME.colors.card,
                          borderWidth: 1,
                          borderColor: isSelected
                            ? THEME.colors.accent
                            : THEME.colors.border,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
                        <Text
                          style={{
                            fontFamily: THEME.fontFamily.medium,
                            fontSize: THEME.fontSize.sm,
                            color: isSelected ? "#fff" : THEME.colors.ink,
                          }}
                        >
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>
        </View>

        {/* Submit */}
        <View style={{ marginTop: 40 }}>
          <Button
            label="Mulai Mencatat"
            onPress={handleSubmit(onSubmit)}
            loading={createAccount.isPending}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
