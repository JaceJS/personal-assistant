import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { uploadAvatar } from "@/features/settings/api/avatar";
import { useAuthStore } from "@/stores/auth";

interface UpdateProfileInput {
  name: string;
  avatarUri: string | null;
}

export function useUpdateProfile() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async ({ name, avatarUri }: UpdateProfileInput) => {
      const avatarUrl = avatarUri ? (await uploadAvatar(avatarUri)).url : null;

      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: name, ...(avatarUrl && { avatar_url: avatarUrl }) },
      });
      if (error) throw error;
      return data.user;
    },
    // Apply the fresh user directly instead of waiting for the USER_UPDATED
    // auth event to round-trip back through onAuthStateChange.
    onSuccess: (user) => {
      const { session } = useAuthStore.getState();
      if (session) setSession({ ...session, user });
    },
  });
}
