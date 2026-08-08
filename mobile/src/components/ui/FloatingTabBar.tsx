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
import { useTranslation } from "react-i18next";

import { colors, radius, textStyles } from "@/theme";
import { useOnboardingStore } from "@/stores/onboarding";
import { useActiveCoachmark } from "@/hooks/useActiveCoachmark";
import { Coachmark, useCoachmarkAnchor } from "./Coachmark";
import { handleTabPress } from "./tabPressUtils";

export const TAB_BAR_CLEARANCE = 160;

const TAB_ICONS: Record<string, typeof Home> = {
  "(home)": Home,
  history: Clock,
  goals: Target,
  settings: User,
};

const TAB_LABEL_KEYS: Record<
  string,
  "tabs.home" | "tabs.history" | "tabs.goals" | "tabs.settings"
> = {
  "(home)": "tabs.home",
  history: "tabs.history",
  goals: "tabs.goals",
  settings: "tabs.settings",
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dismissCoachmark = useOnboardingStore((s) => s.dismissCoachmark);
  const activeCoachmark = useActiveCoachmark();
  const botAnchor = useCoachmarkAnchor();
  const goalAnchor = useCoachmarkAnchor();

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
    const label = t(TAB_LABEL_KEYS[route.name]);
    const isGoalTab = route.name === "goals";

    return (
      <View
        key={route.key}
        ref={isGoalTab ? goalAnchor.ref : undefined}
        onLayout={isGoalTab ? goalAnchor.onLayout : undefined}
      >
        <Pressable
          onPress={() => {
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
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: focused }}
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
      <Coachmark
        visible={activeCoachmark === "bot"}
        anchor={botAnchor.rect}
        text={t("tabBar.botCoachmarkText")}
        onDismiss={() => void dismissCoachmark("bot")}
        dismissA11yLabel={t("tabBar.dismissBotCoachmarkA11y")}
        placement="above"
        gap={-5}
      />
      <Coachmark
        visible={activeCoachmark === "goal"}
        anchor={goalAnchor.rect}
        text={t("tabBar.goalCoachmarkText")}
        onDismiss={() => void dismissCoachmark("goal")}
        dismissA11yLabel={t("tabBar.dismissGoalCoachmarkA11y")}
        placement="above"
        gap={-5}
      />
      <View style={[styles.outer, { paddingBottom: insets.bottom + 8 }]}>
        <View
          style={styles.fabWrap}
          pointerEvents="box-none"
          ref={botAnchor.ref}
          onLayout={botAnchor.onLayout}
        >
          <Pressable
            onPress={handleBotPress}
            style={styles.fabPressable}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("tabBar.openAiA11y")}
          >
            <Animated.View style={[styles.fab, animatedFabStyle]}>
              <Bot size={26} color="#FFFFFF" strokeWidth={2} />
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
    backgroundColor: colors.accent.primary,
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
