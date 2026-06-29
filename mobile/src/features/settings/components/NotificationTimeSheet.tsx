import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { colors, radius, spacing, textStyles } from "@/theme";

const PRESET_HOURS = [7, 8, 9, 12, 18, 20, 21, 22];

interface Props {
  isVisible: boolean;
  selectedHour: number;
  onSelect: (hour: number) => void;
  onDismiss: () => void;
}

function NotificationTimeSheet({ isVisible, selectedHour, onSelect, onDismiss }: Props) {
  return (
    <BottomSheet isVisible={isVisible} onDismiss={onDismiss}>
      <View style={styles.content}>
        <Text style={styles.title}>Pilih jam pengingat</Text>
        <View style={styles.grid}>
          {PRESET_HOURS.map((h) => {
            const active = h === selectedHour;
            return (
              <Pressable
                key={h}
                onPress={() => onSelect(h)}
                style={({ pressed }) => [
                  styles.tilePressable,
                  pressed && !active && styles.tilePressed,
                ]}
              >
                <View style={[styles.tile, active && styles.tileActive]}>
                  <Text style={[styles.tileLabel, active && styles.tileLabelActive]}>
                    {String(h).padStart(2, "0")}:00
                  </Text>
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tilePressable: {
    width: "22.5%",
  },
  tilePressed: {
    opacity: 0.6,
  },
  tile: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.canvas,
  },
  tileActive: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  tileLabel: {
    ...StyleSheet.flatten(textStyles.h3),
    fontSize: 14,
    color: colors.text.primary,
  },
  tileLabelActive: {
    color: "#fff",
  },
});

export default React.memo(NotificationTimeSheet);
