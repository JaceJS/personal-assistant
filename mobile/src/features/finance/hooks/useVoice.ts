import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { extractVoice, getVoiceStatus, uploadAudio } from "@/features/finance/api/voice";
import type { VoiceStatusResponse } from "@/features/finance/api/voice";
import { updateTransaction } from "@/features/finance/api/transactions";

const VOICE_QUERY_KEY = "voice";
const TRANSACTIONS_QUERY_KEY = "transactions";
const ACCOUNTS_QUERY_KEY = "accounts";

export function useUploadAudio() {
  return useMutation({
    mutationFn: ({ audioUri, accountId }: { audioUri: string; accountId: string }) =>
      uploadAudio(audioUri, accountId),
    retry: false,
  });
}

export function useVoiceStatus(voiceLogId: string | null) {
  return useQuery({
    queryKey: [VOICE_QUERY_KEY, voiceLogId],
    queryFn: () => getVoiceStatus(voiceLogId as string),
    enabled: voiceLogId !== null,
    refetchInterval: (query) => {
      const data = query.state.data as VoiceStatusResponse | undefined;
      const status = data?.status;
      if (status === "completed" || status === "failed" || status === "transcribed") return false;
      return 1500;
    },
  });
}

export function useExtractVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ voiceLogId, transcript }: { voiceLogId: string; transcript: string }) =>
      extractVoice(voiceLogId, transcript),
    retry: false,
    onSuccess: (_data, { voiceLogId }) => {
      void queryClient.invalidateQueries({ queryKey: [VOICE_QUERY_KEY, voiceLogId] });
    },
  });
}

interface ConfirmInput {
  transactionId: string;
  amount: number;
  accountId: string | null;
  categoryId: string | null;
  merchant: string | null;
  note: string | null;
}

export function useConfirmVoiceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, amount, accountId, categoryId, merchant, note }: ConfirmInput) =>
      updateTransaction(transactionId, {
        status: "confirmed",
        amount,
        account_id: accountId,
        category_id: categoryId,
        merchant,
        note,
      }),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ACCOUNTS_QUERY_KEY] });
    },
  });
}
