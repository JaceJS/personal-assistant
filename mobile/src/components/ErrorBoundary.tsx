import React from "react";
import { Pressable, Text, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { logger } from "@/lib/logger";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("ErrorBoundary caught", error, {
      componentStack: info.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-background px-6">
          <View className="w-full items-center rounded-2xl bg-card p-8">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-danger/10">
              <AlertTriangle size={26} color="#f43f5e" />
            </View>
            <Text className="font-bold text-base text-ink">Terjadi Kesalahan</Text>
            <Text className="mt-2 text-center text-sm text-muted">
              {this.state.message || "Sesuatu tidak berjalan dengan baik."}
            </Text>
            <Pressable
              onPress={this.handleRetry}
              className="mt-6 w-full items-center rounded-xl bg-accent py-3 active:opacity-70"
            >
              <Text className="font-semibold text-sm text-white">Coba Lagi</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
