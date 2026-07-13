import { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wallet } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import { OnboardingStepHeader } from "@/components/layout/OnboardingStepHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RupiahInput from "@/components/ui/RupiahInput";
import { AccountTypePicker } from "@/features/finance/components/AccountTypePicker";
import { useCreateAccount } from "@/features/finance/hooks/useAccounts";
import { useOnboardingStore } from "@/stores/onboarding";
import { useToastStore } from "@/stores/toast";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { textStyles } from "@/theme/typography";
import type { AccountType } from "@/features/finance/types";
import type { TFunction } from "i18next";

// Module-scope Zod schemas evaluate error messages at import time (before
// i18n has a language) — factory + useMemo(() => ..., [t]) keeps them reactive.
function makeSchema(t: TFunction) {
  return z.object({
    accountName: z.string().min(1, t("onboarding.firstAccount.nameRequired")),
    accountType: z.enum(["cash", "bank", "ewallet", "credit"]),
    initialBalance: z.number(),
  });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

export default function FirstAccountOnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { displayName } = useLocalSearchParams<{ displayName: string }>();
  const createAccount = useCreateAccount();
  const { complete, setGuestName } = useOnboardingStore();
  const { showToast } = useToastStore();

  const schema = useMemo(() => makeSchema(t), [t]);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountName: "",
      accountType: "bank" as AccountType,
      initialBalance: 0,
    },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session && displayName) {
          await supabase.auth.updateUser({ data: { full_name: displayName } });
        } else if (displayName) {
          await setGuestName(displayName);
        }
        await createAccount.mutateAsync({
          name: values.accountName.trim(),
          type: values.accountType,
          initial_balance: values.initialBalance,
        });
        await complete();
        showToast(t("onboarding.firstAccount.successToast"), "success");
        router.replace("/(app)");
      } catch (err) {
        logger.error("Failed to create first account during onboarding", err);
        showToast(t("onboarding.firstAccount.errorToast"), "error");
      }
    },
    [displayName, createAccount, complete, setGuestName, showToast, router, t]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <OnboardingHeader currentStep={3} totalSteps={3} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <OnboardingStepHeader
            icon={Wallet}
            title={t("onboarding.firstAccount.title")}
            subtitle={t("onboarding.firstAccount.subtitle")}
          />

          <View style={styles.form}>
            <Controller
              control={control}
              name="accountName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label={t("onboarding.firstAccount.nameLabel")}
                  value={value}
                  onChangeText={onChange}
                  placeholder={t("onboarding.firstAccount.namePlaceholder")}
                  error={errors.accountName?.message}
                  autoFocus
                />
              )}
            />

            <Controller
              control={control}
              name="initialBalance"
              render={({ field: { onChange, value } }) => (
                <RupiahInput
                  label={t("onboarding.firstAccount.balanceLabel")}
                  placeholder="0"
                  value={value}
                  onChange={onChange}
                />
              )}
            />

            <View style={styles.typeSection}>
              <Text style={styles.typeLabel}>{t("onboarding.firstAccount.typeLabel")}</Text>
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
            <Button label={t("common.back")} variant="ghost" onPress={() => router.back()} fullWidth />
          </View>
          <View style={styles.nextBtn}>
            <Button
              label={t("onboarding.firstAccount.cta")}
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
