import React from "react";
import { Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-muted">{label}</Text> : null}
      <TextInput
        className={`rounded-xl border bg-card px-4 py-3 text-base text-ink ${error ? "border-danger" : "border-border"}`}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}

export default React.memo(Input);
