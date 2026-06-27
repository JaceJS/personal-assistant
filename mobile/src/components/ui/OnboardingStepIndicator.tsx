import { StyleSheet, View } from "react-native";
import { colors } from "@/theme/colors";

type Props = { total: number; current: number };

export function OnboardingStepIndicator({ total, current }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isDone = step < current;
        const isCurrent = step === current;
        return (
          <View
            key={step}
            style={[
              styles.pill,
              isDone || isCurrent ? styles.active : styles.upcoming,
              isDone && styles.done,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flex: 1,
    gap: 6,
  },
  pill: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  active: {
    backgroundColor: colors.accent.primary,
  },
  done: {
    opacity: 0.5,
  },
  upcoming: {
    backgroundColor: colors.border.default,
  },
});
