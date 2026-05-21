import React from "react";
import { View } from "react-native";
import type { ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

function Card({ children, className = "", ...props }: CardProps) {
  return (
    <View className={`rounded-2xl bg-card p-4 ${className}`} {...props}>
      {children}
    </View>
  );
}

export default React.memo(Card);
