import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, Mic, Settings, TrendingUp, Wallet } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/theme";

const TAB_ICONS: Record<string, typeof Home> = {
  index: Home,
  "transactions/index": Wallet,
  "insights/index": TrendingUp,
  "settings/index": Settings,
};

const TAB_LABELS: Record<string, string> = {
  index: "Home",
  "transactions/index": "Finance",
  "insights/index": "Insights",
  "settings/index": "Settings",
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) => TAB_ICONS[r.name]);

  const left = visibleRoutes.slice(0, 2);
  const right = visibleRoutes.slice(2);

  const renderTab = (route: (typeof visibleRoutes)[0]) => {
    const focused = state.index === state.routes.indexOf(route);
    const Icon = TAB_ICONS[route.name];
    const label = TAB_LABELS[route.name];

    return (
      <Pressable
        key={route.key}
        onPress={() => navigation.navigate(route.name)}
        style={styles.tab}
        hitSlop={8}
      >
        <Icon
          size={22}
          color={focused ? colors.accent.primary : colors.text.muted}
          strokeWidth={focused ? 2.2 : 1.5}
        />
        <Text
          style={[
            styles.label,
            focused ? styles.labelActive : styles.labelInactive,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.outer, { paddingBottom: insets.bottom + 8 }]}>
      {/* Mic FAB — sits above pill */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <View style={styles.fab}>
          <Mic size={26} color="#4F46E5" strokeWidth={2} />
        </View>
      </View>

      {/* Pill bar */}
      <View style={styles.pill}>
        <View style={styles.side}>{left.map(renderTab)}</View>
        {/* Gap for mic */}
        <View style={styles.gap} />
        <View style={styles.side}>{right.map(renderTab)}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  fabWrap: {
    position: "absolute",
    top: -32,
    alignSelf: "center",
    zIndex: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: "#E8E6FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7B6FE8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.elevated,
    borderRadius: 999,
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  side: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  gap: {
    width: 64,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    minWidth: 52,
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
  },
  labelActive: {
    fontWeight: "700",
    color: colors.accent.primary,
  },
  labelInactive: {
    fontWeight: "400",
    color: colors.text.muted,
  },
});
