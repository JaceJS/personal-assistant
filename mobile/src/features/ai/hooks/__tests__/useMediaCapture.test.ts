import { act, renderHook } from '@testing-library/react-native';
import type { TFunction } from 'i18next';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

jest.mock('expo-image-picker', () => ({ launchCameraAsync: jest.fn() }));

const mockStartRecording = jest.fn();
const mockStopRecording = jest.fn();
const mockCancelRecording = jest.fn();
const mockResetRecorder = jest.fn();
let mockRecorderState = {
  isRecording: false,
  isProcessing: false,
  durationMs: 0,
  errorMessage: null as string | null,
};
jest.mock('@/hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => ({
    isRecording: mockRecorderState.isRecording,
    isProcessing: mockRecorderState.isProcessing,
    durationMs: mockRecorderState.durationMs,
    errorMessage: mockRecorderState.errorMessage,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    cancelRecording: mockCancelRecording,
    reset: mockResetRecorder,
  }),
}));

const mockUploadAudioMutateAsync = jest.fn();
const mockExtractVoiceMutateAsync = jest.fn();
let mockVoiceStatusData: unknown = undefined;
const mockVoiceStatusRefetch = jest.fn();
jest.mock('@/features/finance/hooks/useVoice', () => ({
  useUploadAudio: () => ({ mutateAsync: mockUploadAudioMutateAsync, isPending: false }),
  useExtractVoice: () => ({ mutateAsync: mockExtractVoiceMutateAsync }),
  useVoiceStatus: () => ({ data: mockVoiceStatusData, refetch: mockVoiceStatusRefetch }),
}));

const mockUploadReceiptMutateAsync = jest.fn();
jest.mock('@/features/finance/hooks/useReceipt', () => ({
  useUploadReceipt: () => ({ mutateAsync: mockUploadReceiptMutateAsync, isPending: false }),
  useReceiptStatuses: () => [],
}));

jest.mock('@/features/finance/utils/persistRecordedAudio', () => ({
  persistRecordedAudio: (uri: string) => `persisted:${uri}`,
}));
jest.mock('@/features/finance/utils/persistPickedImage', () => ({
  persistPickedImage: (uri: string) => `persisted:${uri}`,
}));
jest.mock('@/features/finance/utils/persistToAppStorage', () => ({
  clearPersistedMedia: jest.fn(),
}));

let mockIdCounter = 0;
jest.mock('@/lib/utils', () => ({ generateId: () => `id-${++mockIdCounter}` }));

import * as ImagePicker from 'expo-image-picker';
import { useMediaCapture } from '@/features/ai/hooks/useMediaCapture';
import { createVoiceMessage, createReceiptMessage } from '@/features/finance/utils/chatMessageUtils';
import type { Message } from '@/features/finance/utils/chatMessageUtils';

const mockLaunchCameraAsync = ImagePicker.launchCameraAsync as jest.MockedFunction<
  typeof ImagePicker.launchCameraAsync
>;

const t = ((key: string) => key) as unknown as TFunction;

async function makeHook(overrides: Partial<{ messages: Message[]; showToast: jest.Mock }> = {}) {
  const showToast = overrides.showToast ?? jest.fn();
  const setMessages = jest.fn();
  const syncSessionId = jest.fn();
  const { result } = await renderHook(() =>
    useMediaCapture({
      messages: overrides.messages ?? [],
      setMessages,
      showToast,
      sessionId: 'session-1',
      syncSessionId,
      defaultAccountId: 'acc-1',
      t,
    })
  );
  return { result, setMessages, showToast, syncSessionId };
}

describe('useMediaCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdCounter = 0;
    mockVoiceStatusData = undefined;
    mockRecorderState = { isRecording: false, isProcessing: false, durationMs: 0, errorMessage: null };
  });

  describe('handleMicPressIn', () => {
    it('starts recording when idle and an account exists', async () => {
      const { result } = await makeHook();

      await act(async () => result.current.handleMicPressIn());

      expect(mockStartRecording).toHaveBeenCalled();
    });

    it('toasts instead of recording when there is no default account', async () => {
      const showToast = jest.fn();
      const setMessages = jest.fn();
      const { result } = await renderHook(() =>
        useMediaCapture({
          messages: [],
          setMessages,
          showToast,
          sessionId: undefined,
          syncSessionId: jest.fn(),
          defaultAccountId: undefined,
          t,
        })
      );

      await act(async () => result.current.handleMicPressIn());

      expect(mockStartRecording).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('transaction.noAccountsPrompt', 'error');
    });

    it('toasts instead of recording when mic is busy', async () => {
      mockRecorderState.isProcessing = true;
      const { result, showToast } = await makeHook();

      await act(async () => result.current.handleMicPressIn());

      expect(mockStartRecording).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('ai.toast.voiceStillProcessing', 'error');
    });
  });

  describe('handleMicPressOut', () => {
    it('is a no-op when not currently recording', async () => {
      const { result } = await makeHook();

      await act(async () => result.current.handleMicPressOut());

      expect(mockStopRecording).not.toHaveBeenCalled();
    });

    it('does nothing further when stopRecording yields no uri (e.g. too short)', async () => {
      mockRecorderState.isRecording = true;
      mockStopRecording.mockResolvedValueOnce(null);
      const { result } = await makeHook();

      await act(async () => result.current.handleMicPressOut());

      expect(mockUploadAudioMutateAsync).not.toHaveBeenCalled();
    });

    it('uploads the persisted recording once stopped', async () => {
      mockRecorderState.isRecording = true;
      mockStopRecording.mockResolvedValueOnce('file:///rec.m4a');
      mockUploadAudioMutateAsync.mockResolvedValueOnce({
        chat_session_id: 'session-1',
        voice_log_id: 'voice-1',
      });
      const { result, setMessages } = await makeHook();

      await act(async () => result.current.handleMicPressOut());

      expect(mockUploadAudioMutateAsync).toHaveBeenCalledWith({
        audioUri: 'persisted:file:///rec.m4a',
        accountId: 'acc-1',
        chatSessionId: 'session-1',
      });
      // one append of the placeholder, one to mark it sent
      expect(setMessages).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleCameraPress', () => {
    it('toasts instead of opening the camera when there is no default account', async () => {
      const showToast = jest.fn();
      const setMessages = jest.fn();
      const { result } = await renderHook(() =>
        useMediaCapture({
          messages: [],
          setMessages,
          showToast,
          sessionId: undefined,
          syncSessionId: jest.fn(),
          defaultAccountId: undefined,
          t,
        })
      );

      await act(async () => result.current.handleCameraPress());

      expect(mockLaunchCameraAsync).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith('ai.toast.createAccountForScan', 'error');
    });

    it('does nothing when the camera is cancelled', async () => {
      mockLaunchCameraAsync.mockResolvedValueOnce({ canceled: true, assets: null } as never);
      const { result } = await makeHook();

      await act(async () => result.current.handleCameraPress());

      expect(mockUploadReceiptMutateAsync).not.toHaveBeenCalled();
    });

    it('uploads the persisted photo once captured', async () => {
      mockLaunchCameraAsync.mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file:///photo.jpg' }],
      } as never);
      mockUploadReceiptMutateAsync.mockResolvedValueOnce({
        chat_session_id: 'session-1',
        receipt_log_id: 'receipt-1',
      });
      const { result } = await makeHook();

      await act(async () => result.current.handleCameraPress());

      expect(mockUploadReceiptMutateAsync).toHaveBeenCalledWith({
        imageUri: 'persisted:file:///photo.jpg',
        accountId: 'acc-1',
        chatSessionId: 'session-1',
      });
    });
  });

  describe('handleRetry', () => {
    it('re-uploads a failed voice message', async () => {
      mockUploadAudioMutateAsync.mockResolvedValueOnce({
        chat_session_id: 'session-1',
        voice_log_id: 'voice-2',
      });
      const failed = { ...createVoiceMessage('v1', 'file:///rec.m4a', 'acc-1'), status: 'failed' as const };
      const { result } = await makeHook();

      await act(async () => result.current.handleRetry(failed));

      expect(mockUploadAudioMutateAsync).toHaveBeenCalledWith({
        audioUri: 'file:///rec.m4a',
        accountId: 'acc-1',
        chatSessionId: 'session-1',
      });
    });

    it('re-uploads a failed receipt message', async () => {
      mockUploadReceiptMutateAsync.mockResolvedValueOnce({
        chat_session_id: 'session-1',
        receipt_log_id: 'receipt-2',
      });
      const failed = {
        ...createReceiptMessage('r1', 'file:///photo.jpg', 'acc-1'),
        status: 'failed' as const,
      };
      const { result } = await makeHook();

      await act(async () => result.current.handleRetry(failed));

      expect(mockUploadReceiptMutateAsync).toHaveBeenCalledWith({
        imageUri: 'file:///photo.jpg',
        accountId: 'acc-1',
        chatSessionId: 'session-1',
      });
    });

    it('is a no-op when the message has no local uri to retry from', async () => {
      const failed = { ...createVoiceMessage('v1'), status: 'failed' as const };
      const { result } = await makeHook();

      await act(async () => result.current.handleRetry(failed));

      expect(mockUploadAudioMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('transcript handling', () => {
    it('exposes null transcript when there is no voice status data', async () => {
      const { result } = await makeHook();
      expect(result.current.transcript).toBeNull();
    });

    it('handleTranscriptProcess is a no-op without an active voice log', async () => {
      const { result } = await makeHook();

      await act(async () => result.current.handleTranscriptProcess('halo'));

      expect(mockExtractVoiceMutateAsync).not.toHaveBeenCalled();
    });
  });
});
