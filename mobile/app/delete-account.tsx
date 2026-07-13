import { useCallback } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { useDeleteAccount } from "@/features/account/hooks/useDeleteAccount";
import { colors, radius, spacing, textStyles } from "@/theme";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthStore();
  const { showToast } = useToastStore();
  const { mutate: deleteAccount, isPending } = useDeleteAccount();

  const lostDataItems = [
    t("deleteAccount.items.financialAccounts"),
    t("deleteAccount.items.transactionHistory"),
    t("deleteAccount.items.budgetsGoals"),
    t("deleteAccount.items.aiConversations"),
  ];

  const handleDelete = useCallback(() => {
    Alert.alert(t("deleteAccount.alertTitle"), t("deleteAccount.alertMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("deleteAccount.alertConfirm"),
        style: "destructive",
        onPress: () =>
          deleteAccount(undefined, {
            onSuccess: async () => {
              showToast(t("deleteAccount.successToast"), "success");
              await signOut();
              router.replace("/login");
            },
            onError: () => showToast(t("deleteAccount.errorToast"), "error"),
          }),
      },
    ]);
  }, [deleteAccount, showToast, signOut, router, t]);

  return (
    <Screen>
      <Header title={t("deleteAccount.headerTitle")} onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warningCard}>
          <View style={styles.warningIconRow}>
            <AlertTriangle size={20} color={colors.danger.text} />
            <Text style={styles.warningTitle}>{t("deleteAccount.warningTitle")}</Text>
          </View>
          <View style={styles.list}>
            {lostDataItems.map((item) => (
              <View key={item} style={styles.listRow}>
                <View style={styles.bullet} />
                <Text style={styles.listItem}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.warningNote}>{t("deleteAccount.warningNote")}</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing["2xl"] + insets.bottom }]}>
        <Button
          label={isPending ? t("deleteAccount.ctaDeleting") : t("deleteAccount.alertTitle")}
          variant="danger"
          onPress={handleDelete}
          disabled={isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing["2xl"],
    paddingBottom: spacing["2xl"],
  },
  warningCard: {
    backgroundColor: colors.danger.bg,
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: `${colors.danger.text}33`,
    gap: 16,
  },
  warningIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningTitle: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.danger.text,
  },
  list: {
    gap: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.danger.text,
    opacity: 0.6,
    flexShrink: 0,
  },
  listItem: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.secondary,
  },
  warningNote: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.danger.text,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    paddingTop: spacing.md,
  },
});
