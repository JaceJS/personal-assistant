import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import { Header } from "@/components/layout/Header";
import { Screen } from "@/components/layout/Screen";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ProfileAvatar from "@/features/settings/components/ProfileAvatar";
import { useUpdateProfile } from "@/features/settings/hooks/useUpdateProfile";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { spacing, textStyles, colors } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const updateProfile = useUpdateProfile();

  const displayName = useDisplayName();
  const savedAvatarUrl = useAvatarUrl();
  const [name, setName] = useState(displayName);
  const [pickedAvatarUri, setPickedAvatarUri] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPickedAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast("Nama tidak boleh kosong", "error");
      return;
    }
    updateProfile.mutate(
      { name: trimmedName, avatarUri: pickedAvatarUri },
      {
        onSuccess: () => {
          showToast("Profil berhasil disimpan", "success");
          router.back();
        },
        onError: () => showToast("Gagal menyimpan profil, coba lagi ya", "error"),
      }
    );
  }, [name, pickedAvatarUri, updateProfile, showToast, router]);

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
          <Pressable onPress={() => void pickImage()}>
            <ProfileAvatar
              uri={pickedAvatarUri ?? savedAvatarUrl}
              initial={initial}
              size={96}
              onEdit={() => void pickImage()}
            />
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
            maxLength={80}
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

        <Button
          label="Simpan"
          onPress={handleSave}
          loading={updateProfile.isPending}
          fullWidth
        />
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
