import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { BarChart2, Home, List, Settings } from "lucide-react-native";

import { useAuthStore } from "@/stores/auth";

export default function AppLayout() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && !session) {
      router.replace("/(auth)/login");
    }
  }, [initialized, session, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#111827",
          borderTopColor: "#334155",
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: { fontSize: 11, fontFamily: "Outfit_500Medium" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Beranda",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions/index"
        options={{
          title: "Transaksi",
          tabBarIcon: ({ color, size }) => <List size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights/index"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Pengaturan",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      {/* Detail screens — hidden from tab bar */}
      <Tabs.Screen name="transactions/[id]" options={{ href: null }} />
      <Tabs.Screen name="transactions/new" options={{ href: null }} />
      <Tabs.Screen name="accounts/index" options={{ href: null }} />
      <Tabs.Screen name="accounts/[id]" options={{ href: null }} />
      <Tabs.Screen name="categories/index" options={{ href: null }} />
      <Tabs.Screen name="settings/profile" options={{ href: null }} />
    </Tabs>
  );
}
