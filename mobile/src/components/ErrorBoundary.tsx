import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle } from "lucide-react-native";

import { logger } from "@/lib/logger";
import { colors, radius, spacing } from "@/theme";

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
        <View style={styles.root}>
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <AlertTriangle size={26} color={colors.danger.text} />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.message || "An unexpected error occurred."}
            </Text>
            <Pressable
              onPress={this.handleRetry}
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.retryLabel}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.canvas,
    paddingHorizontal: spacing['2xl'],
  },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    padding: 32,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.danger.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  message: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: spacing['2xl'],
    width: '100%',
    alignItems: 'center',
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  retryLabel: { fontSize: 14, fontWeight: '600', color: colors.bg.canvas },
});
