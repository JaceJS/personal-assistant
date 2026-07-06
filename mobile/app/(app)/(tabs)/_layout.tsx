import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/ui/FloatingTabBar";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="goals" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
