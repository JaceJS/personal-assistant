import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/theme";

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export default function FilterPill({ label, active, onPress }: FilterPillProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.8 }}>
      <View style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}>
        <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    borderWidth: 1,
  },
  pillActive: { backgroundColor: colors.accent.primary, borderColor: colors.accent.primary },
  pillInactive: { backgroundColor: colors.bg.elevated, borderColor: colors.border.default },
  label: { fontSize: 13, fontWeight: "500" },
  labelActive: { color: colors.bg.canvas, fontWeight: "600" },
  labelInactive: { color: colors.text.muted },
});
