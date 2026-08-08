import { useCallback, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { colors, radius, spacing, textStyles } from "@/theme";

export interface CoachmarkAnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useCoachmarkAnchor() {
  const ref = useRef<View>(null);
  const [rect, setRect] = useState<CoachmarkAnchorRect | null>(null);

  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => setRect({ x, y, width, height }));
  }, []);

  return { ref, rect, onLayout };
}

const BUBBLE_MAX_WIDTH = 260;
const SCREEN_MARGIN = spacing.lg;
const DEFAULT_GAP = 10;
const ARROW_SIZE = 6;

interface CoachmarkProps {
  visible: boolean;
  anchor: CoachmarkAnchorRect | null;
  text: string;
  onDismiss: () => void;
  dismissA11yLabel: string;
  placement?: "above" | "below";
  /** Distance in px between target and bubble. Tune per call site. */
  gap?: number;
}

export function Coachmark({
  visible,
  anchor,
  text,
  onDismiss,
  dismissA11yLabel,
  placement = "below",
  gap = DEFAULT_GAP,
}: CoachmarkProps) {
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  if (!visible || !anchor) return null;

  const bubbleWidth = Math.min(BUBBLE_MAX_WIDTH, screenWidth - SCREEN_MARGIN * 2);
  const targetCenterX = anchor.x + anchor.width / 2;
  const left = Math.min(
    Math.max(targetCenterX - bubbleWidth / 2, SCREEN_MARGIN),
    screenWidth - bubbleWidth - SCREEN_MARGIN
  );
  const arrowLeft = Math.min(
    Math.max(targetCenterX - left - ARROW_SIZE, 12),
    bubbleWidth - 12 - ARROW_SIZE
  );

  const positionStyle: ViewStyle =
    placement === "below"
      ? { top: anchor.y + anchor.height + gap, left, width: bubbleWidth }
      : { bottom: screenHeight - anchor.y + gap, left, width: bubbleWidth };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.backdrop} />
      <View style={[styles.bubble, positionStyle]}>
        <Text style={styles.text}>{text}</Text>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={dismissA11yLabel}
        >
          {({ pressed }) => (
            <View style={[styles.okBtn, pressed && styles.okBtnPressed]}>
              <Text style={styles.okLabel}>{t("common.gotIt")}</Text>
            </View>
          )}
        </Pressable>
        <View
          style={[placement === "below" ? styles.arrowUp : styles.arrowDown, { left: arrowLeft }]}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  bubble: {
    position: "absolute",
    backgroundColor: colors.accent.primary,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  text: {
    ...StyleSheet.flatten(textStyles.caption),
    color: "#fff",
    lineHeight: 17,
  },
  okBtn: {
    alignSelf: "flex-end",
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: "#fff",
  },
  okBtnPressed: {
    opacity: 0.8,
  },
  okLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.accent.text,
    fontWeight: "700",
  },
  arrowUp: {
    position: "absolute",
    top: -ARROW_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: colors.accent.primary,
  },
  arrowDown: {
    position: "absolute",
    bottom: -ARROW_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderTopWidth: ARROW_SIZE,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.accent.primary,
  },
});
