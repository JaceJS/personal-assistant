import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles } from "@/theme";
import type { UserTextMessage } from "@/features/finance/utils/chatMessageUtils";

export function UserBubble({
  message,
  onLongPress,
}: {
  message: UserTextMessage;
  onLongPress?: (message: UserTextMessage, x: number, y: number) => void;
}) {
  return (
    <Pressable
      testID="user-bubble"
      onLongPress={
        onLongPress
          ? (e) => onLongPress(message, e.nativeEvent.pageX, e.nativeEvent.pageY)
          : undefined
      }
      delayLongPress={350}
    >
      <View style={styles.wrap}>
        <View style={styles.bubble}>
          <Text style={styles.text}>{message.content}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-end",
  },
  bubble: {
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    padding: spacing.md,
    maxWidth: "80%",
  },
  text: {
    ...StyleSheet.flatten(textStyles.body),
    color: "#FFFFFF",
  },
});
