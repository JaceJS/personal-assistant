import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/theme';

interface CategoryIconProps {
  icon?: string | null;      // Emoji string (e.g. "🍔")
  color?: string | null;     // Color string (e.g. "#FF5733")
  size?: number;             // Total circle size (default: 44)
  emojiSize?: number;        // Emoji font size (default: 22)
  style?: ViewStyle;         // Additional container style
  textStyle?: TextStyle;     // Additional text style
}

export function CategoryIcon({
  icon,
  color,
  size = 44,
  emojiSize = 22,
  style,
  textStyle,
}: CategoryIconProps) {
  const tintColor = color ?? colors.accent.primary;
  const emoji = icon ?? '🏷️';

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${tintColor}28`, // ~15% opacity tint
        },
        style,
      ]}
    >
      <Text style={[styles.emoji, { fontSize: emojiSize, lineHeight: emojiSize + 4 }, textStyle]}>
        {emoji}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: {
    textAlign: 'center',
  },
});

export default React.memo(CategoryIcon);
