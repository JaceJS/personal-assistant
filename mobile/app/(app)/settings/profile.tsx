import { useCallback, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Pencil } from "lucide-react-native";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { getDisplayName } from "@/lib/getDisplayName";
import { colors, radius, spacing, textStyles } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();

  const displayName = getDisplayName(user);
  const [name, setName] = useState(displayName);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(() => {
    showToast("Fitur edit profil segera hadir", "info");
  }, [showToast]);

  const initial = name[0]?.toUpperCase() ?? "U";

  return (
    <Screen>
      <Header title="Edit Profil" onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={() => void pickImage()} style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
            <View style={styles.editBadge}>
              <Pencil size={12} color="#fff" />
            </View>
          </Pressable>
          <Text style={styles.changePhotoLabel}>Ganti Foto</Text>
        </View>

        <View style={styles.fields}>
          <Input
            label="Nama"
            value={name}
            onChangeText={setName}
            placeholder="Masukkan nama"
            autoCapitalize="words"
            returnKeyType="done"
          />
          <Input
            label="Email"
            value={user?.email ?? ""}
            editable={false}
            selectTextOnFocus={false}
            style={styles.readOnly}
          />
          <Text style={styles.hint}>Email tidak dapat diubah</Text>
        </View>

        <Button label="Simpan" onPress={handleSave} fullWidth />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["2xl"],
    paddingBottom: 160,
    gap: spacing["2xl"],
  },

  avatarSection: {
    alignItems: "center",
    gap: spacing.sm,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.accent.subtle,
    borderWidth: 1.5,
    borderColor: colors.accent.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
  },
  avatarText: {
    ...StyleSheet.flatten(textStyles.display),
    color: colors.accent.primary,
  },
  editBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoLabel: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.accent.primary,
  },

  fields: {
    gap: spacing.lg,
  },
  readOnly: {
    color: colors.text.muted,
  },
  hint: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.muted,
    marginTop: -spacing.sm,
  },
});
