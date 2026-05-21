import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { ExtractedTransaction } from "@/features/finance/api/voice";
import { formatRupiah } from "@/lib/utils";

interface Props {
  data: ExtractedTransaction | null;
  isVisible: boolean;
  isSaving: boolean;
  onSave: (data: ExtractedTransaction) => void;
  onDismiss: () => void;
}

export const ConfirmCard = React.memo(function ConfirmCard({
  data,
  isVisible,
  isSaving,
  onSave,
  onDismiss,
}: Props) {
  const translateY = useSharedValue(400);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    translateY.value = withSpring(isVisible ? 0 : 400, {
      damping: 20,
      stiffness: 200,
    });
  }, [isVisible, translateY]);

  if (!data) return null;

  const isExpense = data.amount < 0;

  return (
    <Animated.View
      style={containerStyle}
      className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-card pb-8"
    >
      <View className="mx-auto mb-4 mt-3 h-1 w-10 rounded-full bg-border" />

      <ScrollView className="px-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 font-medium text-sm text-muted">Jumlah</Text>
        <Text
          className={[
            "mb-6 font-bold text-4xl",
            isExpense ? "text-danger" : "text-success",
          ].join(" ")}
        >
          {formatRupiah(Math.abs(data.amount))}
        </Text>

        {data.merchant !== null && (
          <View className="mb-4">
            <Text className="mb-1 font-medium text-sm text-muted">Merchant</Text>
            <Text className="font-medium text-base text-ink">{data.merchant}</Text>
          </View>
        )}

        {data.category_name !== null && (
          <View className="mb-4">
            <Text className="mb-1 font-medium text-sm text-muted">Kategori</Text>
            <Text className="font-medium text-base text-ink">{data.category_name}</Text>
          </View>
        )}

        {data.note !== null && (
          <View className="mb-4">
            <Text className="mb-1 font-medium text-sm text-muted">Catatan</Text>
            <TextInput
              className="rounded-lg border border-border bg-surface px-4 py-3 font-sans text-ink"
              defaultValue={data.note}
              multiline
            />
          </View>
        )}

        <View className="mb-2 flex-row items-center gap-1">
          <View
            className={[
              "h-2 w-2 rounded-full",
              data.confidence >= 0.8 ? "bg-success" : "bg-warning",
            ].join(" ")}
          />
          <Text className="text-xs text-muted">
            Keyakinan AI: {Math.round(data.confidence * 100)}%
          </Text>
        </View>

        <View className="mt-4 gap-3 pb-4">
          <Pressable
            onPress={() => onSave(data)}
            disabled={isSaving}
            className="items-center rounded-2xl bg-accent py-4 active:opacity-80"
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-semibold text-base text-white">Simpan Transaksi</Text>
            )}
          </Pressable>

          <Pressable
            onPress={onDismiss}
            className="items-center rounded-2xl border border-border py-4 active:opacity-60"
          >
            <Text className="font-medium text-base text-muted">Batal</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Animated.View>
  );
});
