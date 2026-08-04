import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import type { ConfirmPayload } from '@/components/voice/ConfirmCard';
import { confirmAiDraft } from '@/features/ai/api/chat';
import { useFinanceRepository } from '@/features/finance/repository';
import { generateId } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';

export function useConfirmAiDraft() {
  const queryClient = useQueryClient();
  const isGuest = useAuthStore((s) => s.isGuest);
  const repo = useFinanceRepository();

  return useMutation({
    mutationFn: async ({
      transactionId,
      payload,
    }: {
      transactionId: string;
      payload: ConfirmPayload;
    }) => {
      // A guest draft was never persisted server-side (see guest_tools.py on
      // the backend) — confirming it means creating the transaction for the
      // first time in local storage, not PATCHing a row that doesn't exist.
      if (isGuest) {
        if (!payload.accountId) throw new Error('Account is required');
        await repo.createTransaction({
          id: generateId(),
          account_id: payload.accountId,
          category_id: payload.categoryId,
          amount: payload.amount,
          merchant: payload.merchant,
          note: payload.note,
          occurred_at: new Date().toISOString(),
        });
        return;
      }
      await confirmAiDraft(transactionId, {
        amount: payload.amount,
        account_id: payload.accountId,
        category_id: payload.categoryId,
        merchant: payload.merchant,
        note: payload.note,
      });
    },
    onSuccess: () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
