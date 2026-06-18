import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/ui/FloatingTabBar";

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="finance" />
      <Tabs.Screen name="accounts" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
