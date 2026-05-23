import { useCallback } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronRight,
  Grid3x3,
  LogOut,
  Tag,
  User,
  Wallet,
} from "lucide-react-native";

import { THEME } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const handleSignOut = useCallback(() => {
    Alert.alert("Keluar", "Yakin ingin keluar dari akun?", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: () => void signOut() },
    ]);
  }, [signOut]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 py-4">
        <Text className="font-bold text-2xl text-ink">Pengaturan</Text>
      </View>

      <View className="px-6 gap-4">
        {/* Profile card */}
        <Pressable
          onPress={() => router.push("/(app)/settings/profile")}
          className="rounded-2xl bg-card p-5 active:opacity-75"
        >
          <View className="flex-row items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-accent">
              <User size={22} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-base text-ink">
                {user?.email?.split("@")[0] ?? "Pengguna"}
              </Text>
              <Text className="text-sm text-muted">{user?.email ?? ""}</Text>
            </View>
            <ChevronRight size={16} color={THEME.colors.muted} />
          </View>
        </Pressable>

        {/* Finance menu */}
        <View>
          <Text
            style={{
              fontFamily: THEME.fontFamily.medium,
              fontSize: THEME.fontSize.xs,
              color: THEME.colors.muted,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
              paddingHorizontal: 4,
            }}
          >
            Keuangan
          </Text>
          <View className="rounded-2xl bg-card overflow-hidden">
            <MenuItem
              label="Kelola Akun"
              icon={<Wallet size={18} color={THEME.colors.muted} />}
              onPress={() => router.push("/(app)/accounts/index")}
            />
            <Divider />
            <MenuItem
              label="Kelola Kategori"
              icon={<Tag size={18} color={THEME.colors.muted} />}
              onPress={() => router.push("/(app)/categories/index")}
            />
          </View>
        </View>

        {/* App menu */}
        <View>
          <Text
            style={{
              fontFamily: THEME.fontFamily.medium,
              fontSize: THEME.fontSize.xs,
              color: THEME.colors.muted,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
              paddingHorizontal: 4,
            }}
          >
            Aplikasi
          </Text>
          <View className="rounded-2xl bg-card overflow-hidden">
            <MenuItem
              label="Profil"
              icon={<User size={18} color={THEME.colors.muted} />}
              onPress={() => router.push("/(app)/settings/profile")}
            />
            <Divider />
            <MenuItem
              label="Tampilan"
              icon={<Grid3x3 size={18} color={THEME.colors.muted} />}
              onPress={() => {}}
              disabled
              badge="Segera"
            />
          </View>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          className="flex-row items-center gap-3 rounded-2xl bg-danger/10 px-5 py-4 active:opacity-70"
        >
          <LogOut size={18} color={THEME.colors.danger} />
          <Text className="font-semibold text-base text-danger">Keluar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: THEME.colors.border, marginLeft: 52 }} />;
}

function MenuItem({
  label,
  icon,
  onPress,
  disabled = false,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center gap-3 px-5 py-4 ${disabled ? "opacity-50" : "active:opacity-70"}`}
    >
      {icon}
      <Text className="flex-1 text-base text-ink">{label}</Text>
      {badge ? (
        <View
          style={{
            backgroundColor: `${THEME.colors.accent}22`,
            borderRadius: THEME.radius.full,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontFamily: THEME.fontFamily.medium,
              fontSize: THEME.fontSize.xs,
              color: THEME.colors.accent,
            }}
          >
            {badge}
          </Text>
        </View>
      ) : (
        <ChevronRight size={16} color={THEME.colors.muted} />
      )}
    </Pressable>
  );
}
