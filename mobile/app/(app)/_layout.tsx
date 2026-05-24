import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { BookOpen, Home, Settings, Wallet } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/auth";
import { colors } from "@/theme";

function TabIcon({
  icon: Icon,
  label,
  focused,
}: {
  icon: typeof Home;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={tabStyles.iconWrap}>
      <Icon
        size={22}
        color={focused ? colors.accent.primary : colors.text.muted}
        strokeWidth={focused ? 2 : 1.5}
      />
      {focused && <Text style={tabStyles.label}>{label}</Text>}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: "center", justifyContent: "center", gap: 3, minWidth: 44 },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.accent.primary,
  },
});

export default function AppLayout() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (initialized && !session) {
      router.replace("/(auth)/login");
    }
  }, [initialized, session, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.bg.elevated,
          borderTopColor: colors.border.subtle,
          borderTopWidth: 1,
          height: 80 + insets.bottom / 2,
          paddingTop: 10,
          paddingBottom: insets.bottom / 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={Home} label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions/index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={Wallet} label="Finance" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="journal/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={BookOpen} label="Journal" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Settings} label="Settings" focused={focused} />
          ),
        }}
      />

      {/* Hidden from tab bar */}
      <Tabs.Screen name="transactions/[id]" options={{ href: null }} />
      <Tabs.Screen name="transactions/new" options={{ href: null }} />
      <Tabs.Screen name="accounts/index" options={{ href: null }} />
      <Tabs.Screen name="accounts/[id]" options={{ href: null }} />
      <Tabs.Screen name="categories/index" options={{ href: null }} />
      <Tabs.Screen name="settings/profile" options={{ href: null }} />
      <Tabs.Screen name="insights/index" options={{ href: null }} />
    </Tabs>
  );
}
