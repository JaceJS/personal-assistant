import { useCallback } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, LogOut, User } from "lucide-react-native";

import { useAuthStore } from "@/stores/auth";

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();

  const handleSignOut = useCallback(() => {
    Alert.alert("Keluar", "Yakin ingin keluar dari akun?", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: () => void signOut() },
    ]);
  }, [signOut]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 py-4">
        <Text className="font-bold text-2xl text-ink">Pengaturan</Text>
      </View>

      <View className="px-6 gap-4">
        {/* Profile card */}
        <View className="rounded-2xl bg-card p-5">
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
          </View>
        </View>

        {/* Menu items */}
        <View className="rounded-2xl bg-card overflow-hidden">
          <MenuItem label="Profil" icon={<User size={18} color="#94a3b8" />} />
        </View>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          className="flex-row items-center gap-3 rounded-2xl bg-danger/10 px-5 py-4 active:opacity-70"
        >
          <LogOut size={18} color="#f43f5e" />
          <Text className="font-semibold text-base text-danger">Keluar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MenuItem({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Pressable className="flex-row items-center gap-3 px-5 py-4 active:opacity-70">
      {icon}
      <Text className="flex-1 text-base text-ink">{label}</Text>
      <ChevronRight size={16} color="#94a3b8" />
    </Pressable>
  );
}
