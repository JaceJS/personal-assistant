import { useQuery } from '@tanstack/react-query';
import { fetchDailyInsight } from '@/features/ai/api/insight';
import { useAuthStore } from '@/stores/auth';

const AI_INSIGHT_STALE_TIME = 1000 * 60 * 60; // 1 hour

export function useAIInsight() {
  const { initialized, isGuest } = useAuthStore();
  // Guard: don't fetch before auth resolves (cold-start race) or in guest mode.
  const enabled = initialized && !isGuest;

  return useQuery({
    queryKey: ['ai', 'daily-insight'],
    queryFn: fetchDailyInsight,
    staleTime: AI_INSIGHT_STALE_TIME,
    enabled,
  });
}
