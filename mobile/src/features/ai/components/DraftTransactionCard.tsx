import { Check } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { DraftMessage } from "@/features/finance/utils/chatMessageUtils";
import { formatRupiah } from "@/lib/utils";
import { colors, radius, spacing, textStyles } from "@/theme";

interface Props {
  message: DraftMessage;
  onSave: (message: DraftMessage) => void;
  onEdit: (message: DraftMessage) => void;
  onCancel: (message: DraftMessage) => void;
}

export function DraftTransactionCard({ message, onSave, onEdit, onCancel }: Props) {
  const { draft, state } = message;
  const isExpense = draft.amount < 0;
  const isCancelled = state === "cancelled";

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, isCancelled && styles.cardCancelled]}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.headline} numberOfLines={1}>
              {draft.category_name ?? "Transaksi"}
            </Text>
            {draft.merchant ? <Text style={styles.subline}>{draft.merchant}</Text> : null}
            {draft.note ? (
              <Text style={styles.note} numberOfLines={2}>
                {draft.note}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.amount, isExpense ? styles.amountExpense : styles.amountIncome]}>
            {isExpense ? "-" : "+"}
            {formatRupiah(Math.abs(draft.amount))}
          </Text>
        </View>

        {state === "pending" && (
          <View style={styles.actions}>
            <Pressable
              onPress={() => onSave(message)}
              style={({ pressed }) => pressed && styles.pressed}
              hitSlop={4}
            >
              <View style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryLabel}>Simpan</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => onEdit(message)}
              style={({ pressed }) => pressed && styles.pressed}
              hitSlop={4}
            >
              <View style={[styles.btn, styles.btnGhost]}>
                <Text style={styles.btnGhostLabel}>Edit</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => onCancel(message)}
              style={({ pressed }) => pressed && styles.pressed}
              hitSlop={4}
            >
              <View style={[styles.btn, styles.btnGhost]}>
                <Text style={styles.btnDangerLabel}>Batal</Text>
              </View>
            </Pressable>
          </View>
        )}

        {state === "saving" && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.accent.primary} />
          </View>
        )}

        {state === "saved" && (
          <View style={styles.statusRow}>
            <Check size={14} color={colors.success.text} strokeWidth={2.5} />
            <Text style={styles.savedLabel}>Tersimpan</Text>
          </View>
        )}

        {isCancelled && (
          <View style={styles.statusRow}>
            <Text style={styles.cancelledLabel}>Dibatalkan</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "flex-start",
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accent.border,
    padding: spacing.md,
    minWidth: "70%",
    maxWidth: "88%",
    gap: spacing.md,
  },
  cardCancelled: {
    borderColor: colors.border.default,
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  headline: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  subline: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.secondary,
  },
  note: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
  amount: {
    ...StyleSheet.flatten(textStyles.h3),
  },
  amountExpense: {
    color: colors.danger.text,
  },
  amountIncome: {
    color: colors.success.text,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  btn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: colors.accent.primary,
  },
  btnPrimaryLabel: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.primary,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.elevated,
  },
  btnGhostLabel: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.text.secondary,
  },
  btnDangerLabel: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.danger.text,
  },
  pressed: {
    opacity: 0.7,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  savedLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.success.text,
  },
  cancelledLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
  },
});
