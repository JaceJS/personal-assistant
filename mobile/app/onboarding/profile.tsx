import { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "lucide-react-native";

import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { textStyles } from "@/theme/typography";

const schema = z.object({
  displayName: z.string().min(1, "Nama panggilanmu wajib diisi dulu"),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileOnboardingScreen() {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "" },
  });

  const onSubmit = useCallback(
    (values: FormValues) => {
      router.push({
        pathname: "/onboarding/first-account",
        params: { displayName: values.displayName.trim() },
      });
    },
    [router]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader currentStep={2} totalSteps={3} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <User size={24} color={colors.accent.primary} />
            </View>
            <Text style={styles.title}>Kenalin diri dulu 👋</Text>
            <Text style={styles.subtitle}>Biar AI-nya bisa nyapa kamu dengan bener.</Text>
          </View>

          {/* Form */}
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
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  error={errors.displayName?.message}
                />
              )}
            />
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.bottomNav}>
          <View style={styles.backBtn}>
            <Button label="Kembali" variant="ghost" onPress={() => router.back()} fullWidth />
          </View>
          <View style={styles.nextBtn}>
            <Button label="Lanjut →" onPress={handleSubmit(onSubmit)} fullWidth />
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
    marginTop: 40,
  },
  bottomNav: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});
