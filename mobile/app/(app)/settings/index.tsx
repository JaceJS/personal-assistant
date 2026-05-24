import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Grid3x3, LogOut, Tag, User, Wallet } from 'lucide-react-native';

import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';
import { useAuthStore } from '@/stores/auth';
import { colors, radius, spacing } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }, [signOut]);

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
        {/* Profile card */}
        <Pressable
          onPress={() => router.push('/(app)/settings/profile')}
          style={({ pressed }) => pressed && { opacity: 0.75 }}
        >
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email ?? ''}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.text.muted} />
          </View>
        </Pressable>

        {/* Finance section */}
        <SectionLabel label="Finance" />
        <GroupedList>
          <MenuItem
            icon={<Wallet size={18} color={colors.text.muted} />}
            label="Manage Accounts"
            onPress={() => router.push('/(app)/accounts')}
          />
          <MenuDivider />
          <MenuItem
            icon={<Tag size={18} color={colors.text.muted} />}
            label="Manage Categories"
            onPress={() => router.push('/(app)/categories')}
          />
        </GroupedList>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <View style={styles.signOutRow}>
            <LogOut size={18} color={colors.danger.text} />
            <Text style={styles.signOutLabel}>Sign out</Text>
          </View>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
  );
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
        <View style={styles.menuIcon}>{icon}</View>
        <Text style={styles.menuLabel}>{label}</Text>
        <ChevronRight size={14} color={colors.text.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing['2xl'], paddingBottom: 32, gap: 8 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.accent.subtle,
    borderWidth: 1,
    borderColor: colors.accent.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '500', color: colors.text.primary },
  profileEmail: { fontSize: 12, color: colors.text.muted, marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.text.muted,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
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
    paddingVertical: 14,
    gap: 12,
    minHeight: 44,
  },
  menuIcon: { width: 24, alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '400', color: colors.text.primary },
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginLeft: 52,
  },

  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.danger.bg,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    minHeight: 44,
  },
  signOutLabel: { fontSize: 15, fontWeight: '500', color: colors.danger.text },
});
