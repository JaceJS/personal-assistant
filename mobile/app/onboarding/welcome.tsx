import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mic, TrendingUp, BookOpen } from "lucide-react-native";

import { THEME } from "@/constants/theme";

const FEATURES = [
  {
    icon: Mic,
    label: "Catat via suara",
    desc: "Cukup bicara, transaksi tercatat otomatis",
  },
  {
    icon: TrendingUp,
    label: "Lacak keuangan",
    desc: "Lihat pola pengeluaran & pemasukan",
  },
  {
    icon: BookOpen,
    label: "Jurnal harian",
    desc: "Refleksi & catatan pribadi (segera hadir)",
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
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }}>
      {/* Decorative background rings */}
      <View
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: THEME.colors.accent,
          opacity: 0.07,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: THEME.colors.accentSecondary,
          opacity: 0.1,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 250,
          height: 250,
          borderRadius: 125,
          backgroundColor: THEME.colors.accent,
          opacity: 0.06,
        }}
      />

      <Animated.View
        style={{
          flex: 1,
          paddingHorizontal: THEME.spacing.lg,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Logo / Icon */}
        <Animated.View
          style={{
            marginTop: 48,
            alignItems: "center",
            transform: [{ scale: scaleAnim }],
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 28,
              backgroundColor: THEME.colors.accent,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: THEME.colors.accent,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            <Mic size={40} color="#fff" />
          </View>
        </Animated.View>

        {/* Headline */}
        <View style={{ marginTop: 40 }}>
          <Text
            style={{
              fontFamily: THEME.fontFamily.bold,
              fontSize: 34,
              color: THEME.colors.ink,
              lineHeight: 42,
            }}
          >
            Kenali keuanganmu{"\n"}
            <Text style={{ color: THEME.colors.accent }}>bersama suara.</Text>
          </Text>
          <Text
            style={{
              fontFamily: THEME.fontFamily.regular,
              fontSize: THEME.fontSize.base,
              color: THEME.colors.muted,
              marginTop: 12,
              lineHeight: 22,
            }}
          >
            Asisten pribadi berbasis suara untuk mencatat keuangan, jurnal, dan lebih banyak lagi.
          </Text>
        </View>

        {/* Feature list */}
        <View style={{ marginTop: 40, gap: 16 }}>
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: THEME.colors.card,
                borderRadius: THEME.radius.lg,
                padding: 16,
                borderWidth: 1,
                borderColor: THEME.colors.border,
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: THEME.radius.md,
                  backgroundColor: `${THEME.colors.accent}22`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} color={THEME.colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: THEME.fontFamily.semibold,
                    fontSize: THEME.fontSize.base,
                    color: THEME.colors.ink,
                  }}
                >
                  {label}
                </Text>
                <Text
                  style={{
                    fontFamily: THEME.fontFamily.regular,
                    fontSize: THEME.fontSize.sm,
                    color: THEME.colors.muted,
                    marginTop: 2,
                  }}
                >
                  {desc}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={{ marginTop: "auto", paddingBottom: 24, paddingTop: 32 }}>
          <Pressable
            onPress={() => router.push("/onboarding/create-account")}
            style={({ pressed }) => ({
              backgroundColor: THEME.colors.accent,
              borderRadius: THEME.radius.lg,
              paddingVertical: 16,
              alignItems: "center",
              opacity: pressed ? 0.85 : 1,
              shadowColor: THEME.colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            })}
          >
            <Text
              style={{
                fontFamily: THEME.fontFamily.bold,
                fontSize: THEME.fontSize.md,
                color: "#fff",
              }}
            >
              Mulai Sekarang
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
