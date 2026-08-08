import { useOnboardingStore, type CoachmarkId } from "@/stores/onboarding";

const COACHMARK_SEQUENCE: CoachmarkId[] = [
  "homeAccount",
  "homeTransaction",
  "homeBudget",
  "bot",
  "goal",
];

export function useActiveCoachmark(): CoachmarkId | null {
  const dismissedCoachmarks = useOnboardingStore((s) => s.dismissedCoachmarks);
  return COACHMARK_SEQUENCE.find((id) => !dismissedCoachmarks[id]) ?? null;
}
