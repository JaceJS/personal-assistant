import { useAuthStore } from "@/stores/auth";
import { getAvatarUrl } from "@/lib/getAvatarUrl";

export function useAvatarUrl(): string | null {
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  return isGuest ? null : getAvatarUrl(user);
}
