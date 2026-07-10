import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { colors, textStyles } from "@/theme";

export function TypewriterText({
  text,
  speed = 15,
  animate = true,
}: {
  text: string;
  speed?: number;
  animate?: boolean;
}) {
  const [displayed, setDisplayed] = useState(animate ? "" : text);
  const indexRef = useRef(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) {
      setDisplayed(text);
      indexRef.current = text.length;
      return;
    }
    if (!text) {
      setDisplayed("");
      indexRef.current = 0;
      return;
    }
    const interval = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, animate]);

  return <Text style={styles.text}>{displayed}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
});
