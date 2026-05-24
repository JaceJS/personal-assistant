import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  edges?: Edge[];
  contentStyle?: object;
}

export function Screen({
  children,
  scrollable = false,
  edges = ['top', 'left', 'right'],
  contentStyle,
}: ScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView style={styles.root} edges={edges}>
        <ScrollView
          style={styles.root}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <View style={[styles.root, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
