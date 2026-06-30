import { MoreVertical } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles } from "@/theme";

interface OverflowMenuItem {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
}

export function OverflowMenu({ items }: OverflowMenuProps) {
  const [visible, setVisible] = useState(false);

  const handleItemPress = (item: OverflowMenuItem) => {
    setVisible(false);
    item.onPress();
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <MoreVertical size={20} color={colors.text.muted} />
      </Pressable>

      {visible && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
          <View style={styles.card}>
            {items.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => handleItemPress(item)}
                style={({ pressed }) => [
                  index > 0 && styles.itemBorder,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.row}>
                  {item.icon ? <View style={styles.iconSlot}>{item.icon}</View> : null}
                  <Text
                    style={[
                      styles.label,
                      item.destructive && styles.labelDestructive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  pressed: {
    opacity: 0.6,
  },
  backdrop: {
    position: "absolute",
    top: -300,
    left: -500,
    right: -500,
    bottom: -1000,
    zIndex: 10,
  },
  card: {
    position: "absolute",
    top: 28,
    right: 0,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 190,
    zIndex: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  iconSlot: {
    width: 20,
    alignItems: "center",
  },
  label: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
  labelDestructive: {
    color: colors.danger.text,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
});
