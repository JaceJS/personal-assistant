import { useCallback } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AlertTriangle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { useDeleteAccount } from "@/features/account/hooks/useDeleteAccount";
import { colors, radius, spacing, textStyles } from "@/theme";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthStore();
  const { showToast } = useToastStore();
  const { mutate: deleteAccount, isPending } = useDeleteAccount();

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Hapus Akun Permanen",
      "Aksi ini tidak dapat dibatalkan. Semua data akan hilang selamanya.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus Sekarang",
          style: "destructive",
          onPress: () =>
            deleteAccount(undefined, {
              onSuccess: () => {
                showToast("Akunmu sudah dihapus", "success");
                void signOut();
              },
              onError: () => showToast("Gagal menghapus akun, coba lagi ya", "error"),
            }),
        },
      ]
    );
  }, [deleteAccount, showToast, signOut]);

  return (
    <Screen>
      <Header title="Hapus Akun" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.warningCard}>
          <View style={styles.warningIconRow}>
            <AlertTriangle size={20} color={colors.danger.text} />
            <Text style={styles.warningTitle}>Data yang akan hilang</Text>
          </View>
          <View style={styles.list}>
            {[
              "Semua akun keuangan",
              "Seluruh riwayat transaksi",
              "Budget dan goal",
              "Percakapan dengan AI",
            ].map((item) => (
              <View key={item} style={styles.listRow}>
                <View style={styles.bullet} />
                <Text style={styles.listItem}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.warningNote}>
            Aksi ini permanen dan tidak bisa dibatalkan.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: spacing["2xl"] + insets.bottom }]}>
        <Button
          label={isPending ? "Menghapus..." : "Hapus Akun Permanen"}
          variant="danger"
          onPress={handleDelete}
          disabled={isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing["2xl"],
    paddingBottom: spacing["2xl"],
  },
  warningCard: {
    backgroundColor: colors.danger.bg,
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: `${colors.danger.text}33`,
    gap: 16,
  },
  warningIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningTitle: {
    ...StyleSheet.flatten(textStyles.h3),
    color: colors.danger.text,
  },
  list: {
    gap: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.danger.text,
    opacity: 0.6,
    flexShrink: 0,
  },
  listItem: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.secondary,
  },
  warningNote: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.danger.text,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    paddingTop: spacing.md,
  },
});
