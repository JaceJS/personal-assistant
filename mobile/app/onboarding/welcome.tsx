import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageCircle, Mic, ScanLine, Sparkles } from "lucide-react-native";

import { colors } from "@/theme/colors";
import { textStyles } from "@/theme/typography";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";

const FEATURES = [
  {
    icon: MessageCircle,
    label: "Chat AI",
    desc: "Tanya, catat, dan analisis lewat obrolan",
  },
  {
    icon: ScanLine,
    label: "Scan Struk",
    desc: "Foto struk, langsung tercatat otomatis",
  },
  {
    icon: Mic,
    label: "Input Suara",
    desc: "Ucapkan transaksi, AI yang mencatat",
  },
];

export default function WelcomeScreen() {
  const router = useRouter();

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

  return (
    <SafeAreaView style={styles.safe}>
      {/* Decorative background rings */}
      <View style={styles.ringTopRight} />
      <View style={styles.ringTopRightInner} />
      <View style={styles.ringBottomLeft} />

      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Hero icon */}
        <Animated.View
          style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={styles.iconCircle}>
            <Sparkles size={40} color="#fff" />
          </View>
        </Animated.View>

        {/* Headline */}
        <View style={styles.headline}>
          <Text style={styles.headlineText}>
            AI yang paham{"\n"}
            <Text style={styles.headlineAccent}>keuanganmu.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Catat via chat, suara, atau foto struk.{"\n"}
            Dapatkan insight yang benar-benar personal.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <View key={label} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Icon size={20} color={colors.accent.primary} />
              </View>
              <Text style={styles.featureLabel}>{label}</Text>
              <Text style={styles.featureDesc}>{desc}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Pressable
            onPress={() => router.push("/onboarding/create-account")}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>Mulai Sekarang</Text>
            </View>
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
    marginTop: 48,
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
    marginTop: 48,
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
  },
  ctaButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
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
});
