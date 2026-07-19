import { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import { OnboardingStepHeader } from "@/components/layout/OnboardingStepHeader";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

const schema = z.object({
  displayName: z.string(),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileOnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const googleName = (user?.user_metadata?.full_name as string | undefined) ?? "";

  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: googleName },
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
      <KeyboardAvoidingView style={styles.scroll} behavior="padding">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <OnboardingStepHeader
            icon={User}
            title={t("onboarding.profile.title")}
            subtitle={t("onboarding.profile.subtitle")}
          />

          <View style={styles.form}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t("onboarding.profile.nameLabel")}
                  value={value}
                  onChangeText={onChange}
                  placeholder={t("onboarding.profile.namePlaceholder")}
                  autoFocus
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.bottomNav}>
          <View style={styles.backBtn}>
            <Button label={t("common.back")} variant="ghost" onPress={() => router.back()} fullWidth />
          </View>
          <View style={styles.nextBtn}>
            <Button label={t("onboarding.profile.cta")} onPress={handleSubmit(onSubmit)} fullWidth />
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
