import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageCircle, Mic, ScanLine } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import { Logo } from "@/components/ui/Logo";
import { colors } from "@/theme/colors";
import { textStyles } from "@/theme/typography";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";

const FEATURES = [
  {
    key: "chat",
    icon: MessageCircle,
    labelKey: "onboarding.welcome.features.chat.label",
    descKey: "onboarding.welcome.features.chat.desc",
  },
  {
    key: "scan",
    icon: ScanLine,
    labelKey: "onboarding.welcome.features.scan.label",
    descKey: "onboarding.welcome.features.scan.desc",
  },
  {
    key: "voice",
    icon: Mic,
    labelKey: "onboarding.welcome.features.voice.label",
    descKey: "onboarding.welcome.features.voice.desc",
  },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isGuest, initialized } = useAuthStore();
  const { showToast } = useToastStore();
  const [loginLoading, setLoginLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  // Google login successful: route through profile onboarding (don't skip steps)
  useEffect(() => {
    if (initialized && !isGuest) {
      router.replace("/onboarding/profile");
    }
  }, [isGuest, initialized, router]);

  const handleGoogleLogin = useCallback(async () => {
    setLoginLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === "error") showToast(t("auth.loginError"), "error");
    } finally {
      setLoginLoading(false);
    }
  }, [showToast, t]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Decorative background rings */}
      <View style={styles.ringTopRight} />
      <View style={styles.ringTopRightInner} />
      <View style={styles.ringBottomLeft} />

      <OnboardingHeader currentStep={1} totalSteps={3} />

      <Animated.View
        style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Hero icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconCircle}>
            <Logo size={56} />
          </View>
        </Animated.View>

        {/* Headline */}
        <View style={styles.headline}>
          <Text style={styles.headlineText}>
            {t("onboarding.welcome.headlineLine1")}
            {"\n"}
            <Text style={styles.headlineAccent}>{t("onboarding.welcome.headlineAccent")}</Text>
          </Text>
          <Text style={styles.subtitle}>{t("onboarding.welcome.subtitle")}</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map(({ key, icon: Icon, labelKey, descKey }) => (
            <View key={key} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Icon size={20} color={colors.accent.primary} />
              </View>
              <Text style={styles.featureLabel}>{t(labelKey)}</Text>
              <Text style={styles.featureDesc}>{t(descKey)}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Pressable
            onPress={() => router.push("/onboarding/profile")}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>{t("onboarding.welcome.ctaPrimary")}</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleGoogleLogin}
            disabled={loginLoading}
            style={({ pressed }) => ({ opacity: pressed || loginLoading ? 0.7 : 1 })}
          >
            <Text style={styles.loginLink}>
              {loginLoading ? t("auth.openingGoogle") : t("onboarding.welcome.loginLink")}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  ringTopRight: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.accent.primary,
    opacity: 0.07,
  },
  ringTopRightInner: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent.border,
    opacity: 0.1,
  },
  ringBottomLeft: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.accent.primary,
    opacity: 0.06,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing["2xl"],
    alignItems: "center",
  },
  iconWrap: {
    marginTop: 40,
    alignItems: "center",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  headline: {
    marginTop: 36,
    alignItems: "center",
  },
  headlineText: {
    ...textStyles.display,
    fontSize: 36,
    textAlign: "center",
    lineHeight: 44,
  },
  headlineAccent: {
    color: colors.accent.primary,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: 12,
  },
  features: {
    flexDirection: "row",
    marginTop: 36,
    gap: 20,
    justifyContent: "center",
  },
  featureItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    ...textStyles.h3,
    fontSize: 12,
    textAlign: "center",
  },
  featureDesc: {
    ...textStyles.caption,
    textAlign: "center",
    lineHeight: 16,
  },
  cta: {
    marginTop: "auto",
    paddingBottom: 24,
    paddingTop: 32,
    width: "100%",
    gap: 12,
    alignItems: "center",
  },
  ctaButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: "center",
    width: "100%",
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    ...textStyles.h2,
    color: "#fff",
  },
  loginLink: {
    ...textStyles.body,
    color: colors.accent.primary,
    paddingVertical: 8,
    textAlign: "center",
  },
});
