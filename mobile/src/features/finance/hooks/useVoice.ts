import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { extractVoice, getVoiceStatus, uploadAudio } from "@/features/finance/api/voice";
import type { VoiceStatusResponse } from "@/features/finance/api/voice";

const VOICE_QUERY_KEY = "voice";

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
      if (status === "completed" || status === "failed") return false;
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

