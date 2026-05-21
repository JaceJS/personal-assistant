import React from "react";
import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import Button from "@/components/ui/Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View className="mt-16 items-center px-6">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-card">
        <Icon size={26} color="#94a3b8" />
      </View>
      <Text className="font-semibold text-base text-ink">{title}</Text>
      {subtitle ? <Text className="mt-1 text-center text-sm text-muted">{subtitle}</Text> : null}
      {action ? (
        <View className="mt-5">
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

export default React.memo(EmptyState);
