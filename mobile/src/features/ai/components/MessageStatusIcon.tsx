import { View } from "react-native";
import { AlertCircle, Check, Clock } from "lucide-react-native";

import { colors } from "@/theme";
import type { MessageSendStatus } from "@/features/finance/utils/chatMessageUtils";

const ICON_SIZE = 12;

export function MessageStatusIcon({ status }: { status: MessageSendStatus }) {
  if (status === "sending") {
    return (
      <View testID="status-icon-sending">
        <Clock size={ICON_SIZE} color={colors.text.muted} strokeWidth={2} />
      </View>
    );
  }
  if (status === "failed") {
    return (
      <View testID="status-icon-failed">
        <AlertCircle size={ICON_SIZE} color={colors.danger.text} strokeWidth={2} />
      </View>
    );
  }
  return (
    <View testID="status-icon-sent">
      <Check size={ICON_SIZE} color={colors.text.muted} strokeWidth={2} />
    </View>
  );
}
