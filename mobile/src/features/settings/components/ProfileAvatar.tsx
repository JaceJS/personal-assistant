import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { colors, radius, textStyles } from "@/theme";

interface ProfileAvatarProps {
  uri: string | null;
  initial: string;
  size?: number;
  onEdit?: () => void;
}

export default function ProfileAvatar({ uri, initial, size = 88, onEdit }: ProfileAvatarProps) {
  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: radius.full },
        ]}
      >
        {uri ? (
          <Image
            testID="profile-avatar-image"
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: radius.full }}
          />
        ) : (
          <Text style={styles.initialText}>{initial}</Text>
        )}
      </View>
      {onEdit && (
        <Pressable
          testID="profile-avatar-edit"
          onPress={onEdit}
          style={styles.editBadge}
          hitSlop={8}
        >
          <Pencil size={12} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  avatar: {
    backgroundColor: colors.accent.subtle,
    borderWidth: 1.5,
    borderColor: colors.accent.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initialText: {
    ...StyleSheet.flatten(textStyles.display),
    color: colors.accent.primary,
  },
  editBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
