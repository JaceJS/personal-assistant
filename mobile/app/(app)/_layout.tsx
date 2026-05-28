import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth";
import { FloatingTabBar } from "@/components/ui/FloatingTabBar";

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
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="finance/index" />
      <Tabs.Screen name="insights/index" />
      <Tabs.Screen name="settings/index" />

      {/* Hidden from tab bar */}
      <Tabs.Screen name="journal/index" options={{ href: null }} />
      <Tabs.Screen name="finance/[id]" options={{ href: null }} />
      <Tabs.Screen name="finance/new" options={{ href: null }} />
      <Tabs.Screen name="finance/history" options={{ href: null }} />
      <Tabs.Screen name="accounts/index" options={{ href: null }} />
      <Tabs.Screen name="accounts/[id]" options={{ href: null }} />
      <Tabs.Screen name="categories/index" options={{ href: null }} />
      <Tabs.Screen name="settings/profile" options={{ href: null }} />
    </Tabs>
  );
}
