import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { uploadAvatar } from "@/features/settings/api/avatar";

interface UpdateProfileInput {
  name: string;
  avatarUri: string | null;
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({ name, avatarUri }: UpdateProfileInput) => {
      const avatarUrl = avatarUri ? (await uploadAvatar(avatarUri)).url : null;

      const { error } = await supabase.auth.updateUser({
        data: { full_name: name, ...(avatarUrl && { avatar_url: avatarUrl }) },
      });
      if (error) throw error;
    },
  });
}
