import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wallet } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { AccountTypePicker } from "@/features/finance/components/AccountTypePicker";
import { useCreateAccount } from "@/features/finance/hooks/useAccounts";
import { useOnboardingStore } from "@/stores/onboarding";
import { useToastStore } from "@/stores/toast";
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
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Wallet size={24} color={colors.accent.primary} />
          </View>
          <Text style={styles.title}>Buat akun pertamamu</Text>
          <Text style={styles.subtitle}>
            Akun digunakan untuk mencatat transaksi. Kamu bisa menambah lebih
            banyak akun nanti.
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

        {/* Submit */}
        <View style={styles.submit}>
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
  stepRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 24,
  },
  stepDot: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: colors.accent.primary,
  },
  header: {
    marginTop: 32,
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
  submit: {
    marginTop: 40,
  },
});
