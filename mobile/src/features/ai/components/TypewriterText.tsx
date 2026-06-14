import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { colors, textStyles } from "@/theme";

export function TypewriterText({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
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
  }, [text, speed]);

  return <Text style={styles.text}>{displayed}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.primary,
  },
});
