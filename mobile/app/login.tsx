import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Sparkles } from "lucide-react-native";

import { colors } from "@/theme/colors";
import { textStyles } from "@/theme/typography";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { signInWithGoogle } from "@/lib/auth/signInWithGoogle";

export default function LoginScreen() {
  const router = useRouter();
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

  useEffect(() => {
    if (initialized && !isGuest) {
      router.replace("/(app)");
    }
  }, [initialized, isGuest, router]);

  const handleGoogleLogin = useCallback(async () => {
    setLoginLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result === "error") showToast("Login gagal, coba lagi ya", "error");
      // "success": useEffect above handles navigate
      // "cancelled": stay on screen
    } finally {
      setLoginLoading(false);
    }
  }, [showToast]);

  const handleContinueAsGuest = useCallback(() => {
    router.replace("/(app)");
  }, [router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.ringTopRight} />
      <View style={styles.ringTopRightInner} />
      <View style={styles.ringBottomLeft} />

      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconCircle}>
            <Sparkles size={40} color="#fff" />
          </View>
        </Animated.View>

        <View style={styles.headline}>
          <Text style={styles.headlineText}>Selamat datang{"\n"}kembali!</Text>
          <Text style={styles.subtitle}>
            Masuk untuk melihat data & insight kamu.
          </Text>
        </View>

        <View style={styles.cta}>
          <Pressable
            onPress={() => void handleGoogleLogin()}
            disabled={loginLoading}
            style={({ pressed }) => ({ opacity: pressed || loginLoading ? 0.7 : 1 })}
          >
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>
                {loginLoading ? "Membuka Google..." : "Masuk dengan Google"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleContinueAsGuest}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={styles.guestLink}>Lanjut tanpa akun →</Text>
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
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.accent.primary,
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
    ...StyleSheet.flatten(textStyles.h1),
    fontSize: 32,
    textAlign: "center",
    lineHeight: 40,
    color: colors.text.primary,
  },
  subtitle: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.secondary,
    textAlign: "center",
    marginTop: 12,
  },
  cta: {
    marginTop: 48,
    width: "100%",
    gap: 16,
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
    ...StyleSheet.flatten(textStyles.h2),
    color: "#fff",
  },
  guestLink: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    paddingVertical: 4,
  },
});
