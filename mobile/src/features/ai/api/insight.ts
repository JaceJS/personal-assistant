import { apiFetch } from '@/lib/api/client';
import type { ApiResponse } from '@/features/finance/types';

export interface DailyInsight {
  insight: string;
  generated_at: string;
  is_cached: boolean;
}

export async function fetchDailyInsight(): Promise<DailyInsight> {
  return apiFetch<ApiResponse<DailyInsight>>('/api/v1/ai/insight').then((r) => r.data);
}
