import { useCallback, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Banknote,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  LogOut,
  Pencil,
  PiggyBank,
  Shield,
  User,
  Wallet,
} from 'lucide-react-native';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, spacing, textStyles } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }, [signOut]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const initial = (user?.email?.[0] ?? 'U').toUpperCase();
  const displayName = user?.email?.split('@')[0] ?? 'User';

  return (
    <Screen>
      <Header title="Settings" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile hero */}
        <Pressable
          onPress={() => router.push('/(app)/settings/profile')}
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
                onPress={(e) => { e.stopPropagation(); void pickImage(); }}
                style={styles.editBadge}
                hitSlop={8}
              >
                <Pencil size={12} color="#fff" />
              </Pressable>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>
        </Pressable>

        {/* Account section */}
        <SectionLabel label="Account" />
        <GroupedList>
          <MenuItem
            icon={<User size={16} color={colors.accent.primary} />}
            label="Personal Info"
            onPress={() => router.push('/(app)/settings/profile')}
          />
        </GroupedList>

        {/* Finance section */}
        <SectionLabel label="Finance" />
        <GroupedList>
          <MenuItem
            icon={<Wallet size={16} color={colors.accent.primary} />}
            label="Accounts & Wallets"
            onPress={() => router.push('/(app)/accounts')}
          />
          <MenuDivider />
          <MenuItem
            icon={<PiggyBank size={16} color={colors.accent.primary} />}
            label="Monthly Budget"
            onPress={() => router.push('/(app)/settings/budget')}
          />
          <MenuDivider />
          <ValueMenuItem
            icon={<Banknote size={16} color={colors.accent.primary} />}
            label="Default Currency"
            value="IDR"
          />
        </GroupedList>

        {/* Legal section */}
        <SectionLabel label="Legal" />
        <GroupedList>
          <ExternalMenuItem
            icon={<FileText size={16} color={colors.accent.primary} />}
            label="Terms of Service"
            url="https://example.com/terms"
          />
          <MenuDivider />
          <ExternalMenuItem
            icon={<Shield size={16} color={colors.accent.primary} />}
            label="Privacy Policy"
            url="https://example.com/privacy"
          />
        </GroupedList>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <View style={styles.signOutButton}>
            <LogOut size={18} color={colors.danger.text} />
            <Text style={styles.signOutLabel}>Sign Out</Text>
          </View>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>;
}

function GroupedList({ children }: { children: React.ReactNode }) {
  return <View style={styles.groupedList}>{children}</View>;
}

function MenuDivider() {
  return <View style={styles.divider} />;
}

function MenuItem({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
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
}

function ValueMenuItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.menuItem}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>{value}</Text>
        <ChevronDown size={14} color={colors.text.muted} />
      </View>
    </View>
  );
}

function ExternalMenuItem({
  icon,
  label,
  url,
}: {
  icon: React.ReactNode;
  label: string;
  url: string;
}) {
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
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 160,
    gap: 8,
  },

  profileHero: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    paddingVertical: 28,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.accent.subtle,
    borderWidth: 1.5,
    borderColor: colors.accent.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuLabel: {
    ...StyleSheet.flatten(textStyles.body),
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
