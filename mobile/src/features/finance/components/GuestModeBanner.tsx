import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, CloudUpload } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, radius, spacing, textStyles } from "@/theme";

export default function GuestModeBanner() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Pressable onPress={() => router.push("/(app)/settings")}>
      {({ pressed }) => (
        <View style={[styles.card, pressed && styles.pressed]}>
          <View style={styles.iconWrap}>
            <CloudUpload size={16} color={colors.accent.primary} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{t("guest.banner.title")}</Text>
            <Text style={styles.subtitle}>{t("guest.banner.subtitle")}</Text>
          </View>
          <ChevronRight size={16} color={colors.text.muted} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginHorizontal: spacing["2xl"],
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  subtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
});
