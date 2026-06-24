import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import type { ConfirmPayload } from '@/components/voice/ConfirmCard';
import { confirmAiDraft } from '@/features/ai/api/chat';

export function useConfirmAiDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      transactionId,
      payload,
    }: {
      transactionId: string;
      payload: ConfirmPayload;
    }) =>
      confirmAiDraft(transactionId, {
        amount: payload.amount,
        account_id: payload.accountId,
        category_id: payload.categoryId,
        merchant: payload.merchant,
        note: payload.note,
      }),
    onSuccess: () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}
