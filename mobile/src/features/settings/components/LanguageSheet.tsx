import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { SUPPORTED_LANGUAGES } from "@/i18n/registry";
import type { LanguagePreference } from "@/stores/language";
import { colors, radius, spacing, textStyles } from "@/theme";

interface Props {
  isVisible: boolean;
  selected: LanguagePreference;
  onSelect: (pref: LanguagePreference) => void;
  onDismiss: () => void;
}

function LanguageSheet({ isVisible, selected, onSelect, onDismiss }: Props) {
  const { t } = useTranslation();

  // "system" bukan bagian dari SUPPORTED_LANGUAGES (itu daftar bahasa, bukan
  // preferensi) — ditambah di sini sebagai baris pertama.
  const options: { pref: LanguagePreference; label: string }[] = [
    { pref: "system", label: t("settings.language.system") },
    ...SUPPORTED_LANGUAGES.map((lang) => ({ pref: lang.code, label: lang.nativeName })),
  ];

  return (
    <BottomSheet isVisible={isVisible} onDismiss={onDismiss}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("settings.language.sheetTitle")}</Text>
        <View style={styles.list}>
          {options.map((opt) => {
            const active = opt.pref === selected;
            return (
              <Pressable
                key={opt.pref}
                onPress={() => onSelect(opt.pref)}
                style={({ pressed }) => pressed && !active && styles.rowPressed}
              >
                <View style={[styles.row, active && styles.rowActive]}>
                  <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                    {opt.label}
                  </Text>
                  {active && <Check size={18} color={colors.accent.primary} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  list: {
    gap: spacing.sm,
  },
  rowPressed: {
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.canvas,
  },
  rowActive: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.subtle,
  },
  rowLabel: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
  rowLabelActive: {
    color: colors.accent.text,
    fontWeight: "600",
  },
});

export default React.memo(LanguageSheet);
