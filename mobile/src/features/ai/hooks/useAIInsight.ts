import { useQuery } from '@tanstack/react-query';
import { fetchDailyInsight } from '@/features/ai/api/insight';

const AI_INSIGHT_STALE_TIME = 1000 * 60 * 60; // 1 hour

export function useAIInsight() {
  return useQuery({
    queryKey: ['ai', 'daily-insight'],
    queryFn: fetchDailyInsight,
    staleTime: AI_INSIGHT_STALE_TIME,
  });
}
