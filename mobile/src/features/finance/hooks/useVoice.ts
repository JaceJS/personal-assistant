import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getVoiceStatus, uploadAudio } from "@/features/finance/api/voice";
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
      if (data?.status === "completed" || data?.status === "failed") return false;
      return 1500;
    },
  });
}

export function useConfirmVoiceTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) =>
      updateTransaction(transactionId, { status: "confirmed" }),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [ACCOUNTS_QUERY_KEY] });
    },
  });
}
