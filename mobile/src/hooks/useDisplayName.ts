import { useAuthStore } from "@/stores/auth";
import { useOnboardingStore } from "@/stores/onboarding";
import { getDisplayName } from "@/lib/getDisplayName";

export function useDisplayName(): string {
  const user = useAuthStore((s) => s.user);
  const isGuest = useAuthStore((s) => s.isGuest);
  const guestName = useOnboardingStore((s) => s.guestName);
  return isGuest ? guestName : getDisplayName(user);
}
