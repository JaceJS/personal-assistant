import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import NotificationTimeSheet from "@/features/settings/components/NotificationTimeSheet";
import LanguageSheet from "@/features/settings/components/LanguageSheet";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import {
  Bell,
  Building2,
  ChevronRight,
  CloudUpload,
  ExternalLink,
  FileText,
  Languages,
  LogOut,
  MessageCircle,
  PiggyBank,
  Shield,
  Tag,
  Trash2,
  User,
} from "lucide-react-native";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import ProfileAvatar from "@/features/settings/components/ProfileAvatar";
import { SUPPORTED_LANGUAGES } from "@/i18n/registry";
import { useAuthStore } from "@/stores/auth";
import { useLanguageStore } from "@/stores/language";
import { useToastStore } from "@/stores/toast";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
} from "@/lib/notifications";
import { useNotificationStore } from "@/stores/notifications";
import { SUPPORT_WHATSAPP } from "@/constants/config";
import { colors, radius, spacing, textStyles } from "@/theme";
import { TAB_BAR_CLEARANCE } from "@/components/ui/FloatingTabBar";

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, isGuest, signOut } = useAuthStore();
  const { showToast } = useToastStore();
  const avatarUrl = useAvatarUrl();
  const [backupLoading, setBackupLoading] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const { preference: languagePreference, setPreference: setLanguagePreference } =
    useLanguageStore();
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const {
    dailyReminderEnabled,
    dailyReminderHour,
    dailyReminderMinute,
    setDailyReminder,
  } = useNotificationStore();

  const handleSignOut = useCallback(() => {
    Alert.alert(t("settings.signOutCta"), t("settings.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.signOutCta"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }, [signOut, router, t]);

  const handleBackupSync = useCallback(async () => {
    setBackupLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === "error") showToast(t("auth.loginError"), "error");
    } finally {
      setBackupLoading(false);
    }
  }, [showToast, t]);

  const handleReminderToggle = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        showToast(t("settings.permissionDenied"), "error");
        return;
      }
      setDailyReminder(true, dailyReminderHour, dailyReminderMinute);
      await scheduleDailyReminder(dailyReminderHour, dailyReminderMinute);
    } else {
      setDailyReminder(false);
      await cancelDailyReminder();
    }
  }, [dailyReminderHour, dailyReminderMinute, setDailyReminder, showToast, t]);

  const handleReminderTimeChange = useCallback(() => {
    setTimePickerOpen(true);
  }, []);

  const handleTimeSelect = useCallback((hour: number) => {
    setTimePickerOpen(false);
    setDailyReminder(dailyReminderEnabled, hour, 0);
    if (dailyReminderEnabled) void scheduleDailyReminder(hour, 0);
  }, [dailyReminderEnabled, setDailyReminder]);

  const displayName = useDisplayName();
  const initial = displayName[0]?.toUpperCase() ?? "U";

  const whatsappUrl = useMemo(() => {
    const number = SUPPORT_WHATSAPP.replace(/[^0-9]/g, "");
    if (!number) return null;
    const version = Constants.expoConfig?.version ?? "";
    const text = encodeURIComponent(
      t("settings.whatsappMessage", { versionSuffix: version ? ` v${version}` : "" })
    );
    return `https://wa.me/${number}?text=${text}`;
  }, [t]);

  return (
    <Screen>
      <Header title={t("tabs.settings")} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isGuest ? (
          <GuestProfileHero name={displayName} />
        ) : (
          <Pressable
            onPress={() => router.push("/(app)/settings/profile")}
            style={({ pressed }) => pressed && { opacity: 0.75 }}
          >
            <View style={styles.profileHero}>
              <View style={styles.avatarWrapper}>
                <ProfileAvatar uri={avatarUrl} initial={initial} size={88} />
              </View>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
            </View>
          </Pressable>
        )}

        {isGuest && (
          <>
            <SectionLabel label={t("settings.accountSectionLabel")} />
            <GroupedList>
              <Pressable
                onPress={() => void handleBackupSync()}
                disabled={backupLoading}
                style={({ pressed }) => [
                  backupLoading && { opacity: 0.6 },
                  pressed && !backupLoading && { opacity: 0.7 },
                ]}
              >
                <View style={styles.menuItem}>
                  <View style={[styles.iconBox, styles.iconBoxAccent]}>
                    <CloudUpload size={16} color={colors.accent.primary} />
                  </View>
                  <View style={styles.backupTextCol}>
                    <Text style={styles.menuLabel}>
                      {backupLoading ? t("settings.connecting") : t("settings.backupSync")}
                    </Text>
                    <Text style={styles.backupSubtitle}>
                      {t("settings.backupSyncSubtitle")}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={colors.text.muted} />
                </View>
              </Pressable>
            </GroupedList>
          </>
        )}

        {/* Finance section */}
        <SectionLabel label={t("settings.financeSectionLabel")} />
        <GroupedList>
          <MenuItem
            icon={<Building2 size={16} color={colors.accent.primary} />}
            label={t("settings.manageAccounts")}
            onPress={() => router.push("/(app)/accounts")}
          />
          <MenuDivider />
          <MenuItem
            icon={<PiggyBank size={16} color={colors.accent.primary} />}
            label={t("settings.monthlyBudget")}
            onPress={() => router.push("/(app)/settings/budget")}
          />
          <MenuDivider />
          <MenuItem
            icon={<Tag size={16} color={colors.accent.primary} />}
            label={t("settings.categoriesMenu")}
            onPress={() => router.push("/(app)/settings/categories")}
          />
          <MenuDivider />
        </GroupedList>

        {/* Notification section */}
        <SectionLabel label={t("settings.notificationSectionLabel")} />
        <GroupedList>
          <View style={styles.menuItem}>
            <View style={styles.iconBox}>
              <Bell size={16} color={colors.accent.primary} />
            </View>
            <View style={styles.reminderTextCol}>
              <Text style={styles.menuLabel}>{t("settings.dailyReminderLabel")}</Text>
              <Text style={styles.reminderSubtitle}>
                {dailyReminderEnabled
                  ? t("settings.reminderActive", {
                      time: `${String(dailyReminderHour).padStart(2, "0")}:${String(dailyReminderMinute).padStart(2, "0")}`,
                    })
                  : t("settings.reminderInactive")}
              </Text>
            </View>
            <Switch
              value={dailyReminderEnabled}
              onValueChange={(v) => void handleReminderToggle(v)}
              trackColor={{ false: colors.bg.elevated, true: colors.accent.primary }}
              thumbColor="#fff"
            />
          </View>
          {dailyReminderEnabled && (
            <>
              <MenuDivider />
              <Pressable
                onPress={handleReminderTimeChange}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <View style={styles.menuItem}>
                  <View style={styles.iconBox} />
                  <Text style={[styles.menuLabel, { color: colors.accent.text }]}>
                    {t("settings.changeReminderTime")}
                  </Text>
                  <Text style={styles.valueText}>
                    {`${String(dailyReminderHour).padStart(2, "0")}:${String(dailyReminderMinute).padStart(2, "0")}`}
                  </Text>
                  <ChevronRight size={14} color={colors.text.muted} />
                </View>
              </Pressable>
            </>
          )}
        </GroupedList>

        {/* Language section */}
        <SectionLabel label={t("settings.language.section")} />
        <GroupedList>
          <Pressable
            onPress={() => setLanguageSheetOpen(true)}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <View style={styles.menuItem}>
              <View style={styles.iconBox}>
                <Languages size={16} color={colors.accent.primary} />
              </View>
              <Text style={styles.menuLabel}>{t("settings.language.row")}</Text>
              <Text style={styles.valueText}>
                {SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.nativeName ?? ""}
              </Text>
              <ChevronRight size={14} color={colors.text.muted} />
            </View>
          </Pressable>
        </GroupedList>

        {/* Legal section */}
        <SectionLabel label={t("settings.legalSectionLabel")} />
        <GroupedList>
          <ExternalMenuItem
            icon={<FileText size={16} color={colors.accent.primary} />}
            label={t("settings.termsMenu")}
            url="https://savyn-ten.vercel.app/terms"
          />
          <MenuDivider />
          <ExternalMenuItem
            icon={<Shield size={16} color={colors.accent.primary} />}
            label={t("settings.privacyMenu")}
            url="https://savyn-ten.vercel.app/privacy"
          />
        </GroupedList>

        {/* Help & feedback */}
        {whatsappUrl && (
          <>
            <SectionLabel label={t("settings.helpSectionLabel")} />
            <GroupedList>
              <ExternalMenuItem
                icon={<MessageCircle size={16} color={colors.accent.primary} />}
                label={t("settings.chatWithUs")}
                url={whatsappUrl}
              />
            </GroupedList>
          </>
        )}

        {/* Sign out + delete account (authenticated only) */}
        {!isGuest && (
          <>
            <Pressable onPress={handleSignOut} style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <View style={styles.signOutButton}>
                <LogOut size={18} color={colors.danger.text} />
                <Text style={styles.signOutLabel}>{t("settings.signOutCta")}</Text>
              </View>
            </Pressable>

            <View style={styles.sectionSeparator} />

            <GroupedList>
              <MenuItem
                icon={<Trash2 size={16} color={colors.danger.text} />}
                label={t("deleteAccount.headerTitle")}
                labelStyle={{ color: colors.danger.text }}
                onPress={() => router.push("/delete-account")}
              />
            </GroupedList>
          </>
        )}
      </ScrollView>

      <NotificationTimeSheet
        isVisible={timePickerOpen}
        selectedHour={dailyReminderHour}
        onSelect={handleTimeSelect}
        onDismiss={() => setTimePickerOpen(false)}
      />

      <LanguageSheet
        isVisible={languageSheetOpen}
        selected={languagePreference}
        onSelect={(pref) => {
          setLanguageSheetOpen(false);
          void setLanguagePreference(pref);
        }}
        onDismiss={() => setLanguageSheetOpen(false)}
      />
    </Screen>
  );
}

const GuestProfileHero = ({ name }: { name: string }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.profileHero}>
      <View style={styles.avatarWrapper}>
        <View style={[styles.avatar, styles.guestAvatar]}>
          <User size={36} color={colors.accent.primary} />
        </View>
      </View>
      <Text style={styles.profileName}>{name || t("settings.guestName")}</Text>
      <Text style={styles.profileEmail}>{t("settings.guestDataNote")}</Text>
    </View>
  );
};

const SectionLabel = ({ label }: { label: string }) => {
  return <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>;
};

const GroupedList = ({ children }: { children: React.ReactNode }) => {
  return <View style={styles.groupedList}>{children}</View>;
};

const MenuDivider = () => {
  return <View style={styles.divider} />;
};

const MenuItem = ({
  icon,
  label,
  labelStyle,
  onPress,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  labelStyle?: object;
  onPress: () => void;
  disabled?: boolean;
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        disabled && { opacity: 0.45 },
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      <View style={styles.menuItem}>
        <View style={styles.iconBox}>{icon}</View>
        <Text style={[styles.menuLabel, labelStyle]}>{label}</Text>
        <ChevronRight size={14} color={colors.text.muted} />
      </View>
    </Pressable>
  );
};

const ExternalMenuItem = ({
  icon,
  label,
  url,
}: {
  icon: React.ReactNode;
  label: string;
  url: string;
}) => {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <View style={styles.menuItem}>
        <View style={styles.iconBox}>{icon}</View>
        <Text style={styles.menuLabel}>{label}</Text>
        <ExternalLink size={14} color={colors.text.muted} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: TAB_BAR_CLEARANCE,
    gap: 8,
  },

  profileHero: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    paddingVertical: 28,
    paddingHorizontal: spacing["2xl"],
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.accent.subtle,
    borderWidth: 1.5,
    borderColor: colors.accent.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  guestAvatar: {
    borderStyle: "dashed",
  },
  profileName: {
    ...StyleSheet.flatten(textStyles.display),
    fontSize: 20,
    marginTop: 4,
  },
  profileEmail: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 13,
    color: colors.text.secondary,
  },

  sectionLabel: {
    ...StyleSheet.flatten(textStyles.overline),
    marginBottom: 6,
    marginLeft: 4,
    marginTop: 8,
  },
  groupedList: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    minHeight: 52,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBoxAccent: {
    backgroundColor: colors.accent.subtle,
  },
  menuLabel: {
    ...StyleSheet.flatten(textStyles.body),
    flex: 1,
  },
  backupTextCol: {
    flex: 1,
    gap: 2,
  },
  backupSubtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  reminderTextCol: {
    flex: 1,
    gap: 2,
  },
  reminderSubtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  valueText: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 14,
    color: colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: 60,
  },

  sectionSeparator: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginTop: spacing["2xl"],
    marginBottom: spacing.lg,
  },
  signOutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.danger.bg,
    borderRadius: radius.xl,
    paddingVertical: 16,
    marginTop: 8,
  },
  signOutLabel: {
    ...StyleSheet.flatten(textStyles.h2),
    fontSize: 16,
    color: colors.danger.text,
  },
});
