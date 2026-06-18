import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { textStyles } from "@/theme/typography";
import type { AccountType } from "@/features/finance/types";

const ACCOUNT_TYPES: { value: AccountType; label: string; emoji: string }[] = [
  { value: "bank", label: "Bank", emoji: "🏦" },
  { value: "cash", label: "Tunai", emoji: "💵" },
  { value: "ewallet", label: "E-Wallet", emoji: "📱" },
  { value: "credit", label: "Kartu Kredit", emoji: "💳" },
];

type Props = {
  value: AccountType;
  onChange: (type: AccountType) => void;
};

export function AccountTypePicker({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {ACCOUNT_TYPES.map((t) => {
        const isSelected = value === t.value;
        return (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View
              style={[
                styles.pill,
                isSelected ? styles.pillSelected : styles.pillDefault,
              ]}
            >
              <Text style={styles.emoji}>{t.emoji}</Text>
              <Text
                style={[
                  styles.label,
                  { color: isSelected ? "#fff" : colors.text.primary },
                ]}
              >
                {t.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  pillDefault: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border.default,
  },
  pillSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  emoji: {
    fontSize: 16,
  },
  label: {
    ...textStyles.h3,
  },
});
