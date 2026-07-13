import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

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
import { TAB_BAR_CLEARANCE } from "@/components/ui/FloatingTabBar";

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
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
      showToast(t("settings.profile.nameEmptyToast"), "error");
      return;
    }
    updateProfile.mutate(
      { name: trimmedName, avatarUri: pickedAvatarUri },
      {
        onSuccess: () => {
          showToast(t("settings.profile.savedToast"), "success");
          router.back();
        },
        onError: () => showToast(t("settings.profile.saveError"), "error"),
      }
    );
  }, [name, pickedAvatarUri, updateProfile, showToast, router, t]);

  const initial = name[0]?.toUpperCase() ?? "U";

  return (
    <Screen>
      <Header title={t("settings.profile.headerTitle")} onBack={() => router.back()} />

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
          <Text style={styles.changePhotoLabel}>{t("settings.profile.changePhoto")}</Text>
        </View>

        <View style={styles.fields}>
          <Input
            label={t("settings.profile.nameLabel")}
            value={name}
            onChangeText={setName}
            placeholder={t("settings.profile.namePlaceholder")}
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={80}
          />
          <Input
            label={t("settings.profile.emailLabel")}
            value={user?.email ?? ""}
            editable={false}
            selectTextOnFocus={false}
            style={styles.readOnly}
          />
          <Text style={styles.hint}>{t("settings.profile.emailHint")}</Text>
        </View>

        <Button
          label={t("common.save")}
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
    paddingBottom: TAB_BAR_CLEARANCE,
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
