import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateTransaction } from '@/features/finance/api/transactions';
import { useAuthStore } from '@/stores/auth';

export function useCancelAiDraft() {
  const queryClient = useQueryClient();
  const isGuest = useAuthStore((s) => s.isGuest);

  return useMutation({
    mutationFn: async (transactionId: string) => {
      // A guest draft only ever existed in local chat state — nothing was
      // persisted anywhere to cancel, so there's nothing to call.
      if (isGuest) return;
      await updateTransaction(transactionId, { status: 'cancelled' });
    },
    onSuccess: () => {
      if (isGuest) return;
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
