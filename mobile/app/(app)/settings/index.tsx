import { useCallback, useState } from "react";
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Building2,
  ChevronRight,
  CloudUpload,
  ExternalLink,
  FileText,
  LogOut,
  Pencil,
  PiggyBank,
  Shield,
  Tag,
  User,
} from "lucide-react-native";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { getDisplayName } from "@/lib/getDisplayName";
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";
import { colors, radius, spacing, textStyles } from "@/theme";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isGuest, signOut } = useAuthStore();
  const { showToast } = useToastStore();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  const handleSignOut = useCallback(() => {
    Alert.alert("Keluar", "Yakin mau keluar?", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: () => void signOut() },
    ]);
  }, [signOut]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleBackupSync = useCallback(async () => {
    setBackupLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === "error") showToast("Login gagal, coba lagi ya", "error");
    } finally {
      setBackupLoading(false);
    }
  }, [showToast]);

  const displayName = getDisplayName(user);
  const initial = displayName[0]?.toUpperCase() ?? "U";

  return (
    <Screen>
      <Header title="Profil" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isGuest ? (
          <GuestProfileHero />
        ) : (
          <Pressable
            onPress={() => router.push("/(app)/settings/profile")}
            style={({ pressed }) => pressed && { opacity: 0.75 }}
          >
            <View style={styles.profileHero}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatar}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{initial}</Text>
                  )}
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    void pickImage();
                  }}
                  style={styles.editBadge}
                  hitSlop={8}
                >
                  <Pencil size={12} color="#fff" />
                </Pressable>
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
            <SectionLabel label="Akun" />
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
                      {backupLoading ? "Menghubungkan..." : "Backup & Sinkronisasi"}
                    </Text>
                    <Text style={styles.backupSubtitle}>
                      Masuk dengan Google untuk menyimpan data
                    </Text>
                  </View>
                  <ChevronRight size={14} color={colors.text.muted} />
                </View>
              </Pressable>
            </GroupedList>
          </>
        )}

        {/* Finance section */}
        <SectionLabel label="Keuangan" />
        <GroupedList>
          <MenuItem
            icon={<Building2 size={16} color={colors.accent.primary} />}
            label="Kelola Akun"
            onPress={() => router.push("/(app)/accounts")}
          />
          <MenuDivider />
          <MenuItem
            icon={<PiggyBank size={16} color={colors.accent.primary} />}
            label="Budget Bulanan"
            onPress={() => router.push("/(app)/settings/budget")}
          />
          <MenuDivider />
          <MenuItem
            icon={<Tag size={16} color={colors.accent.primary} />}
            label="Kategori"
            onPress={() => router.push("/(app)/settings/categories")}
          />
          <MenuDivider />
        </GroupedList>

        {/* Legal section */}
        <SectionLabel label="Legal" />
        <GroupedList>
          <ExternalMenuItem
            icon={<FileText size={16} color={colors.accent.primary} />}
            label="Syarat & Ketentuan"
            url="https://example.com/terms"
          />
          <MenuDivider />
          <ExternalMenuItem
            icon={<Shield size={16} color={colors.accent.primary} />}
            label="Kebijakan Privasi"
            url="https://example.com/privacy"
          />
        </GroupedList>

        {/* Sign out (authenticated only) */}
        {!isGuest && (
          <Pressable onPress={handleSignOut} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <View style={styles.signOutButton}>
              <LogOut size={18} color={colors.danger.text} />
              <Text style={styles.signOutLabel}>Keluar</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

const GuestProfileHero = () => (
  <View style={styles.profileHero}>
    <View style={styles.avatarWrapper}>
      <View style={[styles.avatar, styles.guestAvatar]}>
        <User size={36} color={colors.accent.primary} />
      </View>
    </View>
    <Text style={styles.profileName}>Guest</Text>
    <Text style={styles.profileEmail}>Data tersimpan di perangkat ini</Text>
  </View>
);

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
  onPress,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
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
        <Text style={styles.menuLabel}>{label}</Text>
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
    paddingBottom: 160,
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
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
  },
  avatarText: {
    ...StyleSheet.flatten(textStyles.display),
    color: colors.accent.primary,
  },
  editBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
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
