import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateTransaction } from '@/features/finance/api/transactions';

export function useCancelAiDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => updateTransaction(transactionId, { status: 'cancelled' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
