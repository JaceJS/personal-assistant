import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteTransaction } from '@/features/finance/api/transactions';

export function useCancelAiDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => deleteTransaction(transactionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
