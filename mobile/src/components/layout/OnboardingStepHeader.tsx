import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { textStyles } from "@/theme/typography";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

export function OnboardingStepHeader({ icon: Icon, title, subtitle }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.iconWrap}>
        <Icon size={24} color={colors.accent.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 24,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent.subtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    ...textStyles.display,
    fontSize: 24,
    lineHeight: 32,
    color: colors.text.primary,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.text.muted,
    marginTop: 8,
    lineHeight: 22,
  },
});
