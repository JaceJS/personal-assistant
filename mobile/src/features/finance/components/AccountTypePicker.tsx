import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { colors } from "@/theme/colors";
import { radius } from "@/theme/radius";
import { textStyles } from "@/theme/typography";
import { ACCOUNT_TYPE_ORDER, accountTypeLabel } from "@/features/finance/constants";
import type { AccountType } from "@/features/finance/types";

const TYPE_EMOJI: Record<AccountType, string> = {
  bank: "🏦",
  cash: "💵",
  ewallet: "📱",
  credit: "💳",
};

type Props = {
  value: AccountType;
  onChange: (type: AccountType) => void;
};

export function AccountTypePicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.grid}>
      {ACCOUNT_TYPE_ORDER.map((type) => {
        const isSelected = value === type;
        return (
          <Pressable
            key={type}
            onPress={() => onChange(type)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
          >
            <View
              style={[
                styles.pill,
                isSelected ? styles.pillSelected : styles.pillDefault,
              ]}
            >
              <Text style={styles.emoji}>{TYPE_EMOJI[type]}</Text>
              <Text
                style={[
                  styles.label,
                  { color: isSelected ? "#fff" : colors.text.primary },
                ]}
              >
                {accountTypeLabel(t, type)}
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
