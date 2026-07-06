import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useRouter } from "expo-router";
import { Bot, Clock, Home, Target, User } from "lucide-react-native";
import { Fragment, useCallback } from "react";
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
import { useOnboardingStore } from "@/stores/onboarding";
import { handleTabPress } from "./tabPressUtils";

const TAB_ICONS: Record<string, typeof Home> = {
  "(home)": Home,
  history: Clock,
  goals: Target,
  settings: User,
};

const TAB_LABELS: Record<string, string> = {
  "(home)": "Beranda",
  history: "Aktivitas",
  goals: "Goal",
  settings: "Profil",
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dismissedBotCoachmark = useOnboardingStore((s) => s.dismissedBotCoachmark);
  const dismissBotCoachmark = useOnboardingStore((s) => s.dismissBotCoachmark);
  const dismissedGoalCoachmark = useOnboardingStore((s) => s.dismissedGoalCoachmark);
  const dismissGoalCoachmark = useOnboardingStore((s) => s.dismissGoalCoachmark);
  const activeCoachmark = !dismissedBotCoachmark ? "bot" : !dismissedGoalCoachmark ? "goal" : null;

  const fabScale = useSharedValue(1);
  const animatedFabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));
  const handleBotPress = useCallback(() => {
    fabScale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withSpring(1, { damping: 8, stiffness: 300 })
    );
    void dismissBotCoachmark();
    router.push("/ai-assistant");
  }, [fabScale, router, dismissBotCoachmark]);

  const visibleRoutes = state.routes.filter((r) => TAB_ICONS[r.name]);
  const left = visibleRoutes.slice(0, 2);
  const right = visibleRoutes.slice(2);

  const renderTab = (route: (typeof visibleRoutes)[0]) => {
    const focused = state.index === state.routes.indexOf(route);
    const Icon = TAB_ICONS[route.name];
    const label = TAB_LABELS[route.name];
    const isGoalTab = route.name === "goals";

    return (
      <View key={route.key} style={styles.tabWrap}>
        {isGoalTab && activeCoachmark === "goal" && (
          <Pressable onPress={() => void dismissGoalCoachmark()} style={styles.goalCoachmark}>
            <Text style={styles.coachmarkText}>Atur target nabung di sini 🎯</Text>
            <View style={styles.goalCoachmarkArrow} />
          </Pressable>
        )}
        <Pressable
          onPress={() => {
            if (isGoalTab) void dismissGoalCoachmark();
            handleTabPress({
              focused,
              routeName: route.name,
              routeState: route.state as { key?: string; index?: number } | undefined,
              navigate: (name) => navigation.navigate(name),
              dispatch: (action) => navigation.dispatch(action),
            });
          }}
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
      </View>
    );
  };

  return (
    <Fragment>
      {activeCoachmark && (
        <Pressable
          style={styles.dimOverlay}
          onPress={() =>
            void (activeCoachmark === "bot" ? dismissBotCoachmark() : dismissGoalCoachmark())
          }
        />
      )}
      <View style={[styles.outer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.fabWrap} pointerEvents="box-none">
          {activeCoachmark === "bot" && (
            <Pressable onPress={() => void dismissBotCoachmark()} style={styles.coachmark}>
              <Text style={styles.coachmarkText}>
                Coba chat, ucapin, atau foto struk di sini ✨
              </Text>
              <View style={styles.coachmarkArrow} />
            </Pressable>
          )}
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
    </Fragment>
  );
}

const styles = StyleSheet.create({
  dimOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
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
  coachmark: {
    position: "absolute",
    bottom: 80,
    left: "50%",
    transform: [{ translateX: -110 }],
    width: 220,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  coachmarkText: {
    ...StyleSheet.flatten(textStyles.caption),
    color: "#fff",
    textAlign: "center",
    lineHeight: 16,
  },
  coachmarkArrow: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    transform: [{ translateX: -6 }],
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.accent.primary,
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
    backgroundColor: "#FCEFE8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
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
    shadowOpacity: 0.15,
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
  tabWrap: {
    position: "relative",
  },
  goalCoachmark: {
    position: "absolute",
    bottom: "100%",
    marginBottom: 10,
    left: "50%",
    transform: [{ translateX: -45 }],
    width: 170,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  goalCoachmarkArrow: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    transform: [{ translateX: -46 }],
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.accent.primary,
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
