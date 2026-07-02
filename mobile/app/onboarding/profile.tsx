import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Wallet } from "lucide-react-native";

import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import Input from "@/components/ui/Input";
import RupiahInput from "@/components/ui/RupiahInput";
import Button from "@/components/ui/Button";
import { AccountTypePicker } from "@/features/finance/components/AccountTypePicker";
import { useCreateAccount } from "@/features/finance/hooks/useAccounts";
import { useAuthStore } from "@/stores/auth";
import { useOnboardingStore } from "@/stores/onboarding";
import { useToastStore } from "@/stores/toast";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { textStyles } from "@/theme/typography";
import type { AccountType } from "@/features/finance/types";

export const DEFAULT_ACCOUNT_NAME = "Akun Utama";

const schema = z.object({
  displayName: z.string(),
  accountName: z.string(),
  accountType: z.enum(["cash", "bank", "ewallet", "credit"]),
  initialBalance: z.number(),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileOnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const googleName = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const createAccount = useCreateAccount();
  const { complete, setGuestName } = useOnboardingStore();
  const { showToast } = useToastStore();

  const {
    control,
    handleSubmit,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: googleName,
      accountName: "",
      accountType: "bank" as AccountType,
      initialBalance: 0,
    },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const trimmedName = values.displayName.trim();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session && trimmedName) {
          await supabase.auth.updateUser({ data: { full_name: trimmedName } });
        } else if (trimmedName) {
          await setGuestName(trimmedName);
        }
        await createAccount.mutateAsync({
          name: values.accountName.trim() || DEFAULT_ACCOUNT_NAME,
          type: values.accountType,
          initial_balance: values.initialBalance,
        });
        await complete();
        showToast("Yeay! Siap mulai nyatat 🚀", "success");
        router.replace("/(app)");
      } catch (err) {
        logger.error("Failed to complete onboarding setup", err);
        showToast("Gagal nyimpen. Coba lagi ya.", "error");
      }
    },
    [createAccount, complete, setGuestName, showToast, router]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader currentStep={2} totalSteps={2} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <User size={24} color={colors.accent.primary} />
            </View>
            <Text style={styles.title}>Yuk, kenalan bentar 👋</Text>
            <Text style={styles.subtitle}>
              Isi kalau mau, atau lewatin aja — bisa diubah kapan-kapan di Pengaturan.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Dipanggil apa?"
                  value={value}
                  onChangeText={onChange}
                  placeholder="misal: Jace, Budi, Rina"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              )}
            />
          </View>

          <View style={styles.sectionHeader}>
            <View style={styles.iconWrap}>
              <Wallet size={24} color={colors.accent.primary} />
            </View>
            <Text style={styles.title}>Akun pertama</Text>
            <Text style={styles.subtitle}>
              Tempat transaksimu kecatat. Kosongin aja kalau belum yakin — kepake "{DEFAULT_ACCOUNT_NAME}" dulu.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="accountName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Nama Akun"
                  value={value}
                  onChangeText={onChange}
                  placeholder={DEFAULT_ACCOUNT_NAME}
                />
              )}
            />

            <Controller
              control={control}
              name="initialBalance"
              render={({ field: { onChange, value } }) => (
                <RupiahInput
                  label="Saldo Awal (opsional)"
                  placeholder="0"
                  value={value}
                  onChange={onChange}
                />
              )}
            />

            <View style={styles.typeSection}>
              <Text style={styles.typeLabel}>Tipe Akun</Text>
              <Controller
                control={control}
                name="accountType"
                render={({ field: { onChange, value } }) => (
                  <AccountTypePicker value={value} onChange={onChange} />
                )}
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomNav}>
          <View style={styles.backBtn}>
            <Button label="Kembali" variant="ghost" onPress={() => router.back()} fullWidth />
          </View>
          <View style={styles.nextBtn}>
            <Button
              label="Mulai →"
              onPress={handleSubmit(onSubmit)}
              loading={createAccount.isPending}
              fullWidth
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: 32,
  },
  header: {
    marginTop: 24,
  },
  sectionHeader: {
    marginTop: 36,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    ...textStyles.display,
    fontSize: 24,
    lineHeight: 32,
    color: colors.text.primary,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.muted,
    marginTop: 8,
    lineHeight: 22,
  },
  form: {
    marginTop: 24,
    gap: 20,
  },
  typeSection: {
    gap: 8,
  },
  typeLabel: {
    ...textStyles.overline,
    color: colors.text.muted,
  },
  bottomNav: {
    flexDirection: "row",
    gap: 12,
    marginTop: 40,
  },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});
