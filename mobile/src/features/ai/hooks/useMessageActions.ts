import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import type { TFunction } from "i18next";

import type {
  AIMessage,
  Message,
  UserTextMessage,
} from "@/features/finance/utils/chatMessageUtils";

const COPIED_HINT_DURATION_MS = 1200;

interface ActionMenuTarget {
  message: UserTextMessage | AIMessage;
  x: number;
  y: number;
}

interface UseMessageActionsOptions {
  deleteMessage: (message: Message) => Promise<void>;
  showToast: (message: string, type: "success" | "error") => void;
  t: TFunction;
}

export function useMessageActions({ deleteMessage, showToast, t }: UseMessageActionsOptions) {
  const [actionMenu, setActionMenu] = useState<ActionMenuTarget | null>(null);
  const [showCopiedHint, setShowCopiedHint] = useState(false);
  const copiedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedHintTimerRef.current) clearTimeout(copiedHintTimerRef.current);
    };
  }, []);

  const handleMessageLongPress = useCallback(
    (message: UserTextMessage | AIMessage, x: number, y: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setActionMenu({ message, x, y });
    },
    []
  );

  const dismissActionMenu = useCallback(() => setActionMenu(null), []);

  const handleCopyMessage = useCallback(() => {
    const message = actionMenu?.message;
    setActionMenu(null);
    if (!message) return;
    const text = message.type === "user" ? message.content : (message.content ?? "");
    void Clipboard.setStringAsync(text);
    setShowCopiedHint(true);
    if (copiedHintTimerRef.current) clearTimeout(copiedHintTimerRef.current);
    copiedHintTimerRef.current = setTimeout(
      () => setShowCopiedHint(false),
      COPIED_HINT_DURATION_MS
    );
  }, [actionMenu]);

  const handleDeleteMessage = useCallback(() => {
    const message = actionMenu?.message;
    setActionMenu(null);
    if (!message) return;
    Alert.alert(
      t("ai.messageActions.deleteConfirmTitle"),
      t("ai.messageActions.deleteConfirmMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            void deleteMessage(message).catch(() =>
              showToast(t("ai.messageActions.deleteFailedToast"), "error")
            );
          },
        },
      ]
    );
  }, [actionMenu, deleteMessage, showToast, t]);

  return {
    actionMenu,
    showCopiedHint,
    handleMessageLongPress,
    handleCopyMessage,
    handleDeleteMessage,
    dismissActionMenu,
  };
}
