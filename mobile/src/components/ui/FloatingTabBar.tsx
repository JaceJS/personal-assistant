import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Bot, Clock, Home, Settings, Target } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, textStyles } from "@/theme";
import { handleTabPress } from "./tabPressUtils";

const TAB_ICONS: Record<string, typeof Home> = {
  "(home)": Home,
  goals: Target,
  history: Clock,
  settings: Settings,
};

const TAB_LABELS: Record<string, string> = {
  "(home)": "Home",
  goals: "Goal",
  history: "Aktivitas",
  settings: "Settings",
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fabScale = useSharedValue(1);
  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));
  const handleBotPress = useCallback(() => {
    fabScale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );
    router.push("/ai-assistant");
  }, [fabScale, router]);

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
        onPress={() =>
          handleTabPress({
            focused,
            routeName: route.name,
            routeState: route.state as { key?: string; index?: number } | undefined,
            navigate: (name) => navigation.navigate(name),
            dispatch: (action) => navigation.dispatch(action),
          })
        }
        style={styles.tab}
        hitSlop={8}
      >
        <Icon
          size={22}
          color={focused ? colors.accent.primary : colors.text.muted}
          strokeWidth={focused ? 2.2 : 1.5}
        />
        <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.outer, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable onPress={handleBotPress} style={styles.fabPressable} hitSlop={10}>
          <Animated.View style={[styles.fab, animatedFabStyle]}>
            <Bot size={26} color={colors.accent.primary} strokeWidth={2} />
          </Animated.View>
        </Pressable>
      </View>

      <View style={styles.pill}>
        <View style={styles.side}>{left.map(renderTab)}</View>
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
  fabPressable: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
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
    borderRadius: radius.full,
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
    ...StyleSheet.flatten(textStyles.overline),
    fontSize: 10,
  },
  labelActive: {
    color: colors.accent.primary,
  },
  labelInactive: {
    color: colors.text.muted,
  },
});
