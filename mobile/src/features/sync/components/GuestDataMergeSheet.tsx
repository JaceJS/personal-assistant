import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import { colors, spacing, textStyles } from "@/theme";
import { useSyncPromptStore } from "@/stores/syncPrompt";
import type { LocalDataSummary } from "../syncService";
import { useSyncOnLogin } from "../useSyncOnLogin";
import { formatSyncSummary } from "../utils/formatSyncSummary";

/** Confirmation prompt shown when a signed-in session still has unsynced
 * guest-local data (fresh login, or a deferred "Nanti Dulu" from a prior
 * session). Mounted once at the app root; visibility is store-driven. */
export function GuestDataMergeSheet() {
  const { t } = useTranslation();
  const phase = useSyncPromptStore((s) => s.phase);
  const summary = useSyncPromptStore((s) => s.summary);
  const startSyncing = useSyncPromptStore((s) => s.startSyncing);
  const syncSucceeded = useSyncPromptStore((s) => s.syncSucceeded);
  const syncFailed = useSyncPromptStore((s) => s.syncFailed);
  const dismiss = useSyncPromptStore((s) => s.dismiss);
  const syncOnLogin = useSyncOnLogin();

  // Keep showing the last known summary during the close animation, since
  // syncSucceeded()/dismiss() null it out the instant phase flips to idle.
  const [displaySummary, setDisplaySummary] = useState<LocalDataSummary | null>(summary);
  useEffect(() => {
    if (summary) setDisplaySummary(summary);
  }, [summary]);

  const isSyncing = phase === "syncing";
  const isError = phase === "error";

  async function handleConfirm() {
    startSyncing();
    const ok = await syncOnLogin();
    if (ok) syncSucceeded();
    else syncFailed();
  }

  if (!displaySummary) return null;

  return (
    <BottomSheet isVisible={phase !== "idle"} onDismiss={isSyncing ? undefined : dismiss}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("guest.sync.title")}</Text>
        <Text style={styles.description}>
          {t("guest.sync.description", { items: formatSyncSummary(t, displaySummary) })}
        </Text>
        {isError && <Text style={styles.error}>{t("guest.sync.errorMessage")}</Text>}
        <View style={styles.actions}>
          <Button
            label={isError ? t("guest.sync.retryCta") : t("guest.sync.confirmCta")}
            onPress={handleConfirm}
            loading={isSyncing}
            fullWidth
          />
          <Button
            label={t("guest.sync.laterCta")}
            onPress={dismiss}
            variant="ghost"
            disabled={isSyncing}
            fullWidth
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
  },
  description: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.secondary,
  },
  error: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.danger.text,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
