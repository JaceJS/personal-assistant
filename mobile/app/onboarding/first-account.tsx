import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wallet } from "lucide-react-native";

import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { AccountTypePicker } from "@/features/finance/components/AccountTypePicker";
import { useCreateAccount } from "@/features/finance/hooks/useAccounts";
import { useOnboardingStore } from "@/stores/onboarding";
import { useToastStore } from "@/stores/toast";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { textStyles } from "@/theme/typography";

const schema = z.object({
  name: z.string().min(1, "Nama akun wajib diisi"),
  type: z.enum(["cash", "bank", "ewallet", "credit"]),
});

type FormValues = z.infer<typeof schema>;

export default function FirstAccountOnboardingScreen() {
  const router = useRouter();
  const { displayName } = useLocalSearchParams<{ displayName: string }>();
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
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session && displayName) {
          await supabase.auth.updateUser({ data: { full_name: displayName } });
        }
        await createAccount.mutateAsync({ name: values.name, type: values.type });
        await complete();
        showToast("Yeay! Siap mulai nyatat 🚀", "success");
        router.replace("/(app)");
      } catch (err) {
        logger.error("Failed to create first account during onboarding", err);
        showToast("Gagal bikin akun. Coba lagi ya.", "error");
      }
    },
    [displayName, createAccount, complete, showToast, router]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader currentStep={3} totalSteps={3} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Wallet size={24} color={colors.accent.primary} />
            </View>
            <Text style={styles.title}>Satu langkah lagi nih!</Text>
            <Text style={styles.subtitle}>
              Tambahin rekening atau dompet pertama buat mulai nyatat.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
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

            <View style={styles.typeSection}>
              <Text style={styles.typeLabel}>Tipe Akun</Text>
              <Controller
                control={control}
                name="type"
                render={({ field: { onChange, value } }) => (
                  <AccountTypePicker value={value} onChange={onChange} />
                )}
              />
            </View>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.bottomNav}>
          <View style={styles.backBtn}>
            <Button label="Kembali" variant="ghost" onPress={() => router.back()} fullWidth />
          </View>
          <View style={styles.nextBtn}>
            <Button
              label="Yuk, mulai! 🚀"
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
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    marginTop: 24,
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
    fontSize: 28,
    lineHeight: 36,
    color: colors.text.primary,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.muted,
    marginTop: 8,
    lineHeight: 22,
  },
  form: {
    marginTop: 36,
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
