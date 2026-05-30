import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, User } from "lucide-react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { THEME } from "@/constants/theme";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();

  const displayName = user?.email?.split("@")[0] ?? "";
  const [name, setName] = useState(displayName);

  const handleSave = useCallback(() => {
    // TODO: implement profile update via Supabase user metadata
    showToast("Profile saved (coming soon)", "info");
  }, [showToast]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: THEME.spacing.lg,
          paddingVertical: 16,
        }}
      >
        <Pressable onPress={() => router.back()}>
          {({ pressed }) => (
            <ArrowLeft size={22} color={THEME.colors.muted} style={{ opacity: pressed ? 0.5 : 1 }} />
          )}
        </Pressable>
        <Text
          style={{
            fontFamily: THEME.fontFamily.bold,
            fontSize: THEME.fontSize.xl,
            color: THEME.colors.ink,
          }}
        >
          Profile
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: THEME.spacing.lg, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={{ alignItems: "center", marginTop: 24, marginBottom: 36 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: THEME.colors.accent,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <User size={36} color="#fff" />
          </View>
          <Text
            style={{
              fontFamily: THEME.fontFamily.semibold,
              fontSize: THEME.fontSize.lg,
              color: THEME.colors.ink,
            }}
          >
            {displayName}
          </Text>
          <Text
            style={{
              fontFamily: THEME.fontFamily.regular,
              fontSize: THEME.fontSize.sm,
              color: THEME.colors.muted,
              marginTop: 4,
            }}
          >
            {user?.email ?? ""}
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <Input
            label="Display Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />
          <Input
            label="Email"
            value={user?.email ?? ""}
            editable={false}
            style={{ opacity: 0.5 }}
          />
        </View>

        <View style={{ marginTop: 32 }}>
          <Button label="Save Changes" onPress={handleSave} fullWidth />
        </View>

        <View
          style={{
            marginTop: 16,
            backgroundColor: `${THEME.colors.warning}18`,
            borderRadius: THEME.radius.lg,
            padding: 14,
          }}
        >
          <Text
            style={{
              fontFamily: THEME.fontFamily.medium,
              fontSize: THEME.fontSize.sm,
              color: THEME.colors.warning,
              textAlign: "center",
            }}
          >
            Profile updates will be available in the next version.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
